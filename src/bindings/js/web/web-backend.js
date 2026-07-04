import o1jsWebSrc from 'string:../../../web_bindings/o1js_web.bc.js';
import { WithThreadPool, workers } from '../../../lib/proof-system/workers.js';
import { createFfiProxy } from './ffi-proxy.js';

export { initializeBindings, wasm, withThreadPool };

let wasm;

async function initializeBindings() {
  if (wasm !== undefined) return;

  // The wasm backend is the wasm32-wasip1-threads build of the kimchi-napi
  // crate — the same crate that powers the native backend on Node.
  //
  // Browser main threads cannot block (Atomics.wait traps), and JSOO calls
  // the FFI synchronously, so there are two modes:
  //
  // - worker-hosted (default, needs SharedArrayBuffer i.e. COOP/COEP
  //   headers): the module lives in a dedicated Web Worker where blocking is
  //   allowed, so rayon gets a real thread pool and proving is parallel.
  //   Calls are proxied over a handle-table RPC; the main thread awaits each
  //   result by spinning on a SharedArrayBuffer flag (see ffi-proxy.js).
  //
  // - main-thread fallback (no cross-origin isolation): instantiate the
  //   module here with thread spawning disabled and rayon pinned to the
  //   current thread — everything works, but proving is single-threaded.
  if (typeof SharedArrayBuffer !== 'undefined' && globalThis.crossOriginIsolated) {
    let threads =
      workers.numWorkers ?? Math.max(1, (globalThis.navigator?.hardwareConcurrency ?? 4) - 1);
    let url = new URL('./web_bindings/ffi-worker-host.js', import.meta.url);
    wasm = await createFfiProxy(url, threads);
  } else {
    console.warn(
      'o1js: page is not cross-origin isolated (COOP/COEP headers missing) — ' +
        'falling back to single-threaded proving on the main thread.'
    );
    let kimchiNapi = await import('../../../web_bindings/kimchi_napi.wasi-browser.js');
    wasm = kimchiNapi.default ?? kimchiNapi;
    // pin rayon to this thread before the first rayon call — see
    // wasm-runtime-no-threads.js for why the pool must not spawn
    wasm.camlRayonInitSingleThreaded();
  }

  // Both backends expose the napi object model, so they share the TS
  // conversion layer (src/bindings/crypto/native/).
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
