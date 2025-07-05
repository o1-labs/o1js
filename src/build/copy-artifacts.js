// copy compiled jsoo/wasm artifacts from a folder in the source tree to the folder where they are imported from
// (these are not the same folders so that we don't automatically pollute the source tree when rebuilding artifacts)
import { copyFromTo } from './utils.js';

await copyFromTo(['src/bindings/compiled/node_bindings/'], 'node_bindings', '_node_bindings');

// Copy sparky files with correct CommonJS format
import fse from 'fs-extra';
await fse.copy('src/bindings/compiled/sparky_node/sparky_wasm.cjs', 'src/bindings/compiled/_node_bindings/sparky_wasm.cjs', { overwrite: true });
await fse.copy('src/bindings/compiled/sparky_node/sparky_wasm_bg.wasm', 'src/bindings/compiled/_node_bindings/sparky_wasm_bg.wasm', { overwrite: true });
