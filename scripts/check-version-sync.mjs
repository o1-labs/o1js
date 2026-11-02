#!/usr/bin/env node
// asserts that the o1js version and the o1js-internal.native-version field
// are the same, and that `@o1js/native` is not pinned in the committed
// package.json. fails with a non-zero exit code on drift.
//
// per-platform packages (@o1js/native-darwin-arm64 etc.) inherit the version
// from o1js-internal.native-version via prepublish-native-package.ts, and
// the published o1js package.json gets its exact `@o1js/native` pin injected
// at publish time via prepublish-native.ts, so keeping native-version
// aligned keeps the whole @o1js/* family aligned.
//
// a committed `@o1js/native` pin is drift by definition: that version only
// exists on npm after the native release step runs, so pinning it here
// breaks `npm ci` (lock-file mismatch) after every version bump.

import { readFileSync } from 'node:fs';

let pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

let rootVersion = pkg.version;
let nativeVersion = pkg['o1js-internal']?.['native-version'];
let optionalNative = pkg.optionalDependencies?.['@o1js/native'];

let mismatches = [];
if (nativeVersion !== rootVersion) {
  mismatches.push(`o1js-internal.native-version (${nativeVersion}) !== version (${rootVersion})`);
}
if (optionalNative !== undefined) {
  mismatches.push(
    `optionalDependencies["@o1js/native"] is pinned to ${optionalNative} in package.json; ` +
      `it must not be committed (it is injected at publish time from native-version)`
  );
}

if (mismatches.length > 0) {
  console.error('version drift detected in package.json:');
  for (let m of mismatches) console.error(`  - ${m}`);
  console.error('\nrun `npm run sync:native-version` to fix.');
  process.exit(1);
}

console.log(`ok: o1js and native-version both = ${rootVersion}, @o1js/native not pinned`);
