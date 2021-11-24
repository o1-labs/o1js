import plonkWasm from './plonk_wasm.js';
import workerRun from './worker_run.js';
import workerInit from './worker_init.js';
import { srcFromFunctionModule, inlineWorker } from './workerHelpers.js';
import snarkyJsChromeSrc from 'string:./snarky_js_chrome.bc.js';
let plonk_wasm = plonkWasm();
let init = plonk_wasm.default;
let { override_bindings } = workerRun();

export async function initSnarkyJS() {
  let plonk_wasm_init = await init();

  let set_workers_ready;
  let workers_ready = new Promise((resolve) => {
    set_workers_ready = resolve;
  });

  let worker = inlineWorker(srcFromFunctionModule(workerInit));

  worker.onmessage = () => {
    set_workers_ready();
  };

  // TODO can't we send the compiled wasm module as well?
  worker.postMessage({ type: 'init', memory: plonk_wasm_init.memory });
  await workers_ready;
  window.plonk_wasm = override_bindings(plonk_wasm, worker);

  // we have two approaches to run the .bc.js code after its dependencies are ready, without fetching an additional script:

  // 1. wrap it inside a function and just include that function in the bundle
  // this could be nice and simple, but breaks because the .bc.js code uses `(function(){return this}())` to access `window`
  // (probably as a cross-platform way to get the global object before globalThis existed)
  // that obsolete hack doesn't work here because inside an ES module, this === undefined instead of this === window
  // it seems to work when we patch the source code (replace IIFEs with `window`)

  // 2. include the code as string and eval it:
  // (this works because it breaks out of strict mode)
  new Function(snarkyJsChromeSrc)();
}
