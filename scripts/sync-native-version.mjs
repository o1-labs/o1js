#!/usr/bin/env node
// rewrites package.json so o1js-internal.native-version matches the root
// `version`, and removes any committed `@o1js/native` entry from
// optionalDependencies. run after bumping the root version
// (e.g. npm version patch).
//
// `@o1js/native` must NOT be pinned in the committed package.json: the exact
// version only exists on npm after the native packages are published during
// the release itself, so a committed pin makes `npm ci` fail
// (lock-file mismatch) after every version bump until someone refreshes the
// lockfile by hand. Instead, the exact pin is injected into the published
// package.json at publish time by scripts/prepublish/prepublish-native.ts.

import { readFileSync, writeFileSync } from 'node:fs';

let pkgPath = new URL('../package.json', import.meta.url);
let raw = readFileSync(pkgPath, 'utf8');
let pkg = JSON.parse(raw);

let rootVersion = pkg.version;
let changed = false;

if (pkg['o1js-internal']?.['native-version'] !== rootVersion) {
  pkg['o1js-internal'] ??= {};
  pkg['o1js-internal']['native-version'] = rootVersion;
  changed = true;
}
if (pkg.optionalDependencies?.['@o1js/native'] !== undefined) {
  delete pkg.optionalDependencies['@o1js/native'];
  if (Object.keys(pkg.optionalDependencies).length === 0) {
    delete pkg.optionalDependencies;
  }
  changed = true;
}

if (changed) {
  // preserve trailing newline if present
  let trailing = raw.endsWith('\n') ? '\n' : '';
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + trailing);
  console.log(`synced native version to ${rootVersion}`);
} else {
  console.log(`already in sync at ${rootVersion}`);
}
