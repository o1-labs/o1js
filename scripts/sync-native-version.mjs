#!/usr/bin/env node
// rewrites package.json so o1js-internal.native-version and
// optionalDependencies["@o1js/native"] match the root `version`.
// run after bumping the root version (e.g. npm version patch).

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
  if (pkg.optionalDependencies['@o1js/native'] !== rootVersion) {
    pkg.optionalDependencies['@o1js/native'] = rootVersion;
    changed = true;
  }
}

if (changed) {
  // preserve trailing newline if present
  let trailing = raw.endsWith('\n') ? '\n' : '';
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + trailing);
  console.log(`synced native versions to ${rootVersion}`);
} else {
  console.log(`already in sync at ${rootVersion}`);
}
