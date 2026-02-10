import os from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { WithThreadPool, workers } from '../../../lib/proof-system/workers.js';
import wasm_ from '../../compiled/node_bindings/kimchi_wasm.cjs';
let url = import.meta.url;
let filename = url !== undefined ? fileURLToPath(url) : __filename;

/**
 * @type {import("../../compiled/node_bindings/kimchi_wasm.cjs")}
 */
const wasm = wasm_;
// For SRS cache in native Kimchi, the bindings used are not the JSOO ones but 
// the native ones directly. So we need to override the WASM here as well, as in
// mina/src/lib/crypto/kimchi_bindings/js/node_js/node_backend.js
{
  const require = createRequire(import.meta.url);

  try {
    const native = require(`@o1js/native-${process.platform}-${process.arch}`);
    const overrides = [
      'prover_index_fp_deserialize',
      'prover_index_fq_deserialize',
      'prover_index_fp_serialize',
      'prover_index_fq_serialize',
      'caml_pasta_fp_plonk_index_encode',
      'caml_pasta_fq_plonk_index_encode',
      'caml_pasta_fp_plonk_index_decode',
      'caml_pasta_fq_plonk_index_decode',
      'caml_pasta_fp_plonk_verifier_index_serialize',
      'caml_pasta_fq_plonk_verifier_index_serialize',
      'caml_pasta_fp_plonk_verifier_index_deserialize',
      'caml_pasta_fq_plonk_verifier_index_deserialize',
    ];
    const ctorOverrides = [
      'WasmFpPolyComm',
      'WasmFqPolyComm',
    ];
    overrides.forEach((name) => {
      if (typeof native[name] === 'function') {
        wasm[name] = (...args) => native[name](...args);
      }
    });
    ctorOverrides.forEach((name) => {
      if (typeof native[name] === 'function') {
        wasm[name] = function (...args) {
          return new native[name](...args);
        };
      }
    });
    wasm.__kimchi_backend = 'native';
    if (typeof globalThis !== 'undefined') {
      globalThis.__kimchi_backend = 'native';
    }
  } catch (e) {
    if (process.env.O1JS_REQUIRE_NATIVE_BINDINGS) throw e;
  }
  if (!wasm.__kimchi_backend) {
    wasm.__kimchi_backend = 'wasm';
  }
  if (typeof globalThis !== 'undefined' && !globalThis.__kimchi_backend) {
    globalThis.__kimchi_backend = wasm.__kimchi_backend;
  }
}

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
  return Promise.all(wasmWorkers.map((w) => w.terminate())).then(() => (wasmWorkers = undefined));
}
