import fs from 'node:fs/promises';

const file = process.argv[2];

let src = await fs.readFile(file, 'utf8');

// Fix 1: Replace the old-style env import pattern (wasm-bindgen <0.2.113)
src = src.replace(
  "imports['env'] = require('env');",
  `
let { isMainThread, workerData } = require('worker_threads');

let env = {};
if (isMainThread) {
  env.memory = new WebAssembly.Memory({
    initial: 20n,
    maximum: 262144n,
    shared: true,
    address: "i64",
  });
} else {
  env.memory = workerData.memory;
}

imports['env'] = env;
`
);

// Fix 2: Patch the inline memory creation in __wbg_get_imports() to use memory64.
// wasm-bindgen 0.2.113+ generates: memory || new WebAssembly.Memory({initial:N,maximum:M,shared:true})
// We need to add address:"i64" and use BigInt for initial/maximum.
// NOTE: The maximum is baked into the wasm binary (via --max-memory linker flag).
// The JS Memory maximum must match the wasm module's declared maximum.
src = src.replace(
  /new WebAssembly\.Memory\(\{initial:(\d+),maximum:(\d+),shared:true\}\)/g,
  (match, initial, maximum) =>
    `new WebAssembly.Memory({initial:${initial}n,maximum:${maximum}n,shared:true,address:"i64"})`
);

// Fix 3: The __wbindgen_start function takes a stack_size parameter (i64 in memory64).
// When thread_stack_size is undefined (default), pass 0n instead.
src = src.replace(
  /wasm\.__wbindgen_start\(thread_stack_size\)/,
  `wasm.__wbindgen_start(thread_stack_size != null ? BigInt(thread_stack_size) : 0n)`
);

// Fix 4: __wbg_*_free(BigInt(ptr), 0n/1n) — the second parameter is u32 (i32 in wasm),
// not usize, so it must be a regular number. wasm-bindgen memory64 incorrectly emits BigInt literals.
src = src.replace(
  /_free\(BigInt\(ptr\), (\d+)n\)/g,
  (match, val) => `_free(BigInt(ptr), ${val})`
);

// Fix 5: Disable wasm-bindgen 0.2.113's built-in FinalizationRegistries.
// The codebase already has its own FinalizationRegistry cleanup in util.js
// (free_finalization_registry). Having both causes double-frees.
// Replace all `new FinalizationRegistry(ptr => wasm.__wbg_*_free(...))` with no-ops.
src = src.replace(
  /new FinalizationRegistry\(ptr => wasm\.__wbg_\w+_free\(BigInt\(ptr\), \d+\)\)/g,
  '{ register: () => {}, unregister: () => {} }'
);

// Fix 6: wasm-bindgen 0.2.113 added borrow tracking — .free() passes 0 as second arg
// which triggers a borrow check that didn't exist in 0.2.89. Since the existing codebase
// (util.js free_finalization_registry) calls .free() during GC when borrows may still
// be active, change all manual .free() calls to pass 1 (force-free, skip borrow check).
src = src.replace(
  /_free\(BigInt\(ptr\), 0\)/g,
  '_free(BigInt(ptr), 1)'
);

// Fix 7: Null pointer checks use `ret === 0` but in memory64 wasm returns BigInt `0n`.
// `0n === 0` is false in JS (strict equality). Use `== 0` which handles both.
src = src.replace(
  /ret === 0 \? undefined/g,
  'ret == 0 ? undefined'
);

// Fix 8: In memory64, wasm functions returning isize/usize produce BigInt in JS,
// but OCaml-compiled code (jsoo) expects regular numbers. Functions annotated with
// @returns {number} or @returns {GateType} that do bare `return ret;` need Number() conversion.
// We track @returns annotations and reset when a new un-annotated function starts.
// Only convert at indentation <= 8 spaces (exported functions & class methods),
// NOT the deeply-nested import callbacks in __wbg_get_imports.
{
  const lines = src.split('\n');
  const numberReturnTypes = new Set(['number', 'GateType', 'bigint']);
  let lastReturnsType = null;
  let linesSinceReturns = Infinity;

  for (let i = 0; i < lines.length; i++) {
    linesSinceReturns++;
    const returnsMatch = lines[i].match(/@returns\s*\{(\w+)\}/);
    if (returnsMatch) {
      lastReturnsType = returnsMatch[1];
      linesSinceReturns = 0;
    }
    // Only convert if: annotated recently, is a bare return ret, and not deeply nested
    const trimmed = lines[i].trimStart();
    const indent = lines[i].length - trimmed.length;
    if (trimmed === 'return ret;' && numberReturnTypes.has(lastReturnsType) &&
        linesSinceReturns < 20 && indent <= 8) {
      lines[i] = lines[i].replace('return ret;', 'return Number(ret);');
      lastReturnsType = null;
    }
  }
  src = lines.join('\n');
}

await fs.writeFile(file, src, 'utf8');
