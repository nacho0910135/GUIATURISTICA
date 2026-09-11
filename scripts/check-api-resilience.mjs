import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const supabase = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');
const queries = readFileSync(new URL('../src/lib/query-client.ts', import.meta.url), 'utf8');
const logistics = readFileSync(new URL('../src/lib/logistics.ts', import.meta.url), 'utf8');
assert.doesNotMatch(supabase, /if \(!SUPABASE_URL[^}]+throw/s);
assert.match(supabase, /https:\/\/offline\.invalid/);
assert.match(supabase, /try \{ return window\.localStorage; \} catch/);
assert.match(queries, /throwOnError: false/);
assert.match(queries, /placeholderData:/);
assert.match(logistics, /catch \{[\s\S]+https:\/\/api\.open-meteo\.com\/v1\/forecast/);
assert.match(logistics, /AbortSignal\.timeout\(12_000\)/);
console.log('API failure fallbacks OK');
