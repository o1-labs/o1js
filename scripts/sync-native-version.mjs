#!/usr/bin/env node
// rewrites package.json/package-lock.json so o1js-internal.native-version and
// optionalDependencies["@o1js/native"] match the root `version`.
// run after bumping the root version (e.g. npm version patch).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const nativePackages = [
  ['@o1js/native-darwin-arm64', { cpu: ['arm64'], os: ['darwin'] }],
  ['@o1js/native-darwin-x64', { cpu: ['x64'], os: ['darwin'] }],
  ['@o1js/native-linux-arm64', { cpu: ['arm64'], os: ['linux'] }],
  ['@o1js/native-linux-x64', { cpu: ['x64'], os: ['linux'] }],
];

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

let lockPath = new URL('../package-lock.json', import.meta.url);
if (existsSync(lockPath)) {
  let lockRaw = readFileSync(lockPath, 'utf8');
  let lock = JSON.parse(lockRaw);

  lock.version = rootVersion;
  lock.packages ??= {};

  let rootPackage = (lock.packages[''] ??= {});
  rootPackage.version = rootVersion;
  if (pkg.optionalDependencies?.['@o1js/native'] !== undefined) {
    rootPackage.optionalDependencies ??= {};
    rootPackage.optionalDependencies['@o1js/native'] = rootVersion;
  }

  lock.packages['node_modules/@o1js/native'] = {
    version: rootVersion,
    optional: true,
    optionalDependencies: Object.fromEntries(nativePackages.map(([name]) => [name, rootVersion])),
  };

  for (let [name, target] of nativePackages) {
    lock.packages[`node_modules/${name}`] = {
      version: rootVersion,
      cpu: target.cpu,
      optional: true,
      os: target.os,
    };
  }

  let trailing = lockRaw.endsWith('\n') ? '\n' : '';
  let nextLockRaw = JSON.stringify(lock, null, 2) + trailing;
  if (nextLockRaw !== lockRaw) {
    writeFileSync(lockPath, nextLockRaw);
    console.log(`synced package-lock native versions to ${rootVersion}`);
  }
}
