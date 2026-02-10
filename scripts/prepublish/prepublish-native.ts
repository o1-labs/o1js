import minimist from 'minimist';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const {
  write,
  _: [packagePath],
} = minimist(process.argv.slice(3), {
  boolean: 'write',
});

const packageJsonPath = join(packagePath, 'package.json');

const pkgJson = await readFile(packageJsonPath, 'utf8').then(JSON.parse);

// remove optionalDependencies, might not need this at all tbd
delete pkgJson.optionalDependencies;

if (write) {
  await writeFile(packageJsonPath, JSON.stringify(pkgJson, null, 2));
} else {
  console.log(pkgJson);
  console.log('dry run, use --write to commit file.');
}
