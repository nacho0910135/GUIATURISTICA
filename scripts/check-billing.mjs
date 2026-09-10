import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [tabs, billing, screen, commerce, playCampaigns, playVerifier, checkout, webhook, migration, campaignMigration, bannerImageMigration, adminAccessMigration, campaignPricingMigration, serverAccessMigration, rtdn, portal, intents, businessGuard] = await Promise.all([
  readFile(new URL('../src/app/(tabs)/_layout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/billing.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/subscriptions.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/commerce.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/hooks/use-google-play-campaign-billing.native.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/verify-google-play-purchase/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/create-checkout-session/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/stripe-webhook/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260830110914_add_subscription_offer_pricing.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260904193320_add_commerce_ad_campaigns.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260905230000_add_campaign_banner_images.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260906031010_admin_commerce_access.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260909091743_update_campaign_subscription_pricing.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260910120000_server_personal_access.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/google-play-rtdn/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/create-customer-portal/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260910140000_google_play_purchase_intents.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260910150000_guard_paid_business_mutations.sql', import.meta.url), 'utf8'),
]);

for (const tab of ['explore', 'my-trip', 'commerce', 'friends']) assert.match(tabs, new RegExp(`name="${tab}"`));
assert.match(tabs, /name="fauna" options=\{\{ href: null \}\}/);
assert.match(tabs, /name="profile" options=\{\{ href: null \}\}/);
assert.match(billing, /WebBrowser\.openAuthSessionAsync/);
assert.match(billing, /functions\.invoke\([\s\S]*?["']create-checkout-session["']/);
assert.match(billing, /getMySubscriptions/);
for (const offer of ['universal_monthly', 'universal_annual', 'visitor_pass_30d', 'business_monthly']) {
  assert.match(billing, new RegExp(offer));
  assert.match(checkout, new RegExp(offer));
  assert.match(webhook, new RegExp(offer));
}
for (const offer of ['featured_monthly', 'banner_monthly']) {
  assert.match(billing, new RegExp(offer));
  assert.match(commerce, new RegExp(offer));
  assert.match(checkout, new RegExp(offer));
  assert.match(webhook, new RegExp(offer));
  assert.match(playVerifier, new RegExp(offer));
}
assert.match(playCampaigns, /googlePlayCampaignProductIds/);
assert.match(playCampaigns, /useIAP/);
for (const price of ['US$2 / mes', 'US$20 / año', 'US$5 / 30 días', 'US$9,99 / mes']) assert.match(billing, new RegExp(price.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(screen, /billingOffers/);
assert.match(screen, /!businessIntent \? universalOffers\.map/);
assert.match(screen, /businessIntent \? businessOffers\.map/);
assert.doesNotMatch(screen, /visitor_pass_30d/);
assert.match(screen, /MEJOR VALOR/);
assert.match(checkout, /supabase\.auth\.getUser/);
assert.match(checkout, /eq\(["']owner_id["'], user\.id\)/);
assert.match(checkout, /STRIPE_SECRET_KEY/);
assert.match(checkout, /Idempotency-Key/);
assert.match(screen, /checkoutInProgress\.current/);
assert.match(checkout, /banner_capacity_reached/);
assert.match(checkout, /new Set\(\(data \?\? \[\]\)\.map\(\(campaign\) => campaign\.service_id\)\)\.size >= 3/);
assert.match(checkout, /mode: offer\.mode/);
assert.match(checkout, /offer\.mode === ["']subscription["']/);
for (const recurringOffer of ['universal_monthly', 'universal_annual', 'business_monthly', 'featured_monthly', 'banner_monthly']) {
  assert.match(checkout, new RegExp(`${recurringOffer}: \\{[^}]+mode: ["']subscription["']`));
}
for (const oneTimeOffer of ['visitor_pass_30d']) {
  assert.match(checkout, new RegExp(`${oneTimeOffer}: \\{[^}]+mode: ["']payment["']`));
}
assert.match(billing, /Platform\.OS !== ["']web["']/);
assert.doesNotMatch(checkout, /STRIPE_PRICE_COMMERCE_FEATURED_30D/);
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
assert.doesNotMatch(commerce, /Contratar una vez/);
assert.match(commerce, /Cancelar campaña publicitaria/);
assert.match(billing, /Aparecer en los primeros lugares/);
assert.match(billing, /US\$50 \/ 30 días/);
assert.match(campaignPricingMigration, /amount_usd in \(15, 50\)/);
assert.match(commerce, /prepareCampaignBanner/);
assert.match(commerce, /Previsualización del banner/);
assert.match(commerce, /className="h-28 w-full"/);
assert.match(commerce, /número máximo de banners activos ya fue alcanzado/);
assert.match(checkout, /metadata\[image_url\]/);
assert.match(webhook, /image_url: imageUrl/);
assert.match(bannerImageMigration, /campaign-banners/);
assert.match(bannerImageMigration, /image_url/);
assert.match(billing, /hasActiveBusinessPlan/);
assert.match(billing, /getMyAccessStatus/);
assert.doesNotMatch(billing, /accountCreatedAt|TRIAL_DAYS/);
assert.doesNotMatch(tabs, /Platform\.OS === ['"]web['"]/);
assert.match(serverAccessMigration, /auth\.users/);
assert.match(serverAccessMigration, /now\(\)/);
assert.match(serverAccessMigration, /status in \('active', 'past_due', 'canceled'\)/);
assert.match(serverAccessMigration, /grant execute .* to authenticated/);
assert.match(rtdn, /validGoogleIdentity/);
assert.match(rtdn, /getGoogleSubscription/);
assert.match(portal, /billing_portal\/sessions/);
assert.match(intents, /save_google_play_purchase_intent/);
assert.match(playCampaigns, /save_google_play_purchase_intent/);
assert.match(businessGuard, /active_business_subscription_required/);
assert.match(screen, /openSubscriptionManagement/);
assert.match(commerce, /Necesitás el plan para comercios/);
assert.match(commerce, /activateAdminTestCampaign/);
assert.match(adminAccessMigration, /role = 'admin'/);
assert.match(adminAccessMigration, /security definer/);
assert.match(adminAccessMigration, /grant execute .* to authenticated/);
assert.doesNotMatch(commerce, /Google o Stripe/);
console.log('Subscriptions, one-time passes, business billing, and 30-day commerce campaigns are wired.');
