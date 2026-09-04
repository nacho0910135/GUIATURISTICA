import { createClient } from 'jsr:@supabase/supabase-js@2';

const offers = {
  universal_monthly: { plan: 'no_ads', priceEnv: 'STRIPE_PRICE_UNIVERSAL_MONTHLY', mode: 'subscription' },
  universal_annual: { plan: 'no_ads', priceEnv: 'STRIPE_PRICE_UNIVERSAL_ANNUAL', mode: 'subscription' },
  visitor_pass_30d: { plan: 'no_ads', priceEnv: 'STRIPE_PRICE_VISITOR_PASS_30D', mode: 'payment' },
  business_monthly: { plan: 'business', priceEnv: 'STRIPE_PRICE_BUSINESS_MONTHLY', mode: 'subscription' },
  featured_30d: { campaignType: 'featured', priceEnv: 'STRIPE_PRICE_COMMERCE_FEATURED_30D', mode: 'payment' },
  banner_30d: { campaignType: 'banner', priceEnv: 'STRIPE_PRICE_COMMERCE_BANNER_30D', mode: 'payment' },
  featured_monthly: { campaignType: 'featured', priceEnv: 'STRIPE_PRICE_COMMERCE_FEATURED_MONTHLY', mode: 'subscription' },
  banner_monthly: { campaignType: 'banner', priceEnv: 'STRIPE_PRICE_COMMERCE_BANNER_MONTHLY', mode: 'subscription' },
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
  const targetUrl = typeof body.targetUrl === 'string' ? body.targetUrl.trim() : undefined;
  const returnUrl = typeof body.returnUrl === 'string' ? body.returnUrl : undefined;
  if (!offerId || !offers[offerId] || !returnUrl || !isAllowedReturnUrl(returnUrl)) return json({ error: 'invalid_checkout_request' }, 400);
  const offer = offers[offerId];
  const isCampaign = 'campaignType' in offer;
  if (isCampaign ? !serviceId : offer.plan === 'no_ads' ? serviceId : !serviceId) return json({ error: 'invalid_business_selection' }, 400);
  if (isCampaign && offer.campaignType === 'banner' && !isSafeTargetUrl(targetUrl)) return json({ error: 'invalid_banner_url' }, 400);

  if (serviceId) {
    const { data: business, error } = await supabase.from('commercial_services').select('id').eq('id', serviceId).eq('owner_id', user.id).eq('moderation_status', 'approved').maybeSingle();
    if (error || !business) return json({ error: 'business_not_owned' }, 403);
  }

  const priceId = Deno.env.get(offer.priceEnv);
  if (!priceId) return json({ error: 'plan_not_configured' }, 503);
  const successUrl = withCheckoutStatus(returnUrl, 'success');
  const cancelUrl = withCheckoutStatus(returnUrl, 'cancel');
  const form = new URLSearchParams({
    mode: offer.mode,
    success_url: successUrl,
    cancel_url: cancelUrl,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    client_reference_id: user.id,
    'metadata[user_id]': user.id,
    'metadata[offer_id]': offerId,
  });
  if (isCampaign) {
    form.set('metadata[campaign_type]', offer.campaignType);
    if (targetUrl) form.set('metadata[target_url]', targetUrl);
    if (offer.mode === 'subscription') {
      form.set('subscription_data[metadata][user_id]', user.id);
      form.set('subscription_data[metadata][service_id]', serviceId!);
      form.set('subscription_data[metadata][offer_id]', offerId);
      form.set('subscription_data[metadata][campaign_type]', offer.campaignType);
      if (targetUrl) form.set('subscription_data[metadata][target_url]', targetUrl);
    }
  } else {
    form.set('metadata[plan]', offer.plan);
  }
  if (!isCampaign && offer.mode === 'subscription') {
    form.set('subscription_data[metadata][user_id]', user.id);
    form.set('subscription_data[metadata][plan]', offer.plan);
    form.set('subscription_data[metadata][offer_id]', offerId);
  }
  if (user.email) form.set('customer_email', user.email);
  if (serviceId) {
    form.set('metadata[service_id]', serviceId);
    if (offer.mode === 'subscription') form.set('subscription_data[metadata][service_id]', serviceId);
  }
  const stripe = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2026-02-25.clover' }, body: form });
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

function isSafeTargetUrl(value?: string) {
  if (!value || value.length > 500) return false;
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; } catch { return false; }
}

function withCheckoutStatus(value: string, status: 'success' | 'cancel') {
  const url = new URL(value);
  url.searchParams.set('checkout', status);
  return url.toString();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
