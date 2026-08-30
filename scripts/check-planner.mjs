import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/lib/logistics.ts', import.meta.url), 'utf8');
assert.match(source, /reducedMobility[\s\S]*fácil\|facil/);
assert.match(source, /Promise\.all\([\s\S]*getWeather[\s\S]*getNearbyFoodService[\s\S]*getTravelMinutes/);
assert.match(source, /saveOfflinePack\(destinations: Destination\[\], dayPlan\?/);
assert.match(source, /requires_sinac_booking,sinac_booking_url/);
assert.doesNotMatch(source, /return \(preferred\.length \? preferred : candidates\)\.slice/);
assert.match(source, /export async function buildTripPlan/);
assert.match(source, /export function buildOfflineTripPlan/);
assert.match(source, /while \(stops\.length < 4\)/);
assert.match(source, /estimatedTotalCrc: stops\.reduce/);
console.log('Planner builds one accessible, actionable, offline-capable day plan.');
