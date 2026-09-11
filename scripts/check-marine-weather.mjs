import assert from 'node:assert/strict';
import { isDangerousMarineConditions as dangerous } from '../src/lib/marine-weather.ts';

assert.equal(dangerous(2, 0.5, 5), true);
assert.equal(dangerous(1, 1.5, 10), true);
assert.equal(dangerous(1, 1.5, 9), false);
console.log('Marine danger thresholds OK');
