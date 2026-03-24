import wasm from '../../../web_bindings/kimchi_wasm.js';

export {
  srcFromFunctionModule,
  inlineWorker,
  workerHelperMain,
  startWorkers,
  terminateWorkers,
  waitForMessage,
};

function srcFromFunctionModule(fun) {
  let deps = collectDependencies(fun, []);
  if (!deps.includes(fun)) deps.push(fun);
  let sources = deps.map((dep) => {
    let src = dep.toString();
    if (dep.deps) {
      let depsList = dep.deps.map((d) => d.name).join(',');
      src += `\n${dep.name}.deps = [${depsList}]`;
    }
    return src;
  });
  return sources.join('\n') + `\n${fun.name}();`;
}
srcFromFunctionModule.deps = [collectDependencies];

function collectDependencies(fun, deps) {
  for (let dep of fun.deps ?? []) {
    if (deps.includes(dep)) continue;
    deps.push(dep);
    collectDependencies(dep, deps);
  }
  return deps;
}

function inlineWorker(src) {
  let blob = new Blob([src], { type: 'application/javascript' });
  let url = URL.createObjectURL(blob);
  let worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}

function waitForMessage(target, type) {
  return new Promise((resolve) => {
    target.addEventListener('message', function onMsg({ data }) {
      if (data?.type !== type) return;
      target.removeEventListener('message', onMsg);
      resolve(data);
    });
  });
}

function workerHelperMain() {
  let { default: init, wbg_rayon_start_worker } = wasm();

  waitForMessage(self, 'wasm_bindgen_worker_init')
    .then(async (data) => {
      await init(data.module, data.memory);
      postMessage({ type: 'wasm_bindgen_worker_ready' });
      wbg_rayon_start_worker(data.receiver);
    })
    .catch((err) => {
      postMessage({
        type: 'wasm_bindgen_worker_error',
        error: String(err?.stack ?? err),
      });
    });
}
workerHelperMain.deps = [wasm, waitForMessage];

async function startWorkers(module, memory, builder) {
  const startupTimeoutMs = 30_000;
  const workerInit = {
    type: 'wasm_bindgen_worker_init',
    module,
    memory,
    receiver: builder.receiver(),
  };
  let workerSrc = srcFromFunctionModule(workerHelperMain);

  self._workers = []; // not used, prevents Firefox bug

  let blob = new Blob([workerSrc], { type: 'application/javascript' });
  let url = URL.createObjectURL(blob);
  for (let i = 0; i < builder.numThreads(); i++) {
    let worker = new Worker(url);
    worker.postMessage(workerInit);
    self._workers.push(worker);
  }
  URL.revokeObjectURL(url);

  await Promise.all(
    self._workers.map(
      (w) =>
        new Promise((resolve, reject) => {
          let timer = setTimeout(() => {
            cleanup();
            reject(new Error('Timed out waiting for wasm worker startup'));
          }, startupTimeoutMs);

          function cleanup() {
            clearTimeout(timer);
            w.removeEventListener('message', onMessage);
          }

          function onMessage({ data }) {
            if (data?.type === 'wasm_bindgen_worker_ready') {
              cleanup();
              resolve(w);
            } else if (data?.type === 'wasm_bindgen_worker_error') {
              cleanup();
              reject(new Error('WASM worker init failed: ' + data.error));
            }
          }

          w.addEventListener('message', onMessage);
        })
    )
  );
  builder.build();
}
startWorkers.deps = [srcFromFunctionModule, waitForMessage, workerHelperMain];

async function terminateWorkers() {
  self._workers.forEach((worker) => {
    worker.terminate();
  });
}
