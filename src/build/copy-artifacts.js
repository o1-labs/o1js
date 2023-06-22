// copy compiled jsoo/wasm artifacts from a folder in the source tree to the folder where they are imported from
// (these are not the same folders so that we don't automatically pollute the source tree when rebuilding artifacts)
import { copyFromTo } from './utils.js';

await copyFromTo(
  ['src/bindings/compiled/node_bindings/'],
  'node_bindings',
  '_node_bindings'
);
