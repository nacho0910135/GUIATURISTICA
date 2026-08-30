import { createClient } from 'jsr:@supabase/supabase-js@2';

const offers = {
  travel_pass_national_monthly: { plan: 'no_ads', priceEnv: 'STRIPE_PRICE_TRAVEL_PASS_NATIONAL_MONTHLY' },
  travel_pass_national_annual: { plan: 'no_ads', priceEnv: 'STRIPE_PRICE_TRAVEL_PASS_NATIONAL_ANNUAL' },
  travel_pass_foreign_30d: { plan: 'no_ads', priceEnv: 'STRIPE_PRICE_TRAVEL_PASS_FOREIGN_30D' },
  business_pro: { plan: 'business', priceEnv: 'STRIPE_PRICE_BUSINESS_PRO' },
  business_growth: { plan: 'sponsored', priceEnv: 'STRIPE_PRICE_GROWTH' },
} as const;

const corsHeaders = { 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!supabaseUrl || !anonKey || !stripeKey) return json({ error: 'billing_not_configured' }, 503);

  const authorization = request.headers.get('Authorization') ?? '';
  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'unauthorized' }, 401);

  const body = await request.json().catch(() => ({}));
  const offerId = body.offerId as keyof typeof offers | undefined;
  const serviceId = typeof body.serviceId === 'string' ? body.serviceId : undefined;
  const returnUrl = typeof body.returnUrl === 'string' ? body.returnUrl : undefined;
  if (!offerId || !offers[offerId] || !returnUrl || !isAllowedReturnUrl(returnUrl)) return json({ error: 'invalid_checkout_request' }, 400);
  const offer = offers[offerId];
  if (offer.plan === 'no_ads' ? serviceId : !serviceId) return json({ error: 'invalid_business_selection' }, 400);

  if (serviceId) {
    const { data: business, error } = await supabase.from('commercial_services').select('id').eq('id', serviceId).eq('owner_id', user.id).maybeSingle();
    if (error || !business) return json({ error: 'business_not_owned' }, 403);
  }

  const priceId = Deno.env.get(offer.priceEnv);
  if (!priceId) return json({ error: 'plan_not_configured' }, 503);
  const successUrl = withCheckoutStatus(returnUrl, 'success');
  const cancelUrl = withCheckoutStatus(returnUrl, 'cancel');
  const form = new URLSearchParams({
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    client_reference_id: user.id,
    'metadata[user_id]': user.id,
    'metadata[plan]': offer.plan,
    'metadata[offer_id]': offerId,
    'subscription_data[metadata][user_id]': user.id,
    'subscription_data[metadata][plan]': offer.plan,
    'subscription_data[metadata][offer_id]': offerId,
  });
  if (user.email) form.set('customer_email', user.email);
  if (serviceId) {
    form.set('metadata[service_id]', serviceId);
    form.set('subscription_data[metadata][service_id]', serviceId);
  }
  const stripe = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  const result = await stripe.json();
  if (!stripe.ok || !result.url) return json({ error: 'checkout_creation_failed' }, 502);
  return json({ url: result.url });
});

function isAllowedReturnUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'exp:' || url.protocol === 'descubriendocr:';
  } catch { return false; }
}

function withCheckoutStatus(value: string, status: 'success' | 'cancel') {
  const url = new URL(value);
  url.searchParams.set('checkout', status);
  return url.toString();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
