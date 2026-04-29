#!/usr/bin/env node
// asserts that o1js, @o1js/native, and the o1js-internal.native-version field
// all have the same version. fails with a non-zero exit code on drift.
//
// per-platform packages (@o1js/native-darwin-arm64 etc.) inherit the version
// from o1js-internal.native-version via prepublish-native-package.ts, so
// keeping the three values aligned keeps the whole @o1js/* family aligned.

import { readFileSync } from 'node:fs';

let pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

let rootVersion = pkg.version;
let nativeVersion = pkg['o1js-internal']?.['native-version'];
let optionalNative = pkg.optionalDependencies?.['@o1js/native'];

let mismatches = [];
if (nativeVersion !== rootVersion) {
  mismatches.push(`o1js-internal.native-version (${nativeVersion}) !== version (${rootVersion})`);
}
if (optionalNative !== rootVersion) {
  mismatches.push(
    `optionalDependencies["@o1js/native"] (${optionalNative}) !== version (${rootVersion})`
  );
}

if (mismatches.length > 0) {
  console.error('version drift detected in package.json:');
  for (let m of mismatches) console.error(`  - ${m}`);
  console.error('\nrun `npm run sync:native-version` to fix.');
  process.exit(1);
}

console.log(`ok: o1js, @o1js/native, native-version all = ${rootVersion}`);
