import minimist from 'minimist';
import { readFile, writeFile } from 'node:fs/promises';
import semver from 'semver';

const nativeTargets = [
  { platform: 'darwin', arch: 'arm64' },
  { platform: 'darwin', arch: 'x64' },
  { platform: 'linux', arch: 'arm64' },
  { platform: 'win32', arch: 'x64' },
];
function targetToSlug(target: { platform: string; arch: string }) {
  return `@o1js/native-${target.platform}-${target.arch}`;
}

const {
  ['native-version']: nativeVersionIn,
  write,
  _: [packageJsonPath],
} = minimist(process.argv.slice(3), {
  boolean: 'write',
});

console.log(packageJsonPath);

const nativeVersion = semver.valid(nativeVersionIn);
if (nativeVersion === null) {
  console.error(`${nativeVersionIn} is not valid semver`);
  process.exit(1);
}

const pkgJson = await readFile(packageJsonPath, 'utf8').then(JSON.parse);

const explicitVersion = `^${nativeVersion}`;
for (const target of nativeTargets) {
  const slug = targetToSlug(target);

  if (slug in pkgJson.optionalDependencies) {
    pkgJson.optionalDependencies[slug] = explicitVersion;
  }
}

if (write) {
  await writeFile(packageJsonPath, JSON.stringify(pkgJson));
}
