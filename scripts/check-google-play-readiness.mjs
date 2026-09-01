import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [billing, profile, commerce, deletion, traveler, migration] = await Promise.all([
  readFile(new URL('../src/lib/billing.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/profile.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/commerce.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/delete-account.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(aux)/traveler-profile.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260901114039_production_account_deletion_and_ugc.sql', import.meta.url), 'utf8'),
]);
assert.match(billing, /Platform\.OS !== 'web'/, 'Stripe checkout must be blocked in native store builds');
assert.match(profile, /Platform\.OS === 'web'.*subscriptions/s, 'Profile must hide Stripe plans outside web');
assert.match(commerce, /Platform\.OS === 'web'.*Planes Pro/s, 'Commerce must hide Stripe plans outside web');
assert.match(deletion, /deleteMyAccount/);
assert.match(traveler, /Reportar.*Bloquear/s);
assert.match(migration, /create table public\.user_blocks/);
console.log('Google Play policy guards, account deletion, reporting and blocking are wired.');
