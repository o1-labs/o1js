// copy compiled jsoo/wasm artifacts from a folder in the source tree to the folder where they are imported from
// (these are not the same folders so that we don't automatically pollute the source tree when rebuilding artifacts)
import { copyFromTo } from './utils.js';

await copyFromTo(['src/bindings/compiled/node_bindings/'], 'node_bindings', '_node_bindings');

// Copy Sparky WASM artifacts if they exist
await copyFromTo(['src/bindings/compiled/sparky_node/'], 'sparky_node', 'sparky_node').catch(() => {
  console.log('Sparky node bindings not found, skipping...');
});

await copyFromTo(['src/bindings/compiled/sparky_web/'], 'sparky_web', 'sparky_web').catch(() => {
  console.log('Sparky web bindings not found, skipping...');
});