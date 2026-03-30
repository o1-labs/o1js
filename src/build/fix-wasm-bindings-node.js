import fs from 'node:fs/promises';

const file = process.argv[2];

let src = await fs.readFile(file, 'utf8');

// wasm-bindgen <= 0.2.99 pattern
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

// wasm-bindgen >= 0.2.100 pattern
src = src.replace(
  /imports\.wbg\s*=\s*\{\s*memory:\s*new WebAssembly\.Memory\((\{[\s\S]*?\})\)\s*\};/,
  `
let { isMainThread, workerData } = require('worker_threads');
let wbgMemory = isMainThread
  ? new WebAssembly.Memory($1)
  : workerData.memory;
imports.wbg = { memory: wbgMemory };
`
);

// Force wasm-bindgen thread stack size explicitly for node target.
// 1 MiB was the previous default before wasm-bindgen raised it to 2 MiB.
src = src.replace(
  'wasm.__wbindgen_start();',
  `
const __o1jsThreadStackSize = Number(process?.env?.O1JS_WASM_THREAD_STACK_SIZE ?? 1048576);
wasm.__wbindgen_start(__o1jsThreadStackSize);
`
);

await fs.writeFile(file, src, 'utf8');
