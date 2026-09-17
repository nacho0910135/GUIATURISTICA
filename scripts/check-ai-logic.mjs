import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const client = read('src/lib/destination-ai.native.ts');
const assistant = read('src/components/destination-ai-assistant.tsx');
const trip = read('src/app/(tabs)/my-trip.tsx');
const place = read('src/app/(aux)/province.tsx');

assert.match(client, /GoogleAIBackend/);
assert.match(client, /android: \{ provider: __DEV__ \? 'debug' : 'playIntegrity'/);
assert.match(client, /getToken\(verifiedAppCheck, false\)/);
assert.match(client, /appCheck: verifiedAppCheck/);
assert.doesNotMatch(client, /supabase/);
assert.match(assistant, /presentationStyle="fullScreen"/);
assert.match(assistant, /rounded-control bg-ui-primary/);
assert.match(assistant, /Reintentar/);
assert.match(assistant, /Firebase AI Logic request failed/);
assert.match(trip, /<DestinationAIAssistant/);
assert.match(place, /<DestinationAIAssistant/);

console.log('Firebase AI Logic enriches route stops and place details without entering the planner.');
