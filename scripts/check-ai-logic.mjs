import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const client = read('src/lib/destination-ai.native.ts');
const assistant = read('src/components/destination-ai-assistant.tsx');
const trip = read('src/app/(tabs)/my-trip.tsx');
const place = read('src/app/(aux)/province.tsx');

assert.match(client, /GoogleAIBackend/);
assert.match(client, /appCheck: verifiedAppCheck/);
assert.doesNotMatch(client, /supabase/);
assert.match(assistant, /presentationStyle="fullScreen"/);
assert.match(trip, /<DestinationAIAssistant/);
assert.match(place, /<DestinationAIAssistant/);

console.log('Firebase AI Logic enriches route stops and place details without entering the planner.');
