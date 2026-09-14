import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports = {}, globals = {}) {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: (name) => {
      if (!(name in imports)) throw new Error(`Missing mock: ${name}`);
      return imports[name];
    }, Date, setTimeout, clearTimeout, setInterval, clearInterval, console, ...globals,
  });
  return exports;
}

const quality = load('src/lib/location-quality.ts');
const fix = (accuracy = 10, timestamp = Date.now(), latitude = 9.93, longitude = -84.08) => ({
  timestamp, coords: { latitude, longitude, accuracy },
});
assert.equal(quality.isUsablePosition(fix()), true);
for (const bad of [fix(null), fix(1000), fix(5000), fix(NaN), fix(-1), fix(10, Date.now() - 300000), fix(10, Date.now(), 91), fix(10, Date.now(), 9, NaN)]) {
  assert.equal(quality.isUsablePosition(bad), false);
}
assert.equal(quality.hasPrecisePermission({ granted: true, android: { accuracy: 'coarse' } }), false);
assert.equal(quality.hasPrecisePermission({ granted: true, ios: { accuracy: 'reduced' } }), false);
assert.equal(Math.round(quality.distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })), 111);
assert.equal(quality.roadDistanceLabel(34, 'es'), '34.0 km por carretera');
assert.equal(quality.roadDistanceLabel(0.25, 'en'), '250 m by road');
assert.equal(quality.roadDistanceLabel(null, 'es'), 'Distancia no disponible');

let permission = { granted: true, canAskAgain: true, android: { accuracy: 'fine' } };
let position = fix();
let requested = 0;
let options;
const location = {
  Accuracy: { Highest: 6 },
  getForegroundPermissionsAsync: async () => permission,
  requestForegroundPermissionsAsync: async () => { requested++; return permission; },
  getCurrentPositionAsync: async (value) => { options = value; return position; },
};
const current = load('src/lib/current-location.ts', {
  'expo-location': location, 'react-native': { Platform: { OS: 'web' } }, './location-quality': quality,
});
const result = await current.getPreciseCurrentLocation('es');
assert.equal(result.latitude, position.coords.latitude);
assert.equal(options.maximumAge, 0);
assert.equal(options.accuracy, 6);
assert.equal(requested, 0, 'Reuse the session permission');
for (const bad of [fix(1000), fix(null), fix(10, Date.now() - 600000), fix(10, Date.now(), NaN)]) {
  position = bad;
  await assert.rejects(current.getPreciseCurrentLocation('es'), /precisa/);
}
permission = { granted: true, android: { accuracy: 'coarse' } };
await assert.rejects(current.getPreciseCurrentLocation('es'), /precisa/);
permission = { granted: false, canAskAgain: false };
await assert.rejects(current.getPreciseCurrentLocation('en'), /precise/);
assert.equal(requested, 0);

let triggerTimeout;
const timed = load('src/lib/current-location.ts', {
  'expo-location': { ...location,
    getForegroundPermissionsAsync: async () => ({ granted: true }),
    getCurrentPositionAsync: () => new Promise(() => {}),
  }, 'react-native': { Platform: { OS: 'android' } }, './location-quality': quality,
}, { setTimeout: (fn) => { triggerTimeout = fn; return 1; }, clearTimeout() {} });
const pendingFix = timed.getPreciseCurrentLocation('es');
await new Promise(setImmediate);
triggerTimeout();
await assert.rejects(pendingFix, /reintentá/);

let openedUrl;
const navigation = load('src/lib/logistics.ts', {
  'expo-linking': { openURL: async (url) => { openedUrl = url; } },
  'react-native': { Platform: { OS: 'android' } },
  '@/lib/query-storage': {}, '@/lib/supabase': {}, '@/lib/road-routing': {},
});
await navigation.openNavigation(9.93, -84.08);
assert.equal(new URL(openedUrl).searchParams.get('ll'), '9.93,-84.08', 'Waze uses the destination in latitude,longitude order');
assert.equal(new URL(openedUrl).searchParams.get('navigate'), 'yes');

