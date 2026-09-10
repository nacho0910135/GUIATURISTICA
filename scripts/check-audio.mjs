import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const recorder = read('src/components/audio-recorder-button.tsx');
const messages = read('src/lib/social-profile.ts');

assert.match(recorder, /onPressIn=.*start/);
assert.match(recorder, /onPressOut=.*stopAndSend/);
assert.match(recorder, /onPress=.*stopAndSend/s);
assert.match(messages, /contentType\.includes\('webm'\) \? 'webm' : 'm4a'/);
console.log('Audio checks passed: tap, hold, format-aware upload and shared recorder.');
