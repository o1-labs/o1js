import { createRequire } from 'node:module';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WithThreadPool, workers } from '../../../lib/proof-system/workers.js';

export { wasm, withThreadPool };

let url = import.meta.url;
let filename = url !== undefined ? fileURLToPath(url) : __filename;
const require = createRequire(filename);

// The 'wasm' backend is the wasm32-wasip1-threads build of the same kimchi-napi
// crate that powers the native backend. The generated .wasi.cjs loader
// (via @napi-rs/wasm-runtime) instantiates the module synchronously and spawns
// worker_threads on demand for Rust std::thread/rayon — no manual memory
// sharing or worker bootstrapping is needed here.
//
// Rayon reads its thread-pool size from the environment at first use, so it
// must be configured before any parallel binding call.
setRayonThreadCount();

const wasm = requireKimchiNapiWasm();

// Both backends expose the napi object model, so they share the TS conversion
// layer (src/bindings/crypto/native/).
wasm.__kimchi_backend = 'native';
wasm.__o1js_backend_preference = 'wasm';
if (typeof globalThis !== 'undefined') {
  globalThis.__o1js_backend_preference = 'wasm';
  // the compiled OCaml artifact (o1js_node.bc.cjs) picks up the FFI module here
  globalThis.__o1js_kimchi_ffi = wasm;
}

// The wasm runtime manages its own threads; nothing to set up or tear down.
const withThreadPool = WithThreadPool({
  initThreadPool: async () => {},
  exitThreadPool: async () => {},
});

function requireKimchiNapiWasm() {
  let modulePath = filename.endsWith('index.cjs')
    ? './bindings/compiled/node_bindings/kimchi_napi.wasi.cjs'
    : '../../compiled/node_bindings/kimchi_napi.wasi.cjs';
  return require(modulePath);
}

function setRayonThreadCount() {
  if (typeof process === 'undefined') return;
  if (process.env.RAYON_NUM_THREADS !== undefined) return;
  let numThreads = Math.max(1, workers.numWorkers ?? (os.availableParallelism?.() ?? 1) - 1);
  process.env.RAYON_NUM_THREADS = String(numThreads);
}
