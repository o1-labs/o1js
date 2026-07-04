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

// TEMP CI diagnosis (remove): startup breadcrumbs, gated on O1JS_CI_DIAG
diag('requiring kimchi napi wasm loader');
const wasm = requireKimchiNapiWasm();
diag('kimchi napi wasm loader required');

function diag(msg) {
  if (typeof process === 'undefined' || !process.env.O1JS_CI_DIAG) return;
  try {
    require('node:fs').writeSync(2, `[o1js-diag] ${msg}\n`);
  } catch (_) {}
}

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
// note: do NOT pre-warm the pool via camlRayonSpawnPool here — its helper
// thread's spawn requests are serviced by the main thread's event loop, which
// compile immediately blocks with synchronous wasm calls → deadlock. rayon's
// inline build on first use works because the MAIN thread spawns workers,
// which node can do without pumping its own event loop.
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
  // wasm32 memory is capped at 4 GiB and per-thread proving memory adds up —
  // on many-core machines a full-width pool can exhaust the heap on
  // proof-heavy workloads past the point where extra threads help. measured
  // on a 12-core M4 (dynamic-call.unit-test, arkworks `parallel` features +
  // flat ffi encodings on): 2 threads 37s, 4 -> 23s, 8 -> 19s (stable, node
  // 22 and 24), 11 -> 19s. throughput plateaus by 8 while wider pools only
  // add memory pressure, so 8 is the sweet spot — identical to the old
  // cpus-1 default on <=8-core machines. setNumberOfWorkers() or
  // RAYON_NUM_THREADS override.
  let numThreads = Math.max(
    1,
    workers.numWorkers ?? Math.min(8, (os.availableParallelism?.() ?? 1) - 1)
  );
  process.env.RAYON_NUM_THREADS = String(numThreads);
}
