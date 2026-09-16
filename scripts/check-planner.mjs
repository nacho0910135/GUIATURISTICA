import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports = {}) {
  const output = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: (name) => imports[name], Date, URLSearchParams, fetch, Math, Set, Map });
  return exports;
}

const source = await readFile(new URL('../src/lib/logistics.ts', import.meta.url), 'utf8');
const optionsSource = await readFile(new URL('../src/lib/app-options.ts', import.meta.url), 'utf8');
const exploreSource = await readFile(new URL('../src/app/(tabs)/explore.tsx', import.meta.url), 'utf8');
assert.match(source, /reducedMobility[\s\S]*fácil\|facil/);
assert.match(source, /Promise\.all\([\s\S]*getWeather[\s\S]*getNearbyFoodService[\s\S]*getTravelMinutes/);
assert.match(source, /saveOfflinePack\(destinations: Destination\[\], dayPlan\?/);
assert.match(source, /requires_sinac_booking,sinac_booking_url/);
assert.doesNotMatch(source, /return \(preferred\.length \? preferred : candidates\)\.slice/);
assert.match(source, /export async function buildTripPlan/);
assert.match(source, /export function buildOfflineTripPlan/);
assert.match(source, /while \(stops\.length < 4 && remainingBudget >= 0\)/);
assert.match(source, /remainingMinutes < travelMinutes \+ returnMinutes \+ 60[\s\S]*candidates = candidates\.filter/);
assert.match(source, /directions-matrix\/v1\/mapbox/);
assert.match(source, /travelTimeSource: 'live-road' \| 'estimated'/);
assert.match(source, /source: 'live-road' as const/);
assert.match(source, /isNatureDestination[\s\S]*setHours\(16, 0, 0, 0\)/);
assert.match(source, /mealBudgetPerPerson[\s\S]*20500/);
assert.match(source, /estimatedTotalCrc: mealCostCrc/);
const screen = await readFile(new URL('../src/app/(tabs)/my-trip.tsx', import.meta.url), 'utf8');
assert.match(screen, /getPreciseCurrentLocation\(language\)/);
assert.match(screen, /SAVED_TRIP_PLAN/);
assert.match(screen, /LocationPickerModal/);
assert.match(screen, /Share\.share/);
assert.match(screen, /RideDateFields/);
assert.match(source, /price_national_crc == null \? null/);
assert.match(screen, /trip_created/);
assert.doesNotMatch(screen, /9\.9326|Descargar \$\{zone|Prepará la zona sin conexión/);
assert.match(screen, /pueden variar según la zona/);
const provider = await readFile(new URL('../src/providers/app-provider.tsx', import.meta.url), 'utf8');
const queryClient = await readFile(new URL('../src/lib/query-client.ts', import.meta.url), 'utf8');
assert.match(provider, /getMyAccessStatus\(\)[\s\S]*access\.hasAccess \? getPlannerOptions\(\) : null[\s\S]*ensureOfflineTripPacks\(options\.provinces\)/);
assert.match(screen, /access\.data\?\.hasAccess === false[\s\S]*Redirect href="\/subscriptions"/);
assert.match(queryClient, /PERSISTED_QUERIES[\s\S]*my-app-access/);

const planner = load('src/lib/logistics.ts', {
  'expo-linking': {}, 'react-native': { Platform: { OS: 'android' } },
  '@/lib/query-storage': {}, '@/lib/supabase': {},
});
const origin = { latitude: 9.9326, longitude: -84.0805 };
const destinations = [
  { id: 'near-free', name: 'Museo cercano', province: 'San José', category: 'Cultura', latitude: 9.94, longitude: -84.08, price_national_crc: 0 },
  { id: 'nature', name: 'Reserva natural', province: 'Heredia', category: 'Naturaleza', latitude: 10.01, longitude: -84.1, price_national_crc: 4000 },
  { id: 'far', name: 'Playa lejana', province: 'Guanacaste', category: 'Playa', latitude: 10.5, longitude: -85.6, price_national_crc: 3000 },
  { id: 'unknown-price', name: 'Galería nueva', province: 'San José', category: 'Cultura', latitude: 9.935, longitude: -84.075, price_national_crc: null },
].map((item) => ({ ...item, price_foreigner_usd: item.price_national_crc === null ? null : 20, has_high_tides_risk: false, cover_image_url: null, difficulty: null, description: null, schedule: null, closed_day: null, requires_sinac_booking: false, sinac_booking_url: null }));
for (const input of [
  { ...origin, availableHours: 3, maxBudget: 10000, travelers: 1, vehicle: 'sedan', categories: [], language: 'es' },
  { ...origin, availableHours: 8, maxBudget: 50000, travelers: 2, vehicle: '4x4', categories: ['Naturaleza'], language: 'es' },
  { ...origin, availableHours: 12, maxBudget: 100000, travelers: 3, vehicle: 'bus', categories: [], language: 'en' },
]) {
  const plan = planner.buildOfflineTripPlan(input, destinations);
  assert.ok(plan?.stops.length, 'Each realistic combination produces a route');
  assert.ok(plan.estimatedTotalCrc <= input.maxBudget, 'Meals and admissions stay within budget');
  assert.ok(new Date(plan.endsAt) - new Date(plan.startsAt) <= input.availableHours * 3600000, 'Travel, visits, and return stay within available time');
  assert.equal(plan.travelTimeSource, 'estimated');
}
const monday = new Date('2026-09-14T08:00:00-06:00').toISOString();
assert.equal(planner.isClosedOn({ closed_day: 'Lunes' }, monday), true);
assert.equal(planner.isClosedOn({ closed_day: 'Martes' }, monday), false);
const foreignPlan = planner.buildOfflineTripPlan({ ...origin, availableHours: 4, maxBudget: 50000, travelers: 1, vehicle: 'sedan', categories: [], language: 'en', startsAt: monday, visitorType: 'foreigner', exchangeRate: 500 }, destinations.filter((item) => item.id === 'near-free'));
assert.equal(foreignPlan.stops[0].estimatedCostCrc, 10000, 'Foreign admission is converted from USD independently of language');
assert.match(optionsSource, /getAppOptions\("destination_category"\)/);
assert.match(optionsSource, /categories\.filter\(\(option\) => option\.parent_id === null\)/);
assert.match(exploreSource, /categories\.length > 3/);
assert.match(exploreSource, /value\.length === 3/);
console.log('Planner builds one accessible, actionable, offline-capable day plan.');
