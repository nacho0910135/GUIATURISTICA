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
for (const offer of ['travel_pass_national_monthly', 'travel_pass_national_annual', 'travel_pass_foreign_30d', 'business_pro', 'business_growth']) {
  assert.match(billing, new RegExp(offer));
  assert.match(checkout, new RegExp(offer));
  assert.match(webhook, new RegExp(offer));
}
for (const price of ['₡1.900 / mes', '₡9.900 / año', 'US$5,99 / 30 días', '₡4.900 / mes', 'US$24,99 / mes']) assert.match(billing, new RegExp(price.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(screen, /billingOffers/);
assert.match(screen, /visitorType === 'tico'/);
assert.match(checkout, /supabase\.auth\.getUser/);
assert.match(checkout, /eq\('owner_id', user\.id\)/);
assert.match(checkout, /STRIPE_SECRET_KEY/);
assert.match(webhook, /STRIPE_WEBHOOK_SECRET/);
assert.match(webhook, /provider_subscription_id/);
assert.match(webhook, /validSignature/);
assert.match(webhook, /is_sponsored: Boolean\(count\)/);
assert.match(webhook, /unexpected_price/);
assert.match(migration, /rename column price_usd to price_amount/);
assert.match(migration, /price_currency/);
assert.match(migration, /offer_id/);
assert.match(migration, /legacy_no_ads/);
console.log('Four-tab navigation and Costa Rica tariff checkout are wired.');
