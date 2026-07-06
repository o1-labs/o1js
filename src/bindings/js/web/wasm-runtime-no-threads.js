// wrapper around @napi-rs/wasm-runtime for the browser MAIN thread.
//
// browser main threads cannot block (`Atomics.wait` / `memory.atomic.wait32`
// trap), but wasi thread spawning needs the spawning thread to block or yield
// before the worker can start, and rayon blocks the calling thread at every
// join point. so with real thread support, kimchi's first rayon call traps
// with "Atomics.wait cannot be called in this context".
//
// instead, we make `wasi::thread-spawn` fail with ENOSYS (52). rust std maps
// that to io::ErrorKind::Unsupported, which makes rayon-core's global-pool
// init fall back to a sequential pool on the current thread (see
// rayon-core/src/registry.rs, default_global_registry) — everything runs
// inline on the main thread, no blocking needed. this is "Option A" of the
// napi-wasm web design, see PLAN.md §3 Phase 2.
// the polyfill must run before @emnapi/runtime is evaluated (it captures
// `Buffer` at module load), hence the import order here
import './buffer-polyfill.js';

export * from '@napi-rs/wasm-runtime';
import {
  instantiateNapiModule as _instantiateNapiModule,
  instantiateNapiModuleSync as _instantiateNapiModuleSync,
} from '@napi-rs/wasm-runtime';

export { instantiateNapiModule, instantiateNapiModuleSync };

const ENOSYS = 52; // wasi preview1 errno

function disableThreadSpawn(options) {
  let userOverwrite = options.overwriteImports;
  return {
    ...options,
    overwriteImports(importObject) {
      if (typeof userOverwrite === 'function') {
        importObject = userOverwrite(importObject) ?? importObject;
      }
      importObject.wasi = { ...importObject.wasi, 'thread-spawn': () => -ENOSYS };
      return importObject;
    },
  };
}

function instantiateNapiModule(wasmInput, options) {
  return _instantiateNapiModule(wasmInput, disableThreadSpawn(options));
}

function instantiateNapiModuleSync(wasmInput, options) {
  return _instantiateNapiModuleSync(wasmInput, disableThreadSpawn(options));
}
