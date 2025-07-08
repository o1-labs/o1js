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

// Worker thread health monitoring
function startWorkerHealthMonitoring() {
  if (isMainThread) return;
  
  const workerId = workerData.workerId || 'unknown-worker';
  const healthCheckInterval = 5000; // 5 seconds
  
  // Report health periodically
  setInterval(() => {
    try {
      // Get memory usage from WASM
      const memoryUsageMB = wasm.get_memory_usage_mb ? wasm.get_memory_usage_mb() : 0;
      const criticalThresholdMB = wasm.get_critical_memory_threshold_mb ? wasm.get_critical_memory_threshold_mb() : 3200;
      const isMemoryCritical = memoryUsageMB > criticalThresholdMB * 0.9; // 90% of threshold
      
      const healthReport = {
        workerId,
        memoryUsageMB,
        isMemoryCritical,
        timestamp: Date.now()
      };
      
      // Send health report to main thread
      parentPort.postMessage({ type: 'health_report', report: healthReport });
    } catch (error) {
      console.error(`[Worker ${workerId}] Failed to report health:`, error);
    }
  }, healthCheckInterval);
}

let workersReadyResolve;
let workersReady;

// expose this globally so that it can be referenced from wasm
globalThis.startWorkers = startWorkers;
globalThis.terminateWorkers = terminateWorkers;

if (!isMainThread) {
  parentPort.postMessage({ type: 'wasm_bindgen_worker_ready' });
  
  // Start health monitoring in worker thread
  startWorkerHealthMonitoring();
  
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
    Array.from({ length: builder.numThreads() }, (_, index) => {
      let worker = new Worker(src, {
        workerData: { memory, receiver: builder.receiver(), workerId: `node-worker-${index}` },
      });
      wasmWorkers.push(worker);
      let target = worker;
      let type = 'wasm_bindgen_worker_ready';
      
      // Set up health report handling
      target.on('message', function healthReportHandler(data) {
        if (data?.type === 'health_report') {
          // Forward to pool health coordinator
          if (globalThis.poolHealthCoordinator) {
            globalThis.poolHealthCoordinator.receiveHealthReport(data.report);
          }
        }
      });
      
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
