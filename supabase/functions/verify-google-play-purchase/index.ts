import { createClient } from 'jsr:@supabase/supabase-js@2';

const PACKAGE_NAME = 'com.descubriendo.cr';
const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const offers = {
  universal_monthly: { plan: 'no_ads', business: false, fallbackAmount: 2 },
  universal_annual: { plan: 'no_ads', business: false, fallbackAmount: 20 },
  business_monthly: { plan: 'business', business: true, fallbackAmount: 9.99 },
} as const;
const entitledStates = new Set(['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED']);
const corsHeaders = { 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

type ServiceAccount = { client_email: string; private_key: string };
type GoogleSubscription = {
  acknowledgementState?: string;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
  latestOrderId?: string;
  lineItems?: Array<{
    expiryTime?: string;
    productId?: string;
    autoRenewingPlan?: { recurringPrice?: { currencyCode?: string; nanos?: number; units?: string } };
  }>;
  subscriptionState?: string;
  testPurchase?: Record<string, never>;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const serviceAccountJson = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
  if (!supabaseUrl || !anonKey || !serviceKey || !serviceAccountJson) return json({ error: 'google_play_not_configured' }, 503);

  const authorization = request.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: 'unauthorized' }, 401);

  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === 'string' ? body.productId : '';
  const purchaseToken = typeof body.purchaseToken === 'string' ? body.purchaseToken : '';
  const serviceId = typeof body.serviceId === 'string' ? body.serviceId : undefined;
  const offer = offers[productId as keyof typeof offers];
  if (!offer || !purchaseToken || purchaseToken.length > 4096) return json({ error: 'invalid_purchase' }, 400);
  if (offer.business !== Boolean(serviceId)) return json({ error: 'invalid_business_selection' }, 400);

  if (serviceId) {
    const { data: business } = await userClient.from('commercial_services').select('id').eq('id', serviceId).eq('owner_id', user.id).eq('moderation_status', 'approved').maybeSingle();
    if (!business) return json({ error: 'business_not_owned' }, 403);
  }

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;
    if (!serviceAccount.client_email || !serviceAccount.private_key) throw new Error('invalid service account');
  } catch {
    return json({ error: 'google_play_not_configured' }, 503);
  }

  const accessToken = await getGoogleAccessToken(serviceAccount).catch(() => undefined);
  if (!accessToken) return json({ error: 'google_play_auth_failed' }, 502);
  const lookup = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!lookup.ok) return json({ error: lookup.status === 404 ? 'purchase_not_found' : 'google_play_lookup_failed' }, 502);
  const purchase = await lookup.json() as GoogleSubscription;
  const lineItem = purchase.lineItems?.find((item) => item.productId === productId);
  const expiresAt = lineItem?.expiryTime;
  if (!lineItem || !expiresAt || new Date(expiresAt).getTime() <= Date.now() || !purchase.subscriptionState || !entitledStates.has(purchase.subscriptionState)) {
    return json({ error: 'purchase_not_entitled' }, 409);
  }

  const expectedAccountId = await sha256(user.id);
  if (purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId !== expectedAccountId) return json({ error: 'purchase_account_mismatch' }, 403);

  const money = lineItem.autoRenewingPlan?.recurringPrice;
  const priceAmount = money ? Number(money.units ?? 0) + Number(money.nanos ?? 0) / 1_000_000_000 : offer.fallbackAmount;
  const priceCurrency = money?.currencyCode?.toUpperCase() || 'USD';
  const providerId = `google_play:${await sha256(purchaseToken)}`;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const subscription = {
    user_id: user.id,
    service_id: serviceId ?? null,
    plan: offer.plan,
    offer_id: productId,
    status: 'active',
    price_amount: priceAmount,
    price_currency: priceCurrency,
    provider: 'google_play',
    provider_subscription_id: providerId,
    current_period_end: expiresAt,
    updated_at: new Date().toISOString(),
  };
  let existingQuery = admin.from('subscriptions').select('id').eq('user_id', user.id).eq('offer_id', productId).eq('provider', 'google_play');
  existingQuery = serviceId ? existingQuery.eq('service_id', serviceId) : existingQuery.is('service_id', null);
  const { data: existing, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) return json({ error: 'subscription_lookup_failed' }, 500);
  const { error: writeError } = existing
    ? await admin.from('subscriptions').update(subscription).eq('id', existing.id)
    : await admin.from('subscriptions').insert(subscription);
  if (writeError) return json({ error: 'subscription_write_failed' }, 500);

  return json({ verified: true, expiresAt, testPurchase: Boolean(purchase.testPurchase), orderId: purchase.latestOrderId ?? null });
});

async function getGoogleAccessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = base64Url(new TextEncoder().encode(JSON.stringify({ iss: account.client_email, scope: ANDROID_PUBLISHER_SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })));
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey('pkcs8', pemBytes(account.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${base64Url(new Uint8Array(signature))}` }),
  });
  if (!response.ok) throw new Error('google oauth failed');
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error('missing access token');
  return payload.access_token;
}

function pemBytes(pem: string) {
  const raw = atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ''));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
