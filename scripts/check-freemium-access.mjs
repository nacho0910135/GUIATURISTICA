import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20260916033433_enforce_paid_freemium_access.sql');
const trialMigration = read('supabase/migrations/20260916050000_allow_personal_trial_access.sql');
const accessHook = read('src/components/subscription-required.tsx');
const compass = read('src/app/compass.tsx');
const logistics = read('src/app/(tabs)/logistics.tsx');
const explore = read('src/app/(tabs)/explore.tsx');
const community = read('src/app/(tabs)/friends.tsx');
const header = read('src/components/global-header.tsx');
const ad = read('src/components/ad-banner.native.tsx');

for (const table of ['traveler_posts', 'traveler_replies', 'traveler_reactions', 'traveler_reply_reactions', 'group_ride_comments']) assert.match(migration, new RegExp(`on public\\.${table} as restrictive for insert`));
assert.match(migration, /media_type is distinct from 'audio'/);
assert.match(trialMigration, /created_at \+ interval '15 days' > now\(\)/);
assert.match(accessHook, /hasPaidAccess: access\.data\?\.hasAccess === true/);
assert.match(compass, /!access\.hasPaidAccess.*SubscriptionRequired/s);
assert.match(logistics, /session && !access\.isPending && !access\.hasPaidAccess.*SubscriptionRequired/s);
assert.match(explore, /requireAuth[\s\S]*!paidAccess\.hasPaidAccess[\s\S]*setShowNearbyPaywall\(true\)/);
assert.match(community, /!writeLocked \? <View/);
assert.match(header, /showTrialBanner = Boolean\(access\.data[\s\S]*!access\.data\.hasAccess\)/);
assert.match(ad, /return null/);
assert.doesNotMatch(ad, /react-native-google-mobile-ads/);
console.log('The 15-day trial unlocks personal features while commerce keeps its separate subscription.');