// Exercise the actual provider callbacks with a small hook harness. Unrelated
// auth/network effects are registered but not mounted in this location test.
let cursor = 0;
const slots = [];
let effects = [];
const react = {
  createContext: () => ({ Provider: 'Provider' }),
  useContext: () => null,
  useState: (initial) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useRef: (initial) => {
    const index = cursor++;
    return slots[index] ??= { current: initial };
  },
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
  useEffect: (fn) => effects.push(fn),
};
let watchCallback;
let watchError;
let removed = 0;
location.watchPositionAsync = async (_, callback, error) => {
  watchCallback = callback; watchError = error;
  return { remove: () => { removed++; } };
};
let expire;
let now = Date.now();
let onAppState;
const appState = {
  currentState: 'active',
  addEventListener: (_, callback) => { onAppState = callback; return { remove() {} }; },
};
const provider = load('src/providers/app-provider.tsx', {
  react,
  'react/jsx-runtime': { Fragment: 'Fragment', jsx: (_, props) => props, jsxs: (_, props) => props },
  'expo-auth-session': {}, 'expo-constants': {}, 'expo-linking': {},
  'expo-location': location, 'expo-router': {},
  'expo-web-browser': { maybeCompleteAuthSession() {} },
  'react-native': { Platform: { OS: 'web' }, AppState: appState },
  '@/lib/location-quality': quality, '@/lib/admin-push-notifications': {},
  '@/lib/app-options': { getPlannerOptions: async () => ({ provinces: [] }) },
  '@/lib/offline-trip-pack': { ensureOfflineTripPacks: async () => {} },
  '@/lib/i18n': { copy: { es: {}, en: {} } }, '@/lib/push-notifications': {},
  '@/lib/supabase': { supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } },
  '@/theme/theme-provider': { useAppTheme: () => ({ mode: 'light' }) },
}, { Date: class extends Date { static now() { return now; } }, setInterval: (callback) => { expire = callback; return 1; }, clearInterval() {} });
const render = () => { cursor = 0; effects = []; return provider.AppProvider({ children: null }).value; };
let context = render();
permission = { granted: true, android: { accuracy: 'fine' } };
position = fix();
await context.refreshUserLocation();
context = render();
assert.equal(context.userLocation.latitude, 9.93);
watchCallback(fix(8, Date.now() + 1000, 10.1, -84.4));
context = render();
assert.equal(context.userLocation.latitude, 10.1, 'All consumers get movement updates');
watchCallback(fix(2000, Date.now() + 2000));
assert.equal(render().userLocation, null, 'Hide unreliable updates');
watchCallback(fix(8, Date.now() + 3000, 10.2));
assert.equal(render().userLocation.latitude, 10.2, 'Recover from coarse fixes');
watchError('GPS lost');
assert.equal(render().userLocation, null);
assert.equal(render().locationError, 'unavailable');
const staleCallback = watchCallback;
permission = { granted: false, canAskAgain: false };
await render().refreshUserLocation();
staleCallback(fix(8, Date.now() + 4000));
assert.equal(render().userLocation, null, 'Old subscriptions cannot restore revoked location');
assert.equal(render().locationError, 'denied');
assert.ok(removed >= 1);
const cleanup = effects.find((effect) => effect.toString().includes('setInterval'))();
assert.equal(typeof expire, 'function');
permission = { granted: true, android: { accuracy: 'fine' } };
position = fix(8, Date.now() + 4000);
await render().refreshUserLocation();
assert.ok(render().userLocation);
now += 120000;
expire();
assert.equal(render().userLocation, null, 'A silent GPS cannot leave stale distances on screen');
await new Promise(setImmediate);
now = Date.now();
position = fix(8, Date.now() + 4500);
await render().refreshUserLocation();
assert.ok(render().userLocation);
effects.find((effect) => effect.toString().includes('AppState.addEventListener'))();
const backgroundCallback = watchCallback;
onAppState('background');
assert.equal(render().userLocation, null);
backgroundCallback(fix(8, Date.now() + 4800));
assert.equal(render().userLocation, null, 'Background callback cannot restore a stale origin');
onAppState('active');
await new Promise(setImmediate);
assert.ok(render().userLocation, 'Resume reacquires location without asking permission again');
cleanup();
const beforeCleanup = render().userLocation;
watchCallback(fix(8, Date.now() + 4900, 11));
assert.equal(render().userLocation, beforeCleanup, 'Unmount invalidates pending callbacks');

