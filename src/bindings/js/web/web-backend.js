import kimchiWasm from '../../../web_bindings/kimchi_wasm.js';
import { workerSpec } from './worker-spec.js';
import { srcFromFunctionModule, inlineWorker, waitForMessage } from './worker-helpers.js';
import o1jsWebSrc from 'string:../../../web_bindings/o1js_web.bc.js';
import { WithThreadPool, workers } from '../../../lib/proof-system/workers.js';

export { initializeBindings, withThreadPool, wasm };

let wasm;

/**
 * @type {Promise<Worker>}
 */
let workerPromise;
/**
 * @type {number | undefined}
 */
let numWorkers = undefined;
let wasmThreadPoolRunning = false;

async function initializeBindings() {
  wasm = kimchiWasm();
  globalThis.kimchi_wasm = wasm;
  let init = wasm.default;

  const memory = allocateWasmMemoryForUserAgent(navigator.userAgent);
  await init(undefined, memory);

  let module = init.__wbindgen_wasm_module;

  // we have two approaches to run the .bc.js code after its dependencies are ready, without fetching an additional script:

  // 1. wrap it inside a function and just include that function in the bundle
  // this could be nice and simple, but breaks because the .bc.js code uses `(function(){return this}())` to access `window`
  // (probably as a cross-platform way to get the global object before globalThis existed)
  // that obsolete hack doesn't work here because inside an ES module, this === undefined instead of this === window
  // it seems to work when we patch the source code (replace IIFEs with `window`)

  // 2. include the code as string and eval it:
  // (this works because it breaks out of strict mode)
  new Function(o1jsWebSrc)();

  workerPromise = new Promise((resolve) => {
    setTimeout(async () => {
      let worker = inlineWorker(srcFromFunctionModule(mainWorker));
      await workerCall(worker, 'start', { memory, module });
      overrideBindings(globalThis.kimchi_wasm, worker);
      resolve(worker);
    }, 0);
  });
}

async function initThreadPool() {
  if (workerPromise === undefined) throw Error('need to initialize worker first');
  if (wasmThreadPoolRunning) return;
  let worker = await workerPromise;
  numWorkers ??= Math.max(1, workers.numWorkers ?? (navigator.hardwareConcurrency ?? 1) - 1);
  await workerCall(worker, 'initThreadPool', numWorkers);
  wasmThreadPoolRunning = true;
}

async function exitThreadPool() {
  if (workerPromise === undefined) throw Error('need to initialize worker first');
  if (!wasmThreadPoolRunning) return;
  // Keep the pool alive across compile/prove calls.
  // Explicit teardown can deadlock on some runtime/toolchain combinations.
}

const withThreadPool = WithThreadPool({ initThreadPool, exitThreadPool });

async function mainWorker() {
  const wasm = kimchiWasm();
  let init = wasm.default;

  let spec = workerSpec(wasm);

  let isInitialized = false;
  let data = await waitForMessage(self, 'start');
  let { module, memory } = data.message;

  onMessage(self, 'run', ({ name, args, u32_ptr }) => {
    let functionSpec = spec[name];
    let specArgs = functionSpec.args;
    let resArgs = args;
    for (let i = 0, l = specArgs.length; i < l; i++) {
      let specArg = specArgs[i];
      if (specArg && specArg.__wrap) {
        // Reconstruct the class wrapper from the raw pointer.
        // IMPORTANT: Do NOT use specArg.__wrap() here — in wasm-bindgen
        // >= 0.2.100, __wrap() registers the object with a FinalizationRegistry.
        // When the worker GC collects these temporary wrappers, the finalizer
        // frees memory that the main thread still owns, causing use-after-free.
        // Instead, create a bare prototype wrapper that borrows the pointer.
        let obj = Object.create(specArg.prototype);
        obj.__wbg_ptr = args[i].__wbg_ptr;
        resArgs[i] = obj;
      } else {
        resArgs[i] = args[i];
      }
    }
    let res = wasm[name].apply(wasm, resArgs);
    if (functionSpec.res && functionSpec.res.__wrap) {
      // Transfer ownership of the result from the worker's wasm instance.
      // __destroy_into_raw() unregisters from the worker's FinalizationRegistry
      // and returns the raw pointer. Without this, the worker's GC would
      // eventually free the result while the main thread still holds it.
      res = typeof res.__destroy_into_raw === 'function'
        ? res.__destroy_into_raw()
        : res.__wbg_ptr;
    } else if (functionSpec.res && functionSpec.res.there) {
      res = functionSpec.res.there(res);
    }
    /* Here be undefined behavior dragons. */
    wasm.set_u32_ptr(u32_ptr, res);
    /*postMessage(res);*/
  });

  workerExport(self, {
    async initThreadPool(numWorkers) {
      if (!isInitialized) {
        isInitialized = true;
        await wasm.initThreadPool(numWorkers);
      }
    },
    async exitThreadPool() {
      if (isInitialized) {
        isInitialized = false;
        await wasm.exitThreadPool();
      }
    },
  });

  await init(module, memory);
  postMessage({ type: data.id });
}
mainWorker.deps = [kimchiWasm, workerSpec, workerExport, onMessage, waitForMessage];

function overrideBindings(kimchi_wasm, worker) {
  let spec = workerSpec(kimchi_wasm);
  for (let key in spec) {
    kimchi_wasm[key] = (...args) => {
      if (spec[key].disabled) throw Error(`Wasm method '${key}' is disabled on the web.`);
      let u32_ptr = wasm.create_zero_u32_ptr();
      worker.postMessage({
        type: 'run',
        message: { name: key, args, u32_ptr },
      });
      /* Here be undefined behavior dragons. */
      let res = wasm.wait_until_non_zero(u32_ptr);
      wasm.free_u32_ptr(u32_ptr);
      let res_spec = spec[key].res;
      if (res_spec && res_spec.__wrap) {
        return spec[key].res.__wrap(res);
      } else if (res_spec && res_spec.back) {
        return res_spec.back(res);
      } else {
        return res;
      }
    };
  }
}

// helpers for main thread <-> worker communication

function onMessage(worker, type, onMsg) {
  worker.addEventListener('message', function ({ data }) {
    if (data?.type !== type) return;
    onMsg(data.message);
  });
}

function workerExport(worker, exportObject) {
  for (let key in exportObject) {
    worker.addEventListener('message', async function ({ data }) {
      if (data?.type !== key) return;
      try {
        let result = await exportObject[key](data.message);
        postMessage({ type: data.id, result });
      } catch (error) {
        postMessage({ type: data.id, error: String(error?.stack ?? error) });
      }
    });
  }
}

async function workerCall(worker, type, message) {
  let id = Math.random();
  let promise = waitForMessage(worker, id);
  worker.postMessage({ type, id, message });
  let response = await promise;
  if (response.error) throw new Error(response.error);
  return response.result;
}

function allocateWasmMemoryForUserAgent(userAgent) {
  const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
  if (isIOSDevice) {
    return new WebAssembly.Memory({
      initial: 19,
      maximum: 16384, // 1 GiB
      shared: true,
    });
  } else {
    return new WebAssembly.Memory({
      initial: 19,
      maximum: 65536, // 4 GiB
      shared: true,
    });
  }
}
