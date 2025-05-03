/**
 * copy-artifacts.js - Copy compiled WebAssembly artifacts between folders
 *
 * This script copies compiled jsoo/wasm artifacts from the source folder to the
 * target folder used for imports. This separation exists to prevent polluting
 * the source tree when rebuilding artifacts.
 *
 * Specifically, it copies files from:
 *   src/bindings/compiled/node_bindings/
 * to:
 *   src/bindings/compiled/_node_bindings/
 *
 * This is an important step in the build process, ensuring the correct bindings
 * are available for import when running o1js.
 */

import { copyFromTo } from './utils.js';

// Copy the compiled bindings to the import location
await copyFromTo(['src/bindings/compiled/node_bindings/'], 'node_bindings', '_node_bindings');