// Every explicit current-location action uses the same validated acquisition.
for (const path of ['src/app/(tabs)/friends.tsx', 'src/app/(tabs)/explore.tsx', 'src/app/(tabs)/commerce.tsx']) {
  const source = readFileSync(path, 'utf8');
  assert.ok(source.includes('getPreciseCurrentLocation(language)'), path);
  assert.ok(!/Location\.(getCurrentPositionAsync|getLastKnownPositionAsync)/.test(source), path);
}
for (const path of ['src/app/(tabs)/explore.tsx', 'src/app/(tabs)/commerce.tsx']) {
  const source = readFileSync(path, 'utf8');
  assert.ok(source.includes('Previsualizar ubicación'), `${path}: location preview`);
  assert.ok(source.includes('https://www.google.com/maps/search/?api=1&query='), `${path}: forum map action`);
}
const exploreSource = readFileSync('src/app/(tabs)/explore.tsx', 'utf8');
assert.ok(exploreSource.includes('await refreshUserLocation()'), 'Explore refreshes the provider-owned session location');
assert.ok(readFileSync('src/app/(tabs)/commerce.tsx', 'utf8').includes('refreshUserLocation'), 'Commerce refreshes the provider-owned session location');
assert.match(exploreSource, /if \(!isFocused\) resetExplore\(\)/, 'Explore clears temporary nearby results on blur');
assert.match(exploreSource, /onPress=\{\(\) => \{\s*resetExplore\(\);\s*router\.push\(\{ pathname: '\/\(aux\)\/province'/, 'Opening a nearby destination clears the list first');
assert.ok(exploreSource.includes("'mapbox-road-routes-v3'"), 'Nearby destinations cannot reuse the old straight-distance query cache');
assert.ok(exploreSource.includes('userLocation.latitude.toFixed(3)'), 'Small GPS movements do not restart every Directions request');
assert.match(exploreSource, /routingCandidates[\s\S]*slice\(0, 24\)/, 'Nearby route requests resolve in a bounded batch');
for (const path of ['src/app/(tabs)/explore.tsx', 'src/app/(tabs)/commerce.tsx', 'src/app/(aux)/province.tsx']) {
  const source = readFileSync(path, 'utf8');
  assert.ok(source.includes('roadRouteLabel'), `${path}: road distance and duration label`);
}
const routingSource = readFileSync('src/lib/road-routing.ts', 'utf8');
assert.ok(routingSource.includes('/directions/v5/mapbox/driving/'), 'Mapbox Directions is the road-distance source');
assert.ok(routingSource.includes('route.distance! / 1000'), 'Mapbox meters become kilometers');
let directionsUrl;
const routeCache = new Map();
const asyncStorage = { setItem: async (key, value) => routeCache.set(key, value), getItem: async (key) => routeCache.get(key) ?? null };
const routing = load('src/lib/road-routing.ts', { '@react-native-async-storage/async-storage': asyncStorage }, {
  AbortController,
  process: { env: { EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: 'public-test-token' } },
  fetch: async (url) => {
    directionsUrl = url;
    return { ok: true, json: async () => ({ code: 'Ok', routes: [{ distance: 58000, duration: 3600 }] }) };
  },
});
const roadRoute = await routing.getRoadRoute({ latitude: 9.93, longitude: -84.08 }, { latitude: 10.63, longitude: -85.44 });
assert.equal(roadRoute.distanceKm, 58);
assert.equal(roadRoute.durationMinutes, 60);
assert.equal(roadRoute.cached, false);
assert.match(directionsUrl, /-84\.08000,9\.93000;-85\.44000,10\.63000/);
const offlineRouting = load('src/lib/road-routing.ts', { '@react-native-async-storage/async-storage': asyncStorage }, {
  AbortController,
  process: { env: { EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: 'public-test-token' } },
  fetch: async () => { throw new Error('offline'); },
});
const cachedRoute = await offlineRouting.getRoadRoute({ latitude: 9.93, longitude: -84.08 }, { latitude: 10.63, longitude: -85.44 });
assert.equal(cachedRoute.distanceKm, 58);
assert.equal(cachedRoute.cached, true);
assert.match(quality.roadRouteLabel(cachedRoute, 'es'), /58\.0 km por carretera · 60 min · Última consulta/);
console.log('Location checks passed: precision, freshness, permissions, shared movement, revocation, cleanup, Mapbox road-distance labels and all three capture flows.');
