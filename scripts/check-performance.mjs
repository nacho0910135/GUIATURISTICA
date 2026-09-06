import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

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
    if (name === 'expo-router/react-navigation') return { useIsFocused: () => focused };
    if (name === 'react-native') return { AppState: appState };
    if (name === '@/lib/supabase') return { supabase: {
      channel() {
        const channel = { callbacks: [], on(_event, _filter, callback) { this.callbacks.push(callback); return this; }, subscribe() { return this; } };
        channels.push(channel);
        return channel;
      },
      removeChannel() { removed++; },
    } };
    throw new Error(`Unexpected import: ${name}`);
  },
  setInterval(callback, delay) { assert.equal(delay, 2500); intervalCount++; intervalCallback = callback; return 1; },
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
const helpers = [];
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'visiblePlaces') searchExpression = node.initializer.getText(ast);
  if (ts.isFunctionDeclaration(node) && ['normalizeSearchText', 'nameSearchScore', 'distanceKm'].includes(node.name?.text)) helpers.push(node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(searchExpression);
const context = vm.createContext({ useMemo: (calculate) => calculate() });
vm.runInContext(compile(`${helpers.join('\n')}
function findPlaces(data, search, coordinates, language) {
  const places = { data };
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
console.log('Performance regressions checked: focus/background sync cleanup and 72 search/order cases.');
