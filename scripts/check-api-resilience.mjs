import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const supabase = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');
const queries = readFileSync(new URL('../src/lib/query-client.ts', import.meta.url), 'utf8');
assert.doesNotMatch(supabase, /if \(!SUPABASE_URL[^}]+throw/s);
assert.match(supabase, /https:\/\/offline\.invalid/);
assert.match(supabase, /try \{ return window\.localStorage; \} catch/);
assert.match(queries, /throwOnError: false/);
assert.match(queries, /placeholderData:/);
console.log('API failure fallbacks OK');
