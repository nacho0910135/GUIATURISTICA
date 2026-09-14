import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { QueryClient, QueryObserver } from '@tanstack/react-query';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const providerSource = read('src/providers/app-provider.tsx');
assert.ok(providerSource.includes('void refreshUserLocation().catch'), 'Startup must request precise location');
assert.ok(!providerSource.includes('void registerPushNotifications('), 'Startup must never request push permission');
assert.ok(read('src/app/(tabs)/profile.tsx').includes('registerPushNotifications()'), 'Profile must expose opt-in push activation');
assert.match(read('src/lib/travelers.ts'), /order\('id'.*limit\(20\)/s, 'Traveler wall must use bounded cursor pages');
assert.match(read('src/lib/commerce.ts'), /gt\('id', cursor\).*limit\(50\)/s, 'Commerce directory must use bounded cursor pages');
assert.match(read('src/lib/social-profile.ts'), /rpc\('get_private_conversation_summaries'.*p_limit: 30/s, 'Conversation list must use bounded server summaries');
assert.match(read('src/lib/social-profile.ts'), /rpc\('get_private_messages'.*p_limit: 50/s, 'Message history must use bounded cursor pages');
assert.match(read('src/app/(aux)/private-messages.tsx'), /fetchNextPage\(\)/, 'Older messages must remain reachable');
assert.match(read('src/lib/places.ts'), /eq\('status', 'Activo'\)\.limit\(1000\)/, 'Explore catalog must have a hard response ceiling');
assert.equal((read('src/lib/social-profile.ts').match(/\.limit\(100\)/g) ?? []).length, 5, 'Profile growth lists must be bounded');

// Exercise the actual sync hook with deterministic navigation, timers and Realtime.
let focused = true;
let effect;
let refreshed = 0;
let removed = 0;
let changeCallback;
let intervalCallback;
let intervalCount = 0;
let listenerCount = 0;
const channels = [];
const appState = {
  currentState: 'active',
  addEventListener(_event, callback) {
    listenerCount++;
    changeCallback = callback;
    return { remove() { listenerCount--; } };
  },
};
const exports = {};
vm.runInNewContext(compile(read('src/hooks/use-traveler-messages-sync.ts')), {
  exports,
  require(name) {
    if (name === 'react') return { useRef: (current) => ({ current }), useEffect: (callback) => { effect = callback; } };
    if (name === '@/hooks/use-screen-active') return { useScreenActive: () => focused && appState.currentState === 'active' };
    if (name === 'react-native') return { AppState: appState };
    if (name === '@/lib/supabase') return { supabase: {
      channel() {
        const channel = { callbacks: [], on(_event, _filter, callback) { this.callbacks.push(callback); return this; }, subscribe(callback) { this.status = callback; return this; } };
        channels.push(channel);
        return channel;
      },
      removeChannel() { removed++; return Promise.resolve(); },
    } };
    throw new Error(`Unexpected import: ${name}`);
  },
  setInterval(callback, delay) { assert.equal(delay, 30000); intervalCount++; intervalCallback = callback; return 1; },
  clearInterval() { intervalCount--; },
});
const mount = (userId) => {
  exports.useTravelerMessagesSync(userId, () => refreshed++);
  return effect();
};
assert.equal(mount(undefined), undefined);
focused = false;
assert.equal(mount('traveler'), undefined);
assert.equal(channels.length, 0, 'Hidden screens must not subscribe');
focused = true;
let cleanup = mount('traveler');
assert.equal(channels.length, 1);
intervalCallback();
channels[0].callbacks[0]();
channels[0].callbacks[1]();
assert.equal(refreshed, 3, 'Polling and incoming/outgoing events must refresh');
appState.currentState = 'background';
intervalCallback();
channels[0].callbacks[0]();
assert.equal(refreshed, 3, 'Background events must not fetch');
appState.currentState = 'active';
changeCallback('active');
assert.equal(refreshed, 4, 'Returning to the app must catch up immediately');
cleanup();
assert.equal(removed, 1);
assert.equal(intervalCount, 0);
assert.equal(listenerCount, 0);
focused = false;
assert.equal(mount('traveler'), undefined);
focused = true;
cleanup = mount('traveler');
intervalCallback();
assert.equal(refreshed, 5, 'Returning to the screen must resume polling');
cleanup();
assert.equal(intervalCount, 0);
assert.equal(listenerCount, 0);

// Execute the screen's real search calculation, keeping accents, ranking and ties.
const source = read('src/app/(tabs)/explore.tsx');
const ast = ts.createSourceFile('explore.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let searchExpression;
const expressions = {};
const helpers = [];
function visit(node) {
  if (ts.isVariableDeclaration(node) && ['matchedPlaces', 'routingCandidates'].includes(node.name.getText(ast))) expressions[node.name.getText(ast)] = node.initializer.getText(ast);
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'visiblePlaces') searchExpression = node.initializer.getText(ast);
  if (ts.isFunctionDeclaration(node) && ['normalizeSearchText', 'nameSearchScore', 'distanceKm'].includes(node.name?.text)) helpers.push(node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
const locationAst = ts.createSourceFile('location-quality.ts', read('src/lib/location-quality.ts'), ts.ScriptTarget.Latest, true);
for (const node of locationAst.statements) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'distanceKm') helpers.push(node.getText(locationAst).replace('export ', ''));
}
assert.ok(searchExpression);
const context = vm.createContext({ useMemo: (calculate) => calculate() });
vm.runInContext(compile(`${helpers.join('\n')}
function findPlaces(data, search, coordinates, language) {
  const places = { data };
  const routingOrigin = coordinates;
  const matchedPlaces = ${expressions.matchedPlaces};
  const routingCandidates = ${expressions.routingCandidates};
  const roadRoutes = { data: new Map(data.map(place => [place.id, { distanceKm: coordinates ? distanceKm(coordinates, place) : 0 }])) };
  return ${searchExpression};
}`), context);
const data = ['Playa Doña Ana', 'Playa Hermosa', 'Doña Ana', 'Volcán Arenal', 'Playa Doña Ana Norte'].map((name, i) => ({
  id: i, name, latitude: 9 + i / 10, longitude: -84 - i / 10,
}));
for (const language of ['es', 'en']) {
  for (const search of ['', ' ', 'playa', 'doña ana', 'dona ana', 'volcan', 'ana playa', 'xyz', '!!!']) {
    for (const coordinates of [undefined, { latitude: 9.1, longitude: -84.1 }, { latitude: 9, longitude: -84 }, { latitude: 10, longitude: -85 }]) {
      const term = context.normalizeSearchText(search);
      const expected = data.flatMap((place) => {
        const score = term ? context.nameSearchScore(place.name, term) : 0;
        return score === null || (!term && !coordinates) ? [] : [{ place, score }];
      }).sort((a, b) => coordinates
        ? context.distanceKm(coordinates, a.place) - context.distanceKm(coordinates, b.place) || a.score - b.score
        : a.score - b.score || a.place.name.localeCompare(b.place.name, language));
      const actual = context.findPlaces(data, search, coordinates, language);
      assert.deepEqual(Array.from(actual, (place) => place.id), expected.map(({ place }) => place.id));
    }
  }
}
assert.deepEqual(data.map((place) => place.id), [0, 1, 2, 3, 4], 'Search must not mutate the cached list');
// Realtime reconnection catches up without waiting for the backup timer.
cleanup = mount('traveler');
const beforeReconnect = refreshed;
channels.at(-1).status('SUBSCRIBED');
assert.equal(refreshed, beforeReconnect + 1);
cleanup();
appState.currentState = 'background';
assert.equal(mount('traveler'), undefined, 'Background mount must not open a channel');
appState.currentState = 'active';

// Exercise the actual screen visibility hook, including listener disposal.
const activeExports = {};
let dispose;
vm.runInNewContext(compile(read('src/hooks/use-screen-active.ts')), {
  exports: activeExports,
  require(name) {
    if (name === 'expo-router/react-navigation') return { useIsFocused: () => focused };
    if (name === 'react-native') return { AppState: appState };
    if (name === 'react') return { useSyncExternalStore(subscribe, snapshot) { dispose = subscribe(() => {}); return snapshot(); } };
    throw new Error(name);
  },
});
for (const foreground of ['active', 'background', 'inactive']) {
  for (const focus of [true, false]) {
    appState.currentState = foreground;
    focused = focus;
    assert.equal(activeExports.useScreenActive(), foreground === 'active' && focus);
    dispose();
  }
}
assert.equal(listenerCount, 0);

// Real Query observers: concurrent consumers share a request, fresh data survives
// navigation, account changes never display the previous user's private data.
const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
let requests = 0;
let resolveRequest;
const options = {
  queryKey: ['private-conversations', 'alice'], staleTime: 30000, placeholderData: undefined,
  queryFn: () => { requests++; return new Promise(resolve => { resolveRequest = resolve; }); },
};
const header = new QueryObserver(client, options);
const profile = new QueryObserver(client, options);
const offHeader = header.subscribe(() => {});
const offProfile = profile.subscribe(() => {});
assert.equal(requests, 1);
resolveRequest(['alice-message']);
await client.getQueryCache().find({ queryKey: options.queryKey }).promise;
await client.fetchQuery(options);
assert.equal(requests, 1, 'Fresh navigation must reuse data');
profile.setOptions({ ...options, queryKey: ['private-conversations', 'bob'], enabled: false });
assert.equal(profile.getCurrentResult().data, undefined);
offHeader(); offProfile(); client.clear();
console.log('Performance checks passed: background cleanup, Realtime reconnect, shared cache, account isolation and search ordering.');
