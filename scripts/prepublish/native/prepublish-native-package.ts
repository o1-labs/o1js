import minimist from 'minimist';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import semver from 'semver';

const {
  write,
  _: [packagePath, basePackagePath],
} = minimist(process.argv.slice(3), {
  boolean: 'write',
});

const basePackageJsonPath = join(basePackagePath, 'package.json');
const basePkgJson = await readFile(basePackageJsonPath, 'utf8').then(JSON.parse);
const o1jsInternalCfg = basePkgJson['o1js-internal'];
const nativeVersionIn = o1jsInternalCfg['native-version'];

const nativeVersion = semver.valid(nativeVersionIn);
if (nativeVersion === null) {
  console.error(`${nativeVersionIn} is not valid semver`);
  process.exit(1);
}

const packageJsonPath = join(packagePath, 'package.json');
const pkgJson = await readFile(packageJsonPath, 'utf8').then(JSON.parse);

pkgJson.version = nativeVersion;

// strip optionalDependencies
// update versions to match the native version
if (pkgJson.optionalDependencies) {
  for (const dep of Object.keys(pkgJson.optionalDependencies)) {
    pkgJson.optionalDependencies[dep] = nativeVersion;
  }
}

if (write) {
  await writeFile(packageJsonPath, JSON.stringify(pkgJson, null, 2));
} else {
  console.log(pkgJson);
  console.log('dry run, use --write to commit file.');
}
