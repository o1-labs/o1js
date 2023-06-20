// copy some files from /src to /dist/node that tsc doesn't copy because
// we have .d.ts files for them
import fse from 'fs-extra';

let files = ['src/snarky.d.ts', 'src/bindings/compiled/_node_bindings'];

await copyToDist(files);

async function copyToDist(files) {
  let promises = [];
  for (let source of files) {
    let target = source.replace('src/', 'dist/node/');
    promises.push(
      fse.copy(source, target, {
        recursive: true,
        overwrite: true,
        dereference: true,
      })
    );
  }
  await Promise.all(promises);
}
