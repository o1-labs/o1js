import './prepare-node-backend.js';
import { isMainThread, parentPort, workerData, Worker } from 'worker_threads';
import os from 'os';
import wasm from '../../_node_bindings/plonk_wasm.cjs';
const __filename = import.meta.url.slice(7);

export { wasm, initThreadPool, shutdown };

let workersReadyResolve;
let workersReady = new Promise((resolve) => (workersReadyResolve = resolve));

// expose this globally so that it can be referenced from wasm
globalThis.startWorkers = startWorkers;

if (!isMainThread) {
  parentPort.postMessage({ type: 'wasm_bindgen_worker_ready' });
  wasm.wbg_rayon_start_worker(workerData.receiver);
}

let isInitialized = false;

async function initThreadPool() {
  if (isMainThread && !isInitialized) {
    isInitialized = true;
    wasm.initThreadPool(getEfficientNumWorkers(), __filename);
    await workersReady;
  }
}

async function startWorkers(src, memory, builder) {
  globalThis.wasm_workers = [];
  globalThis.wasm_rayon_poolbuilder = builder;
  await Promise.all(
    Array.from({ length: builder.numThreads() }, () => {
      let worker = new Worker(src, {
        workerData: { memory, receiver: builder.receiver() },
      });
      globalThis.wasm_workers.push(worker);
      let target = worker;
      let type = 'wasm_bindgen_worker_ready';
      return new Promise(function (resolve) {
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

// TODO get rid of shutdown
// let didShutdown = false;
async function shutdown() {
  process.exit(0);
  // if (global.wasm_rayon_poolbuilder && !didShutdown) {
  //   didShutdown = true;
  //   global.wasm_rayon_poolbuilder.free();
  //   await Promise.all(global.wasm_workers.map((worker) => worker.terminate()));
  // }
}
