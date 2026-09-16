import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const supabase = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');
const queries = readFileSync(new URL('../src/lib/query-client.ts', import.meta.url), 'utf8');
const logistics = readFileSync(new URL('../src/lib/logistics.ts', import.meta.url), 'utf8');
const weather = readFileSync(new URL('../supabase/functions/weather/index.ts', import.meta.url), 'utf8');
assert.doesNotMatch(supabase, /if \(!SUPABASE_URL[^}]+throw/s);
assert.match(supabase, /https:\/\/offline\.invalid/);
assert.match(supabase, /try \{ return window\.localStorage; \} catch/);
assert.match(queries, /throwOnError: false/);
assert.match(queries, /placeholderData:/);
assert.match(queries, /Promise\.race\([\s\S]+CACHE_RESTORE_TIMEOUT_MS/);
assert.match(logistics, /functions\.invoke\('weather'/);
assert.doesNotMatch(logistics, /OPENWEATHER|api\.openweathermap\.org/);
assert.match(weather, /catch \{[\s\S]+https:\/\/api\.open-meteo\.com\/v1\/forecast/);
assert.match(weather, /AbortSignal\.timeout\(10_000\)/);
console.log('API failure fallbacks OK');
