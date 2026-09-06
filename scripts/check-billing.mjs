import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [tabs, billing, screen, commerce, checkout, webhook, migration, campaignMigration, bannerImageMigration, adminAccessMigration] = await Promise.all([
  readFile(new URL('../src/app/(tabs)/_layout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/billing.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/subscriptions.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/commerce.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/create-checkout-session/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/stripe-webhook/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260830110914_add_subscription_offer_pricing.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260904193320_add_commerce_ad_campaigns.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260905230000_add_campaign_banner_images.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260906031010_admin_commerce_access.sql', import.meta.url), 'utf8'),
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
for (const offer of ['featured_30d', 'featured_monthly', 'banner_30d', 'banner_monthly']) {
  assert.match(billing, new RegExp(offer));
  assert.match(commerce, new RegExp(offer));
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
for (const recurringOffer of ['universal_monthly', 'universal_annual', 'business_monthly', 'featured_monthly', 'banner_monthly']) {
  assert.match(checkout, new RegExp(`${recurringOffer}: \\{[^}]+mode: 'subscription'`));
}
for (const oneTimeOffer of ['visitor_pass_30d', 'featured_30d', 'banner_30d']) {
  assert.match(checkout, new RegExp(`${oneTimeOffer}: \\{[^}]+mode: 'payment'`));
}
assert.match(billing, /Platform\.OS !== 'web'/);
assert.match(checkout, /STRIPE_PRICE_COMMERCE_FEATURED_30D/);
assert.match(checkout, /STRIPE_PRICE_COMMERCE_BANNER_MONTHLY/);
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
assert.match(campaignMigration, /create table public\.commerce_ad_campaigns/);
assert.match(campaignMigration, /num_nonnulls\(provider_session_id, provider_subscription_id\) = 1/);
assert.match(campaignMigration, /grant select \(id, service_id, campaign_type, target_url, status, starts_at, ends_at, created_at\)/);
assert.doesNotMatch(billing, /Las campañas se contratan desde el panel web/);
assert.match(commerce, /Contratar una vez/);
assert.match(commerce, /prepareCampaignBanner/);
assert.match(commerce, /Previsualización del banner/);
assert.match(checkout, /metadata\[image_url\]/);
assert.match(webhook, /image_url: imageUrl/);
assert.match(bannerImageMigration, /campaign-banners/);
assert.match(bannerImageMigration, /image_url/);
assert.match(billing, /hasActiveBusinessPlan/);
assert.match(commerce, /Necesitás el plan para comercios/);
assert.match(commerce, /activateAdminTestCampaign/);
assert.match(adminAccessMigration, /role = 'admin'/);
assert.match(adminAccessMigration, /security definer/);
assert.match(adminAccessMigration, /grant execute .* to authenticated/);
assert.doesNotMatch(commerce, /Google o Stripe/);
console.log('Subscriptions, one-time passes, business billing, and 30-day commerce campaigns are wired.');
