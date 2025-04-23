import plonkWasm from '../../../web_bindings/plonk_wasm.js';
import { workerSpec } from './worker-spec.js';
import {
  srcFromFunctionModule,
  inlineWorker,
  waitForMessage,
} from './worker-helpers.js';
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

async function initializeBindings() {
  wasm = plonkWasm();
  globalThis.plonk_wasm = wasm;
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
      overrideBindings(globalThis.plonk_wasm, worker);
      resolve(worker);
    }, 0);
  });
}

async function initThreadPool() {
  if (workerPromise === undefined)
    throw Error('need to initialize worker first');
  let worker = await workerPromise;
  numWorkers ??= Math.max(
    1,
    workers.numWorkers ?? (navigator.hardwareConcurrency ?? 1) - 1
  );
  await workerCall(worker, 'initThreadPool', numWorkers);
}

async function exitThreadPool() {
  if (workerPromise === undefined)
    throw Error('need to initialize worker first');
  let worker = await workerPromise;
  await workerCall(worker, 'exitThreadPool');
}

const withThreadPool = WithThreadPool({ initThreadPool, exitThreadPool });

async function mainWorker() {
  const wasm = plonkWasm();
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
        // Class info got lost on transfer, rebuild it.
        resArgs[i] = specArg.__wrap(args[i].__wbg_ptr);
      } else {
        resArgs[i] = args[i];
      }
    }
    let res = wasm[name].apply(wasm, resArgs);
    if (functionSpec.res && functionSpec.res.__wrap) {
      res = res.__wbg_ptr;
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
mainWorker.deps = [
  plonkWasm,
  workerSpec,
  workerExport,
  onMessage,
  waitForMessage,
];

function overrideBindings(plonk_wasm, worker) {
  let spec = workerSpec(plonk_wasm);
  for (let key in spec) {
    plonk_wasm[key] = (...args) => {
      if (spec[key].disabled)
        throw Error(`Wasm method '${key}' is disabled on the web.`);
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
      let result = await exportObject[key](data.message);
      postMessage({ type: data.id, result });
    });
  }
}

async function workerCall(worker, type, message) {
  let id = Math.random();
  let promise = waitForMessage(worker, id);
  worker.postMessage({ type, id, message });
  return (await promise).result;
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
