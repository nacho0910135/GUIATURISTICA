import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20260916033433_enforce_paid_freemium_access.sql');
const compass = read('src/app/compass.tsx');
const logistics = read('src/app/(tabs)/logistics.tsx');
const explore = read('src/app/(tabs)/explore.tsx');
const community = read('src/app/(tabs)/friends.tsx');
const ad = read('src/components/ad-banner.tsx');

for (const table of ['traveler_posts', 'traveler_replies', 'traveler_reactions', 'traveler_reply_reactions', 'group_ride_comments']) assert.match(migration, new RegExp(`on public\\.${table} as restrictive for insert`));
assert.match(migration, /media_type is distinct from 'audio'/);
assert.match(compass, /!access\.hasPaidAccess.*SubscriptionRequired/s);
assert.match(logistics, /!access\.hasPaidAccess.*SubscriptionRequired/s);
assert.match(explore, /!paidAccess\.hasPaidAccess[\s\S]*setShowNearbyPaywall\(true\)/);
assert.match(community, /paidAccess\.hasPaidAccess \? <View/);
assert.match(ad, /enabled: !hidden && !access\.hasPaidAccess/);
console.log('Freemium access, community write restrictions, and free-tier ads are guarded.');
