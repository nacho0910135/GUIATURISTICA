import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const forum = await readFile(new URL('../src/app/(tabs)/friends.tsx', import.meta.url), 'utf8');

assert.match(forum, /Compartir un sitio turístico/);
assert.match(forum, /`\$\{place\.name\} \$\{place\.province\} \$\{place\.category\}`/);
assert.match(forum, /recommended_destination_id/);
assert.match(forum, /pathname: '\/\(aux\)\/province'[\s\S]*destinationId: recommendedPlace\.id/);

console.log('Forum: visible place button, coincidence search, persisted recommendation and detail link passed.');
