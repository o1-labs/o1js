#!/usr/bin/env node
// asserts that o1js, @o1js/native, and the o1js-internal.native-version field
// all have the same version. fails with a non-zero exit code on drift.
//
// per-platform packages (@o1js/native-darwin-arm64 etc.) inherit the version
// from o1js-internal.native-version via prepublish-native-package.ts, so
// keeping the three values aligned keeps the whole @o1js/* family aligned.

import { readFileSync } from 'node:fs';

const nativePackages = [
  ['@o1js/native-darwin-arm64', { cpu: ['arm64'], os: ['darwin'] }],
  ['@o1js/native-darwin-x64', { cpu: ['x64'], os: ['darwin'] }],
  ['@o1js/native-linux-arm64', { cpu: ['arm64'], os: ['linux'] }],
  ['@o1js/native-linux-x64', { cpu: ['x64'], os: ['linux'] }],
];

let pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
let lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));

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
if (lock.version !== rootVersion) {
  mismatches.push(`package-lock.json version (${lock.version}) !== version (${rootVersion})`);
}
if (lock.packages?.['']?.version !== rootVersion) {
  mismatches.push(
    `package-lock packages[""].version (${lock.packages?.['']?.version}) !== version (${rootVersion})`
  );
}
if (lock.packages?.['']?.optionalDependencies?.['@o1js/native'] !== rootVersion) {
  mismatches.push(
    `package-lock packages[""].optionalDependencies["@o1js/native"] (${lock.packages?.['']?.optionalDependencies?.['@o1js/native']}) !== version (${rootVersion})`
  );
}

let nativeLock = lock.packages?.['node_modules/@o1js/native'];
if (nativeLock?.version !== rootVersion) {
  mismatches.push(
    `package-lock node_modules/@o1js/native version (${nativeLock?.version}) !== version (${rootVersion})`
  );
}
if (nativeLock?.optional !== true) {
  mismatches.push('package-lock node_modules/@o1js/native must be optional');
}
for (let [name, target] of nativePackages) {
  if (nativeLock?.optionalDependencies?.[name] !== rootVersion) {
    mismatches.push(
      `package-lock node_modules/@o1js/native optionalDependencies["${name}"] (${nativeLock?.optionalDependencies?.[name]}) !== version (${rootVersion})`
    );
  }

  let entry = lock.packages?.[`node_modules/${name}`];
  if (entry?.version !== rootVersion) {
    mismatches.push(
      `package-lock node_modules/${name} version (${entry?.version}) !== version (${rootVersion})`
    );
  }
  if (entry?.optional !== true) {
    mismatches.push(`package-lock node_modules/${name} must be optional`);
  }
  if (JSON.stringify(entry?.cpu) !== JSON.stringify(target.cpu)) {
    mismatches.push(
      `package-lock node_modules/${name} cpu (${JSON.stringify(entry?.cpu)}) !== ${JSON.stringify(target.cpu)}`
    );
  }
  if (JSON.stringify(entry?.os) !== JSON.stringify(target.os)) {
    mismatches.push(
      `package-lock node_modules/${name} os (${JSON.stringify(entry?.os)}) !== ${JSON.stringify(target.os)}`
    );
  }
}

if (mismatches.length > 0) {
  console.error('version drift detected in package.json/package-lock.json:');
  for (let m of mismatches) console.error(`  - ${m}`);
  console.error('\nrun `npm run sync:native-version` to fix.');
  process.exit(1);
}

console.log(`ok: o1js, @o1js/native, native-version, package-lock all = ${rootVersion}`);
