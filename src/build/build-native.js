import fse, { move } from 'fs-extra';

// copy over over files to dist
await copy({
  './src/bindings/compiled/node_bindings/plonk_native.node':
    './dist/node/node_bindings/plonk_native.node',
});

async function copy(copyMap) {
  let promises = [];
  for (let [source, target] of Object.entries(copyMap)) {
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
