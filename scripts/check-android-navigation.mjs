import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [build, config, manifest, backToExplore, root, tabs] = await Promise.all([
  readFile(new URL('./build-aab-local.ps1', import.meta.url), 'utf8'),
  readFile(new URL('../app.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8'),
  readFile(new URL('../src/hooks/use-back-to-explore.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/_layout.tsx', import.meta.url), 'utf8'),
]);

assert.equal(config.expo.android.predictiveBackGestureEnabled, false);
assert.match(manifest, /android:enableOnBackInvokedCallback="false"/);
assert.match(build, /enableOnBackInvokedCallback=.*false/);
assert.match(backToExplore, /router\.replace\('\/\(tabs\)\/explore'\)/);
assert.match(root, /BackHandler\.addEventListener\('hardwareBackPress'/);
assert.match(root, /backToExplore\(\)/);
assert.match(root, /return true/);
assert.match(tabs, /tabPress:[\s\S]*haptic\('selection'\)/);
assert.doesNotMatch(tabs, /tabPress:[\s\S]*haptic\('error'\)/);

console.log('Android Back stays in Explorar and tab presses use one selection haptic.');
