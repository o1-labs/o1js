/**
 * fix-wasm-bindings-node.js - Modifies compiled WebAssembly bindings for Node.js
 *
 * This script fixes an issue with WASM files by replacing the environment setup code
 * with a version that works properly with Node.js worker threads. Specifically, it:
 *
 * 1. Replaces the environment import that would require the 'env' module
 * 2. Sets up a shared WebAssembly memory across worker threads
 * 3. Configures the environment differently for main thread vs worker threads
 *
 * Usage: node fix-wasm-bindings-node.js <path-to-wasm-js-file>
 *
 * This script is typically run after compiling WASM bindings but before using them,
 * as part of the build process.
 */

import fs from 'node:fs/promises';

// Get the target file path from command line arguments
const file = process.argv[2];

if (!file) {
  console.error('Error: No file specified');
  console.error('Usage: node fix-wasm-bindings-node.js <path-to-wasm-js-file>');
  process.exit(1);
}

// Read the file
let src = await fs.readFile(file, 'utf8');

// Replace the environment setup code with one that works with worker threads
src = src.replace(
  "imports['env'] = require('env');",
  `
let { isMainThread, workerData } = require('worker_threads');

let env = {};
if (isMainThread) {
  env.memory = new WebAssembly.Memory({
    initial: 20,
    maximum: 65536,
    shared: true,
  });
} else {
  env.memory = workerData.memory;
}

imports['env'] = env;
`
);

// Write the modified file back
await fs.writeFile(file, src, 'utf8');
console.log(`Successfully fixed WASM bindings in ${file}`);
