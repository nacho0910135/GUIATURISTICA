import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [tabs, billing, screen, checkout, webhook, migration] = await Promise.all([
  readFile(new URL('../src/app/(tabs)/_layout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/billing.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/subscriptions.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/create-checkout-session/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/stripe-webhook/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260830110914_add_subscription_offer_pricing.sql', import.meta.url), 'utf8'),
]);

for (const tab of ['explore', 'my-trip', 'commerce', 'friends']) assert.match(tabs, new RegExp(`name="${tab}"`));
assert.match(tabs, /name="fauna" options=\{\{ href: null \}\}/);
assert.match(tabs, /name="profile" options=\{\{ href: null \}\}/);
assert.match(billing, /WebBrowser\.openAuthSessionAsync/);
assert.match(billing, /functions\.invoke\('create-checkout-session'/);
assert.match(billing, /getMySubscriptions/);
for (const offer of ['universal_monthly', 'universal_annual', 'visitor_pass_30d', 'business_monthly']) {
  assert.match(billing, new RegExp(offer));
  assert.match(checkout, new RegExp(offer));
  assert.match(webhook, new RegExp(offer));
}
for (const price of ['US$2 / mes', 'US$20 / año', 'US$5 / 30 días', 'US$9,99 / mes']) assert.match(billing, new RegExp(price.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(screen, /billingOffers/);
assert.match(screen, /visitorType === 'foreigner'/);
assert.match(screen, /MEJOR VALOR/);
assert.match(checkout, /supabase\.auth\.getUser/);
assert.match(checkout, /eq\('owner_id', user\.id\)/);
assert.match(checkout, /STRIPE_SECRET_KEY/);
assert.match(checkout, /mode: offer\.mode/);
assert.match(checkout, /offer\.mode === 'subscription'/);
assert.match(webhook, /STRIPE_WEBHOOK_SECRET/);
assert.match(webhook, /provider_subscription_id/);
assert.match(webhook, /validSignature/);
assert.match(webhook, /is_sponsored: Boolean\(count\)/);
assert.match(webhook, /unexpected_price/);
assert.match(webhook, /handleOneTimePass/);
assert.match(webhook, /30 \* 24 \* 60 \* 60 \* 1000/);
assert.match(migration, /rename column price_usd to price_amount/);
assert.match(migration, /price_currency/);
assert.match(migration, /offer_id/);
assert.match(migration, /legacy_no_ads/);
console.log('Universal subscriptions, one-time visitor pass, business billing, and trial access are wired.');
