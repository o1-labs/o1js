import './prepare-node-backend.js';
import { isMainThread, parentPort, workerData, Worker } from 'worker_threads';
import os from 'os';
import wasm_ from '../../_node_bindings/plonk_wasm.cjs';
const __filename = import.meta.url.slice(7);

/**
 * @type {import("../../node_bindings/plonk_wasm")}
 */
const wasm = wasm_;

export { snarkyReady, wasm, initThreadPool, exitThreadPool, shutdown };

let snarkyReady = Promise.resolve();

let workersReadyResolve;
let workersReady;

// expose this globally so that it can be referenced from wasm
globalThis.startWorkers = startWorkers;
globalThis.terminateWorkers = terminateWorkers;

if (!isMainThread) {
  parentPort.postMessage({ type: 'wasm_bindgen_worker_ready' });
  wasm.wbg_rayon_start_worker(workerData.receiver);
}

let isInitialized = false;

async function initThreadPool() {
  if (isMainThread && !isInitialized) {
    isInitialized = true;
    workersReady = new Promise((resolve) => (workersReadyResolve = resolve));
    wasm.initThreadPool(getEfficientNumWorkers(), __filename);
    await workersReady;
    workersReady = undefined;
  }
}

async function exitThreadPool() {
  if (isMainThread && isInitialized) {
    isInitialized = false;
    await wasm.exitThreadPool();
  }
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
  workersReadyResolve();
  try {
    builder.build();
  } catch (_e) {
    // We 'mute' this error here, since it can only ever throw when
    // there is something wrong with the rayon subsystem in WASM, and
    // we deliberately introduce such a problem by destroying builder
    // when we want to shutdown the process (and thus need to kill the
    // child threads). The error here won't be useful to developers
    // using the library.
    console.log(_e);
  }
}

async function terminateWorkers() {
  await workersReady;
  return Promise.all(wasmWorkers.map((w) => w.terminate())).then(
    () => (wasmWorkers = undefined)
  );
}

// Return the most efficient number of workers for the platform we're running
// on. This is required because of an issue with Apple silicon that's outlined
// here: https://bugs.chromium.org/p/chromium/issues/detail?id=1228686
function getEfficientNumWorkers() {
  let cpus = os.cpus();
  let numCpus = cpus.length;
  let cpuModel = cpus[0].model;

  let numWorkers =
    {
      'Apple M1': 2,
      'Apple M1 Pro': numCpus === 10 ? 3 : 2,
      'Apple M1 Max': 3,
      'Apple M1 Ultra': 7,
      'Apple M2': 2,
    }[cpuModel] || numCpus - 1;

  return numWorkers;
}

async function shutdown() {}
