import os from 'os';
import { fileURLToPath } from 'url';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { WithThreadPool, workers } from '../../../lib/proof-system/workers.js';
import wasm_ from '../../compiled/node_bindings/plonk_wasm.cjs';
let url = import.meta.url;
let filename = url !== undefined ? fileURLToPath(url) : __filename;

/**
 * @type {import("../../compiled/node_bindings/plonk_wasm.cjs")}
 */
const wasm = wasm_;

export { wasm, withThreadPool };

let workersReadyResolve;
let workersReady;
let wasmThreadPoolRunning = false;

// expose this globally so that it can be referenced from wasm
globalThis.startWorkers = startWorkers;
globalThis.terminateWorkers = terminateWorkers;

// Auto-initialize worker outside main thread (main thread initialized in plonk_wasm.cjs)
if (!isMainThread) {
  wasm.initSync({
    module: workerData.module,
    memory: workerData.memory,
    thread_stack_size: Number(process?.env?.O1JS_WASM_THREAD_STACK_SIZE ?? 1048576), // 1MB default stack size for worker threads
  });
  parentPort.postMessage({ type: 'wasm_bindgen_worker_ready' });
  wasm.wbg_rayon_start_worker(workerData.receiver);
}

// state machine to enable calling multiple functions that need a thread pool at once
const withThreadPool = WithThreadPool({ initThreadPool, exitThreadPool });

async function initThreadPool() {
  if (!isMainThread) return;
  if (wasmThreadPoolRunning) return;
  const numThreads = Math.max(1, workers.numWorkers ?? (os.availableParallelism() ?? 1) - 1);
  workersReady = new Promise((resolve) => (workersReadyResolve = resolve));
  try {
    await wasm.initThreadPool(numThreads, filename);
    await workersReady;
    wasmThreadPoolRunning = true;
  } catch (error) {
    wasmThreadPoolRunning = false;
    throw error;
  } finally {
    workersReady = undefined;
    workersReadyResolve = undefined;
  }
}

async function exitThreadPool() {
  if (!isMainThread) return;
  if (!wasmThreadPoolRunning) return;
  // Keep the pool alive across compile/prove calls.
  // Explicit teardown can deadlock or trigger finalizer crashes depending on
  // toolchain/runtime combinations.
}

/**
 * @type {Worker[]}
 */
let wasmWorkers = [];

function getWorkerMemory() {
  // Use the canonical memory object from the loaded JS module instead of the
  // callback argument coming through wasm-bindgen externref glue.
  return typeof wasm.get_memory === 'function' ? wasm.get_memory() : wasm.__wasm.memory;
}

function getWorkerModule() {
  return wasm.__wbg_wasm_module;
}

function isCloneError(error) {
  return error?.name === 'DataCloneError' || String(error?.message ?? error).includes('could not be cloned');
}

function describeMemory(value) {
  return {
    type: value?.constructor?.name,
    hasBuffer: !!value?.buffer,
    sharedBuffer: value?.buffer instanceof SharedArrayBuffer,
    byteLength: value?.buffer?.byteLength,
  };
}

function cloneCheck(value) {
  try {
    structuredClone(value);
    return 'ok';
  } catch (error) {
    return `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`;
  }
}

async function startWorkers(src, memory, builder) {
  wasmWorkers = [];
  const startupTimeoutMs = 30_000;
  let workerMemory = getWorkerMemory();
  let workerModule = getWorkerModule();
  await Promise.all(
    Array.from({ length: builder.numThreads() }, () => {
      let worker;
      try {
        worker = new Worker(src, {
          workerData: {
            memory: workerMemory,
            module: workerModule,
            receiver: builder.receiver(),
          },
        });
      } catch (error) {
        if (isCloneError(error)) {
          console.error('[o1js wasm worker debug]', {
            node: process.version,
            platform: process.platform,
            arch: process.arch,
            sameMemoryObject: memory === workerMemory,
            callbackMemory: describeMemory(memory),
            workerMemory: describeMemory(workerMemory),
            callbackMemoryClone: cloneCheck(memory),
            workerMemoryClone: cloneCheck(workerMemory),
          });
        }
        throw error;
      }
      wasmWorkers.push(worker);
      return new Promise((resolve, reject) => {
        let timer = setTimeout(() => {
          cleanup();
          reject(new Error('Timed out waiting for wasm worker startup'));
        }, startupTimeoutMs);
        let ready = false;

        function cleanup() {
          clearTimeout(timer);
          worker.off('message', onReady);
          worker.off('error', onError);
          worker.off('exit', onExit);
        }

        function onReady(data) {
          if (data == null || data.type !== 'wasm_bindgen_worker_ready') return;
          ready = true;
          cleanup();
          // Do not keep the process alive solely because pool workers exist.
          worker.unref();
          resolve(worker);
        }

        function onError(error) {
          cleanup();
          reject(error);
        }

        function onExit(code) {
          cleanup();
          if (ready || code === 0) {
            // Some wasm-bindgen/node combinations exit worker threads as soon as
            // startup work is done. Treat a clean exit as successful startup.
            resolve(worker);
            return;
          }
          reject(new Error(`WASM worker exited before ready (code ${code})`));
        }

        worker.on('message', onReady);
        worker.once('error', onError);
        worker.once('exit', onExit);
      });
    })
  );
  builder.build();
  workersReadyResolve();
}

function terminateWorkers() {
  let workersToTerminate = wasmWorkers ?? [];
  wasmWorkers = [];
  wasmThreadPoolRunning = false;
  for (let worker of workersToTerminate) {
    try {
      let terminated = worker.terminate();
      if (terminated && typeof terminated.catch === 'function') {
        terminated.catch(() => { });
      }
    } catch {
      // Ignore shutdown races.
    }
  }
}
