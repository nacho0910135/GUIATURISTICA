import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

let requested;
let calls = 0;
let response = {
  code: 'Ok', distances: [[0, 56000]], sources: [{ distance: 3 }],
  destinations: [{ distance: 3 }, { distance: 7 }],
};
let status = 200;
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/road-distance.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports, process: { env: { EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: 'test-token' } },
  URLSearchParams, AbortController, Date, clearTimeout,
  setTimeout: (fn, delay) => setTimeout(fn, delay === 15000 ? delay : 0),
  fetch: async (url) => {
    requested = new URL(url); calls++;
    return { ok: status === 200, status, json: async () => response };
  },
});
const { getRoadDistances, roadPointKey, roadDistanceLabel } = exports;
const origin = roadPointKey({ latitude: 9.93, longitude: -84.08 });
assert.equal(origin, '-84.08,9.93');
const destination = '-84.4,10.1';
assert.equal((await getRoadDistances(origin, [destination]))[0], 56, '56 km from the road service must remain 56, never a geodesic estimate');
assert.match(requested.pathname, /mapbox\/driving\//);
assert.equal(requested.searchParams.get('sources'), '0');
assert.equal(requested.searchParams.get('destinations'), '0;1');
assert.equal(requested.searchParams.get('annotations'), 'distance');
assert.equal(requested.searchParams.has('fallback_speed'), false);
assert.equal(roadDistanceLabel(56, 'es'), '≈ 56.0 km por carretera');
assert.match(roadDistanceLabel(null, 'es'), /no disponible/);
assert.match(roadDistanceLabel(undefined, 'es'), /Calculando ruta/);

response = { code: 'Ok', distances: [[12000, null]], sources: [{ distance: 5 }], destinations: [{ distance: 4 }, { distance: 4 }] };
const multiple = await getRoadDistances(origin, [destination, '-84.5,10.2']);
assert.equal(multiple[0], 12);
assert.equal(multiple[1], null, 'No route must not become zero or straight-line');
assert.equal(requested.searchParams.get('destinations'), '1;2');
response.destinations[0].distance = 1500;
assert.equal((await getRoadDistances(origin, [destination, '-84.5,10.2']))[0], null, 'A route ending far from the pin cannot claim to reach it');
response = { code: 'NoRoute' };
assert.equal((await getRoadDistances(origin, [destination]))[0], null);
status = 403;
await assert.rejects(getRoadDistances(origin, [destination]), /403/);
status = 200;
response = { code: 'Ok', distances: [[0]] };
await assert.rejects(getRoadDistances(origin, [destination]), /INVALID_ROAD_RESPONSE/);
await assert.rejects(getRoadDistances(origin, Array(25).fill(destination)), /INVALID_ROAD_POINTS/);
const controller = new AbortController();
controller.abort();
const before = calls;
await assert.rejects(getRoadDistances(origin, [destination], controller.signal));
assert.equal(calls, before, 'Canceled origins must not trigger requests');
assert.equal(roadPointKey({ latitude: null, longitude: 0 }), '');
assert.equal(roadPointKey({ latitude: 100, longitude: 0 }), '');
for (const path of ['src/app/(tabs)/explore.tsx', 'src/app/(tabs)/commerce.tsx', 'src/app/(aux)/province.tsx']) {
  const source = readFileSync(path, 'utf8');
  assert.ok(source.includes('useRoadDistances'), path);
  assert.ok(!/distanceKm|straightLineDistanceLabel/.test(source), `${path}: no straight-line display or ranking`);
}
// Exercise batching and origin-dependent query keys, including a GPS move
// while the new road result is still pending.
const hookExports = {};
let queryKeys;
let pending = false;
vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/use-road-distances.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports: hookExports,
  require: (name) => name === './road-distance' ? exports : {
    useQueries: ({ queries }) => {
      queryKeys = queries.map((query) => query.queryKey);
      return queries.map((query) => ({ isError: false, data: pending ? undefined : query.queryKey.slice(2).map(() => 56) }));
    },
  },
});
const points = Array.from({ length: 25 }, (_, index) => ({ latitude: 10, longitude: -84 + index / 100 }));
let distance = hookExports.useRoadDistances({ latitude: 9.93, longitude: -84.08 }, points);
assert.equal(queryKeys.length, 2, '25 destinations must be split into legal batches');
assert.equal(distance(points[24]), 56);
const oldKey = queryKeys[0][1];
pending = true;
distance = hookExports.useRoadDistances({ latitude: 9.94, longitude: -84.08 }, points);
assert.notEqual(queryKeys[0][1], oldKey);
assert.equal(distance(points[0]), undefined, 'GPS movement must not display the previous origin’s kilometers');
distance = hookExports.useRoadDistances(null, points);
assert.equal(queryKeys.length, 0);
assert.equal(distance(points[0]), null, 'Without precise GPS, no assumed origin is queried');
console.log('Road distance checks passed: service meters, ordering, no-route, snapping, failures, cancellation, labels and all display surfaces.');
