import { createClient } from 'jsr:@supabase/supabase-js@2';

type StripeSubscription = {
  id: string;
  status: string;
  current_period_end?: number;
  metadata?: Record<string, string | undefined>;
  items?: { data?: { price?: { unit_amount?: number | null; currency?: string } }[] };
};

const offers = {
  travel_pass_national_monthly: { plan: 'no_ads', amount: 1900, currency: 'crc' },
  travel_pass_national_annual: { plan: 'no_ads', amount: 9900, currency: 'crc' },
  travel_pass_foreign_30d: { plan: 'no_ads', amount: 5.99, currency: 'usd' },
  business_pro: { plan: 'business', amount: 4900, currency: 'crc' },
  business_growth: { plan: 'sponsored', amount: 24.99, currency: 'usd' },
} as const;

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('method_not_allowed', { status: 405 });
  const signingSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!signingSecret || !serviceKey || !supabaseUrl) return new Response('billing_not_configured', { status: 503 });

  const payload = await request.text();
  if (!await validSignature(payload, request.headers.get('stripe-signature'), signingSecret)) return new Response('invalid_signature', { status: 400 });
  const event = JSON.parse(payload) as { type?: string; data?: { object?: StripeSubscription | { subscription?: string } } };
  if (!['checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type ?? '')) return new Response('ignored', { status: 200 });
  const object = event.data?.object;
  const subscriptionId = event.type === 'checkout.session.completed' ? (object as { subscription?: string } | undefined)?.subscription : (object as StripeSubscription | undefined)?.id;
  if (!subscriptionId) return new Response('ignored', { status: 200 });

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return new Response('billing_not_configured', { status: 503 });
  const stripe = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, { headers: { Authorization: `Bearer ${stripeKey}` } });
  if (!stripe.ok) return new Response('subscription_lookup_failed', { status: 502 });
  const subscription = await stripe.json() as StripeSubscription;
  const userId = subscription.metadata?.user_id;
  const plan = subscription.metadata?.plan;
  const offerId = subscription.metadata?.offer_id;
  if (!userId || !isPlan(plan) || !isOffer(offerId) || plan !== offers[offerId].plan) return new Response('ignored', { status: 200 });

  const amount = subscription.items?.data?.[0]?.price?.unit_amount;
  const currency = subscription.items?.data?.[0]?.price?.currency?.toLowerCase();
  const offer = offers[offerId];
  if (amount == null || currency !== offer.currency || amount !== offer.amount * 100) return new Response('unexpected_price', { status: 400 });
  const serviceId = subscription.metadata?.service_id || null;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    service_id: serviceId,
    plan,
    offer_id: offerId,
    status: databaseStatus(subscription.status),
    price_amount: amount / 100,
    price_currency: currency.toUpperCase(),
    provider: 'stripe',
    provider_subscription_id: subscription.id,
    current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'provider_subscription_id' });
  if (error) return new Response('subscription_write_failed', { status: 500 });
  if (serviceId && plan === 'sponsored') {
    const { count, error: countError } = await supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('service_id', serviceId).eq('plan', 'sponsored').eq('status', 'active');
    if (countError) return new Response('sponsorship_lookup_failed', { status: 500 });
    const { error: sponsorshipError } = await supabase.from('commercial_services').update({ is_sponsored: Boolean(count) }).eq('id', serviceId).eq('owner_id', userId);
    if (sponsorshipError) return new Response('sponsorship_write_failed', { status: 500 });
  }
  return new Response('ok', { status: 200 });
});

function isPlan(value: unknown): value is 'no_ads' | 'business' | 'sponsored' {
  return value === 'no_ads' || value === 'business' || value === 'sponsored';
}

function isOffer(value: unknown): value is keyof typeof offers {
  return typeof value === 'string' && value in offers;
}

function databaseStatus(status: string): 'pending' | 'active' | 'past_due' | 'canceled' | 'expired' {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  if (status === 'canceled') return 'canceled';
  if (status === 'incomplete_expired') return 'expired';
  return 'pending';
}

async function validSignature(payload: string, header: string | null, secret: string) {
  const timestamp = header?.match(/(?:^|,)t=(\d+)/)?.[1];
  const signature = header?.match(/(?:^|,)v1=([^,]+)/)?.[1];
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  const expected = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (expected.length !== signature.length) return false;
  return expected.split('').reduce((different, character, index) => different | (character.charCodeAt(0) ^ signature.charCodeAt(index)), 0) === 0;
}
