import o1jsWebSrc from 'string:../../../web_bindings/o1js_web.bc.js';
import { WithThreadPool, workers } from '../../../lib/proof-system/workers.js';
import kimchiWasm from '../../../web_bindings/kimchi_wasm.js';
import { inlineWorker, srcFromFunctionModule, waitForMessage } from './worker-helpers.js';
import {
  cancelWorkerRpcRequest,
  cleanupWorkerArguments,
  commitMainThreadMoves,
  createWorkerRpcControl,
  decodeMainThreadResult,
  decodeWorkerArguments,
  encodeMainThreadArguments,
  markWorkerRpcReady,
  prepareWorkerRpcRequest,
  transferWorkerResult,
  waitForWorkerRpcReady,
  waitForWorkerRpcResult,
  writeWorkerRpcError,
  writeWorkerRpcErrorIfPending,
  writeWorkerRpcSuccess,
} from './worker-rpc.js';
import { workerSpec } from './worker-spec.js';

export { initializeBindings, wasm, withThreadPool };

const COMPUTE_WORKER_CRASH_PREFIX = 'o1js compute worker crashed:';

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

  workerPromise = new Promise((resolve, reject) => {
    setTimeout(async () => {
      // The calling thread may busy-spin in waitForWorkerRpcResult, so it cannot
      // observe compute-worker `error` events itself. A thin watchdog proxy owns
      // the compute worker and writes ERROR into the SAB if it crashes mid-call.
      let computeSrc = srcFromFunctionModule(mainWorker);
      let worker = inlineWorker(srcFromFunctionModule(watchdogMain));
      let onError = (error) => {
        reject(new Error(`Failed to start o1js web worker: ${error.message}`));
      };
      let onWatchdogMessage = ({ data }) => {
        if (data?.type === 'compute-crashed') {
          reject(new Error(`Failed to start o1js web worker: ${data.error}`));
        }
      };
      worker.addEventListener('error', onError, { once: true });
      worker.addEventListener('message', onWatchdogMessage);
      try {
        let booted = waitForMessage(worker, '__booted__');
        worker.postMessage({ type: '__boot__', computeSrc });
        await booted;
        await workerCall(worker, 'start', { memory, module });
        worker.removeEventListener('error', onError);
        worker.removeEventListener('message', onWatchdogMessage);
        if (worker._o1jsBlobUrl !== undefined) {
          URL.revokeObjectURL(worker._o1jsBlobUrl);
          delete worker._o1jsBlobUrl;
        }
        overrideBindings(globalThis.kimchi_wasm, worker);
        resolve(worker);
      } catch (error) {
        worker.removeEventListener('error', onError);
        worker.removeEventListener('message', onWatchdogMessage);
        reject(error);
      }
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

  onMessage(self, 'run', ({ name, args, control }) => {
    try {
      if (!waitForWorkerRpcReady(control)) return;
      let functionSpec = spec[name];
      if (functionSpec === undefined) throw Error(`Unknown o1js worker binding '${name}'`);

      let decoded = decodeWorkerArguments(args, functionSpec.args);
      let result;
      let callError;
      try {
        result = wasm[name].apply(wasm, decoded.args);
      } catch (error) {
        callError = error;
      }

      try {
        cleanupWorkerArguments(decoded.wrappers, callError === undefined);
      } catch (error) {
        callError ??= error;
      }
      if (callError !== undefined) throw callError;

      result = transferWorkerResult(result, functionSpec.res);
      writeWorkerRpcSuccess(control, result);
    } catch (error) {
      writeWorkerRpcError(control, error);
    }
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
  kimchiWasm,
  workerSpec,
  workerExport,
  onMessage,
  waitForMessage,
  cleanupWorkerArguments,
  decodeWorkerArguments,
  transferWorkerResult,
  waitForWorkerRpcReady,
  writeWorkerRpcError,
  writeWorkerRpcSuccess,
];

/**
 * Owns the compute worker so crash events keep running while the caller spins
 * on the RPC SharedArrayBuffer. Forwards all messages; on crash, fails any
 * in-flight RPC by writing ERROR into the pending control buffer.
 */
function watchdogMain() {
  let activeControl;
  let computeDead = false;
  let compute;

  function failPendingRpc(error) {
    if (activeControl === undefined) return;
    let control = activeControl;
    activeControl = undefined;
    writeWorkerRpcErrorIfPending(control, error);
  }

  function markComputeDead(error) {
    if (computeDead) return;
    computeDead = true;
    failPendingRpc(error);
    postMessage({
      type: 'compute-crashed',
      error: String(error?.message ?? error),
    });
  }

  waitForMessage(self, '__boot__').then((data) => {
    compute = inlineWorker(data.computeSrc);

    compute.addEventListener('error', (event) => {
      // Keep this prefix literal inside watchdogMain: the worker bundle only
      // receives stringified deps, not module-level constants.
      markComputeDead(new Error(`o1js compute worker crashed: ${event.message || 'error'}`));
    });
    compute.addEventListener('messageerror', () => {
      markComputeDead(new Error('o1js compute worker crashed: messageerror'));
    });
    compute.addEventListener('message', ({ data: computeData }) => {
      postMessage(computeData);
    });

    self.addEventListener('message', ({ data: parentData }) => {
      if (parentData?.type === '__boot__') return;

      if (computeDead) {
        if (parentData?.type === 'run') {
          writeWorkerRpcErrorIfPending(
            parentData.message.control,
            new Error('o1js compute worker crashed: worker is dead')
          );
        } else if (parentData?.id !== undefined) {
          postMessage({
            type: parentData.id,
            error: 'o1js compute worker crashed: worker is dead',
          });
        }
        return;
      }

      if (parentData?.type === 'run') {
        activeControl = parentData.message.control;
        compute.postMessage(parentData);
        return;
      }

      compute.postMessage(parentData);
    });

    postMessage({ type: '__booted__' });
  });
}
watchdogMain.deps = [waitForMessage, inlineWorker, writeWorkerRpcErrorIfPending];

function isComputeWorkerCrash(error) {
  return String(error?.message ?? error).startsWith(COMPUTE_WORKER_CRASH_PREFIX);
}

function overrideBindings(kimchi_wasm, worker) {
  let spec = workerSpec(kimchi_wasm);
  let control = createWorkerRpcControl();
  let fatalError;
  worker.addEventListener('message', ({ data }) => {
    if (data?.type !== 'compute-crashed') return;
    fatalError ??= new Error(data.error || `${COMPUTE_WORKER_CRASH_PREFIX}error`);
  });
  for (let key in spec) {
    kimchi_wasm[key] = (...args) => {
      if (fatalError !== undefined) throw fatalError;
      if (spec[key].disabled) throw Error(`Wasm method '${key}' is disabled on the web.`);

      let { encodedArgs, moves } = encodeMainThreadArguments(args, spec[key].args);
      prepareWorkerRpcRequest(control);
      try {
        worker.postMessage({
          type: 'run',
          message: { name: key, args: encodedArgs, control },
        });
        // The worker cannot execute the binding until every moved wrapper has
        // been detached from the main thread's FinalizationRegistry.
        commitMainThreadMoves(moves);
        markWorkerRpcReady(control);
      } catch (error) {
        cancelWorkerRpcRequest(control);
        worker.terminate();
        fatalError = new Error('The o1js web worker ownership handoff failed', { cause: error });
        throw fatalError;
      }

      let result;
      try {
        result = waitForWorkerRpcResult(control);
      } catch (error) {
        if (isComputeWorkerCrash(error)) fatalError = error;
        throw error;
      }
      return decodeMainThreadResult(result, spec[key].res);
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
      initial: 20,
      maximum: 16384, // 1 GiB
      shared: true,
    });
  } else {
    return new WebAssembly.Memory({
      initial: 20,
      maximum: 65536, // 4 GiB
      shared: true,
    });
  }
}
