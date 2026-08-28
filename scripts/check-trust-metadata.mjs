import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [migration, places] = await Promise.all([
  readFile(new URL('../supabase/migrations/20260828222902_add_documented_trust_metadata.sql', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/places.ts', import.meta.url), 'utf8'),
]);

assert.match(migration, /cardinality\(validated_by\) = 0[\s\S]*verification_evidence_url is not null[\s\S]*verification_checked_at is not null/);
assert.match(migration, /set validated_by = '\{\}'::text\[\]/i);
assert.doesNotMatch(places, /validated_by:\s*\['(?:ICT|SINAC)'\]/);
console.log('Trust metadata requires documented evidence and a verification date.');
