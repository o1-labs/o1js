import { isMainThread, parentPort, workerData, Worker } from 'worker_threads';
import os from 'os';
import wasm_ from '../../compiled/_node_bindings/plonk_wasm.cjs';
import { fileURLToPath } from 'url';
import { WithThreadPool, workers } from '../../../lib/proof-system/workers.js';
let url = import.meta.url;
let filename = url !== undefined ? fileURLToPath(url) : __filename;

/**
 * @type {import("../../compiled/node_bindings/plonk_wasm.cjs")}
 */
const wasm = wasm_;

export { wasm, withThreadPool };

let workersReadyResolve;
let workersReady;

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
  workersReady = new Promise((resolve) => (workersReadyResolve = resolve));
  await wasm.initThreadPool(
    Math.max(1, workers.numWorkers ?? (os.availableParallelism() ?? 1) - 1),
    filename
  );
  await workersReady;
  workersReady = undefined;
}

async function exitThreadPool() {
  if (!isMainThread) return;
  await wasm.exitThreadPool();
}

/**
 * @type {Worker[]}
 */
let wasmWorkers = [];

async function startWorkers(src, memory, builder) {
  wasmWorkers = [];
  await Promise.all(
    Array.from({ length: builder.numThreads() }, () => {
      let worker = new Worker(src, {
        workerData: { memory, receiver: builder.receiver() },
      });
      wasmWorkers.push(worker);
      let target = worker;
      let type = 'wasm_bindgen_worker_ready';
      return new Promise((resolve) => {
        let done = false;
        target.on('message', function onMsg(data) {
          if (data == null || data.type !== type || done) return;
          done = true;
          resolve(worker);
        });
      });
    })
  );
  builder.build();
  workersReadyResolve();
}

async function terminateWorkers() {
  return Promise.all(wasmWorkers.map((w) => w.terminate())).then(
    () => (wasmWorkers = undefined)
  );
}
