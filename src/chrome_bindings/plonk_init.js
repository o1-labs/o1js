import init, * as plonk_wasm from './plonk_wasm.esbuild.js';
import { override_bindings } from './worker_run.js';
import workerInitSrc from 'string:./worker_init.js';
import snarkyJsChromeSrc from 'string:./snarky_js_chrome.bc.js';
// import snarkyJsChrome from 'defer:./snarky_js_chrome.bc.js';

export async function initSnarkyJS() {
  let plonk_wasm_init = await init();

  let set_workers_ready;
  let workers_ready = new Promise((resolve) => {
    set_workers_ready = resolve;
  });

  let worker = inlineWorker(workerInitSrc);

  worker.onmessage = () => {
    set_workers_ready();
  };

  worker.postMessage({ type: 'init', memory: plonk_wasm_init.memory });
  await workers_ready;
  window.plonk_wasm = override_bindings(plonk_wasm, worker);

  // we have two approaches to run the .bc.js code after its dependencies are ready, without fetching an additional script:

  // 1. wrap it inside a function and just include that function in the bundle
  // this could be nice and simple, but breaks because the .bc.js code uses `(function(){return this}())` to access `window`
  // (probably as a cross-platform way to get the global object before globalThis existed)
  // that obsolete hack doesn't work here because inside an ES module, this === undefined instead of this === window
  // it seems to work when we patch the source code (replace IIFEs with `window`)
  // snarkyJsChrome();

  // 2. include the code as string and eval it
  // (this works because it breaks out of strict mode)
  new Function(snarkyJsChromeSrc)();
}

function loadScript(src) {
  let script = document.createElement('script');
  script.src = src;
  document.body.appendChild(script);
  return new Promise((r) => script.addEventListener('load', () => r()));
}

function inlineWorker(src) {
  let blob = new Blob([src], { type: 'application/javascript' });
  let url = URL.createObjectURL(blob);
  let worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}
