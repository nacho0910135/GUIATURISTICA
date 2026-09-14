import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('app.json');
const provider = read('src/providers/app-provider.tsx');
const tabs = read('src/app/(tabs)/_layout.tsx');
const subscriptions = read('src/app/subscriptions.tsx');
const checkout = read('supabase/functions/create-checkout-session/index.ts');
const portal = read('supabase/functions/create-customer-portal/index.ts');
const checklist = read('docs/google-play-production-checklist.md');
const authConfig = read('supabase/config.toml');
const zeroTrust = read('supabase/migrations/20260830120057_zero_trust_hardening.sql');

assert.match(app, /blockedPermissions[\s\S]*android\.permission\.SYSTEM_ALERT_WINDOW/);
assert.doesNotMatch(provider, /requestStartupLocation/);
assert.doesNotMatch(tabs, /tabPress:[\s\S]{0,100}refreshUserLocation/);
assert.match(subscriptions, /subscriptions\.isError[\s\S]*subscriptions\.refetch/);
assert.match(provider, /authRestoreError[\s\S]*Continuar sin sesión/);
assert.match(checkout, /url\.protocol === "https:" && url\.origin === webOrigin/);
const returnUrlGuard = checkout.match(/function isAllowedReturnUrl[\s\S]*?\n}/)?.[0] ?? '';
assert.doesNotMatch(returnUrlGuard, /url\.protocol === "http:"|url\.protocol === "exp:"/);
assert.match(portal, /url\.protocol === "https:" && url\.origin === new URL\(appUrl\)\.origin/);
assert.match(checklist, /device push token/);
assert.match(zeroTrust, /revoke update on table public\.traveler_messages from authenticated;[\s\S]*grant update \(read_status\) on table public\.traveler_messages to authenticated;/);
assert.match(authConfig, /minimum_password_length = 8/);
assert.match(authConfig, /enable_confirmations = true/);
assert.match(authConfig, /secure_password_change = true/);

console.log('Audit remediations are guarded.');
