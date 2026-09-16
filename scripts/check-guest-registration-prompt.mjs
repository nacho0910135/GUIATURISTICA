import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const prompt = read('src/components/guest-registration-prompt.tsx');
const layout = read('src/app/_layout.tsx');
const auth = read('src/app/(aux)/auth-modal.tsx');

assert.match(prompt, /else if \(authReady\) setVisible\(true\)/);
assert.match(prompt, /Regístrate para desbloquear todas las funcionalidades/);
assert.match(prompt, /Regístrame/);
assert.match(prompt, /Ahora no/);
assert.match(prompt, /params: \{ mode: 'signup' \}/);
assert.match(layout, /<GuestRegistrationPrompt \/>/);
assert.match(auth, /requestedMode === 'signup' \? 'signup' : 'signin'/);
console.log('Guest registration prompt and signup route are guarded.');
