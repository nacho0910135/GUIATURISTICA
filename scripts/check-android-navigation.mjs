import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [build, config, manifest, root, tabs] = await Promise.all([
  readFile(new URL('./build-aab-local.ps1', import.meta.url), 'utf8'),
  readFile(new URL('../app.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/_layout.tsx', import.meta.url), 'utf8'),
]);

assert.equal(config.expo.android.predictiveBackGestureEnabled, true);
assert.match(manifest, /android:enableOnBackInvokedCallback="true"/);
assert.match(build, /enableOnBackInvokedCallback=.*true/);
assert.doesNotMatch(root, /BackHandler|hardwareBackPress|backToExplore/);
assert.match(tabs, /backBehavior=["']history["']/);
assert.match(tabs, /BackHandler\.addEventListener\('hardwareBackPress'/);
assert.match(tabs, /if \(router\.canGoBack\(\)\) return false;/);
assert.match(tabs, /if \(segments\[1\] !== 'explore'\) router\.replace\('\/\(tabs\)\/explore'\);[\s\S]*return true;/);
assert.match(tabs, /tabPress:[\s\S]*haptic\('selection'\)/);
assert.doesNotMatch(tabs, /tabPress:[\s\S]*haptic\('error'\)/);

console.log('Android Back follows navigation history and tab presses use one selection haptic.');
