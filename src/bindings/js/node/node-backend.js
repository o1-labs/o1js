import os from 'os';
import { fileURLToPath } from 'url';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { WithThreadPool, workers } from '../../../lib/proof-system/workers.js';
import wasm_ from '../../compiled/node_bindings/kimchi_wasm.cjs';
let url = import.meta.url;
let filename = url !== undefined ? fileURLToPath(url) : __filename;

/**
 * @type {import("../../compiled/node_bindings/kimchi_wasm.cjs")}
 */
const wasm = wasm_;
wasm.__o1js_backend_preference = 'wasm';
if (typeof globalThis !== 'undefined') {
  globalThis.__o1js_backend_preference = 'wasm';
}

export { wasm, withThreadPool };

let workersReadyResolve;
let workersReady;
let wasmThreadPoolRunning = false;

// expose this globally so that it can be referenced from wasm
globalThis.startWorkers = startWorkers;
globalThis.terminateWorkers = terminateWorkers;

if (!isMainThread) {
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

async function startWorkers(src, memory, builder) {
  wasmWorkers = [];
  const startupTimeoutMs = 30_000;
  await Promise.all(
    Array.from({ length: builder.numThreads() }, () => {
      let worker = new Worker(src, {
        workerData: { memory, receiver: builder.receiver() },
      });
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
        terminated.catch(() => {});
      }
    } catch {
      // Ignore shutdown races.
    }
  }
}
