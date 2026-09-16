import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const layout = read('src/app/_layout.tsx');
const auth = read('src/app/(aux)/auth-modal.tsx');
const access = read('src/components/subscription-required.tsx');
const community = read('src/app/(tabs)/friends.tsx');
const explore = read('src/app/(tabs)/explore.tsx');
const logistics = read('src/app/(tabs)/logistics.tsx');
const myTrip = read('src/app/(tabs)/my-trip.tsx');

assert.doesNotMatch(layout, /GuestRegistrationPrompt/);
assert.match(access, /Debes registrarte para usar esta función/);
assert.match(access, /guest \? \{ pathname: '\/\(aux\)\/auth-modal'/);
assert.match(auth, /requestedMode === 'signup' \? 'signup' : 'signin'/);
assert.match(myTrip, /if \(session && access\.data\?\.hasAccess === false\)/);
assert.match(myTrip, /requireAuth\(isSpanish \? 'crear tu ruta'/);
assert.match(logistics, /if \(session && access\.isPending\)/);
assert.match(logistics, /requireAuth\(language === 'es' \? 'ver los buses turísticos'/);
assert.match(explore, /requireAuth\(language === 'es' \? 'ver destinos turísticos cercanos'/);
assert.match(community, /const writeLocked = Boolean\(session && !paidAccess\.hasPaidAccess\)/);
assert.match(community, /!requireAuth\(language === 'es' \? 'Crear una publicación'/);
console.log('Guests can browse and authentication opens only when they attempt a protected action.');
