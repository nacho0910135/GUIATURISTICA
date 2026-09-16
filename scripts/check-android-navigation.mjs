import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [build, config, explore, manifest, root, tabs] = await Promise.all([
  readFile(new URL('./build-aab-local.ps1', import.meta.url), 'utf8'),
  readFile(new URL('../app.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../src/app/(tabs)/explore.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/_layout.tsx', import.meta.url), 'utf8'),
]);

assert.equal(config.expo.android.predictiveBackGestureEnabled, false);
assert.match(manifest, /android:enableOnBackInvokedCallback="false"/);
assert.match(build, /enableOnBackInvokedCallback=.*false/);
assert.doesNotMatch(root, /BackHandler|hardwareBackPress|backToExplore/);
assert.match(tabs, /backBehavior=["']history["']/);
assert.doesNotMatch(tabs, /BackHandler|hardwareBackPress/);
assert.match(explore, /useFocusEffect\([\s\S]*BackHandler\.addEventListener\('hardwareBackPress'[\s\S]*return true;/);
assert.match(tabs, /tabPress:[\s\S]*haptic\('selection'\)/);
assert.doesNotMatch(tabs, /tabPress:[\s\S]*haptic\('error'\)/);

console.log('Android Back follows navigation history and tab presses use one selection haptic.');
