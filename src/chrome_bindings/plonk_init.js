import init, * as plonk_wasm from './plonk_wasm.js';
import { override_bindings } from './worker_run.js';

export async function initSnarkyJS() {
  let plonk_wasm_init = await init();

  let set_workers_ready;
  let workers_ready = new Promise((resolve) => {
    set_workers_ready = resolve;
  });

  let scriptBlob = await fetch(
    'https://cdn.jsdelivr.net/gh/mitschabaude/snarkyjs/src/chrome_bindings/worker_init.js'
  ).then((r) => r.blob());
  let url = URL.createObjectURL(scriptBlob);
  let worker = new Worker(url, { type: 'module' });

  worker.onmessage = () => {
    set_workers_ready();
  };

  worker.postMessage({ type: 'init', memory: plonk_wasm_init.memory });
  await workers_ready;

  window.plonk_wasm = override_bindings(plonk_wasm, worker);

  await loadScript(
    'https://cdn.jsdelivr.net/gh/mitschabaude/snarkyjs/src/chrome_bindings/snarky_js_chrome.bc.js'
  );
}

function loadScript(src) {
  let script = document.createElement('script');
  script.src = src;
  document.body.appendChild(script);
  return new Promise((r) => script.addEventListener('load', () => r()));
}
