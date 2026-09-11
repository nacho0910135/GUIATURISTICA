import assert from 'node:assert/strict';
import { isDangerousMarineConditions as dangerous } from '../src/lib/marine-weather.ts';
import { readFileSync } from 'node:fs';

assert.equal(dangerous(2, 0.5, 5), true);
assert.equal(dangerous(1, 1.5, 10), true);
assert.equal(dangerous(1, 1.5, 9), false);
const source = readFileSync(new URL('../src/lib/marine-weather.ts', import.meta.url), 'utf8');
assert.match(source, /https:\/\/marine-api\.open-meteo\.com\/v1\/marine/);
assert.doesNotMatch(source, /OPEN_METEO_API_KEY|apikey|customer-marine-api/);
assert.match(source, /'wave_height', 'wave_direction', 'wave_period'/);
console.log('Marine danger thresholds OK');
