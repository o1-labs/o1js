import minimist from 'minimist';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import semver from 'semver';

const {
  ['native-version']: nativeVersionIn,
  write,
  _: [packagePath],
} = minimist(process.argv.slice(3), {
  boolean: 'write',
});

const packageJsonPath = join(packagePath, 'package.json');

const nativeVersion = semver.valid(nativeVersionIn);
if (nativeVersion === null) {
  console.error(`${nativeVersionIn} is not valid semver`);
  process.exit(1);
}

const pkgJson = await readFile(packageJsonPath, 'utf8').then(JSON.parse);

pkgJson.version = nativeVersion;

if (write) {
  await writeFile(packageJsonPath, JSON.stringify(pkgJson, null, 2));
} else {
  console.log(pkgJson);
  console.log('dry run, use --write to commit file.');
}
