import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [verifier, rtdn, planHook, campaignHook, billing, paywall, migration, safety] = await Promise.all([
  read('supabase/functions/verify-google-play-purchase/index.ts'),
  read('supabase/functions/google-play-rtdn/index.ts'),
  read('src/hooks/use-google-play-billing.native.ts'),
  read('src/hooks/use-google-play-campaign-billing.native.ts'),
  read('src/lib/billing.ts'),
  read('src/app/subscriptions.tsx'),
  read('supabase/migrations/20260914120000_google_play_purchase_recovery.sql'),
  read('supabase/migrations/20260914170000_closed_test_safety_fixes.sql'),
]);

for (const source of [verifier, rtdn]) {
  assert.doesNotMatch(source, /IN_GRACE_PERIOD[^\n]+ON_HOLD|ON_HOLD[^\n]+past_due/);
  assert.match(source, /acknowledgeGoogleSubscription/);
}
assert.ok(verifier.indexOf('purchase_account_mismatch') < verifier.indexOf('purchase_state_write_failed'));
assert.match(rtdn, /reconciliation_pending/);
assert.match(rtdn, /google_play_purchase_intents/);
assert.match(planHook, /save_google_play_purchase_intent/);
assert.match(campaignHook, /body: \{ productId: purchase\.productId, purchaseToken \}/);
assert.match(billing, /renueva automáticamente cada año hasta que cancelés/);
assert.match(billing, /SUBSCRIPTION_STATE_ON_HOLD/);
assert.match(paywall, /Tu período gratuito terminó/);
assert.match(migration, /external_account_id/);
assert.match(migration, /provider_status in \('SUBSCRIPTION_STATE_ON_HOLD', 'SUBSCRIPTION_STATE_PAUSED'\)/);
assert.match(migration, /create or replace function public\.get_my_app_access\(\)[\s\S]*provider <> 'google_play'[\s\S]*provider_status is null[\s\S]*SUBSCRIPTION_STATE_ON_HOLD/);
assert.match(verifier, /provider_subscription_id", providerId[\s\S]*providerExisting[\s\S]*subscription\.service_id = providerExisting\.service_id \?\? serviceId \?\? null/);
assert.match(verifier, /rpc\("upsert_google_play_banner_campaign"/);
assert.match(rtdn, /identityCache\.get\(cacheKey\)/);
assert.match(safety, /pg_advisory_xact_lock[\s\S]*commerce-banner-capacity/);
assert.match(safety, /revoke insert on table public\.business_events from anon, authenticated/);
assert.match(safety, /storage_upload_within_quota[\s\S]*262144000/);
assert.match(safety, /bucket_id <> 'chat-media'[\s\S]*traveler_messages[\s\S]*discard_failed_traveler_message/);

console.log('Google Play purchase recovery and entitlement rules are guarded.');
