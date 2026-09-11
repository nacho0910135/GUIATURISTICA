import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const recorder = read('src/components/audio-recorder-button.tsx');
const player = read('src/components/traveler-message.tsx');
const privateMessages = read('src/app/(aux)/private-messages.tsx');
const profile = read('src/app/(tabs)/profile.tsx');
const travelerProfile = read('src/app/(aux)/traveler-profile.tsx');
const messages = read('src/lib/social-profile.ts');

assert.match(recorder, /onPressIn=.*start/);
assert.match(recorder, /onPressOut=.*stopAndSend/);
assert.match(recorder, /onPress=.*stopAndSend/s);
assert.match(recorder, /recorder\.getStatus\(\)\.durationMillis/);
assert.match(messages, /contentType\.includes\('webm'\) \? 'webm' : 'm4a'/);
assert.match(player, /downloadFirst: true/);
assert.match(player, /useAudioPlayer\(stableUrl/);
assert.match(player, /player\.loop = false/);
assert.match(privateMessages, /unread_count/);
assert.match(profile, /router\.push\('\/\(aux\)\/private-messages'/);
assert.match(travelerProfile, /partnerId: id/);
assert.match(travelerProfile, />\{text\('Enviar mensaje', 'Send message'\)\}<\/Text>/);
console.log('Message checks passed: full-screen route, unread badges, direct chat and buffered audio.');
