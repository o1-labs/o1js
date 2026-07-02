import o1jsWebSrc from 'string:../../../web_bindings/o1js_web.bc.js';
import { WithThreadPool } from '../../../lib/proof-system/workers.js';
import * as kimchiNapi from '../../../web_bindings/kimchi_napi.wasi-browser.js';

export { initializeBindings, wasm, withThreadPool };

let wasm;

async function initializeBindings() {
  if (wasm !== undefined) return;

  // The wasm backend is the wasm32-wasip1-threads build of the kimchi-napi
  // crate — the same crate that powers the native backend on Node. The
  // generated .wasi-browser.js loader (via @napi-rs/wasm-runtime) instantiates
  // the module on this thread and spawns Web Workers on demand for Rust
  // std::thread. SharedArrayBuffer (COOP/COEP headers) is required, same as
  // with the previous wasm-bindgen backend.
  //
  // NOTE on threading: browser main threads cannot block, so rayon-parallel
  // sections that make the calling thread wait must not run on the main
  // thread with a multi-threaded pool. Until worker-hosted execution lands
  // (see PLAN.md, web Option B), the pool is limited to inline execution:
  // the bundled loader disables wasi thread spawning (see
  // wasm-runtime-no-threads.js) and rayon's global pool is pinned to the
  // current thread before the first rayon call.
  wasm = kimchiNapi.default ?? kimchiNapi;
  wasm.camlRayonInitSingleThreaded();
  wasm.__kimchi_backend = 'native';

  if (typeof globalThis !== 'undefined') {
    globalThis.__o1js_backend_preference = 'wasm';
    // the compiled OCaml artifact (o1js_web.bc.js) picks up the FFI module here
    globalThis.__o1js_kimchi_ffi = wasm;
  }

  // Evaluate the compiled OCaml artifact. It is included as a string and
  // eval'd because the js_of_ocaml output uses `(function(){return this}())`
  // to reach the global object, which breaks inside ES modules (strict mode).
  new Function(o1jsWebSrc)();
}

// The wasm runtime manages its own threads; nothing to set up or tear down.
const withThreadPool = WithThreadPool({
  initThreadPool: async () => {},
  exitThreadPool: async () => {},
});
