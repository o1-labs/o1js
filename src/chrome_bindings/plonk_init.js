import init, * as plonk_wasm from 'https://cdn.jsdelivr.net/gh/mitschabaude/snarkyjs@feature/restructure-web/src/chrome_bindings/plonk_wasm.js';
import { override_bindings } from './worker_run.js';

export async function initSnarkyJS() {
  let plonk_wasm_init = await init();

  let set_workers_ready;
  let workers_ready = new Promise((resolve) => {
    set_workers_ready = resolve;
  });

  let src = './worker_init.js';

  // for some reason this doesnt work

  // let src =
  //   'https://cdn.jsdelivr.net/gh/mitschabaude/snarkyjs@feature/restructure-web/src/chrome_bindings/worker_init.js';
  // let scriptBlob = await fetch(src).then((r) => r.blob());
  // console.log(scriptBlob);
  // let blob = new Blob([scriptBlob], { type: 'text/javascript' });
  // console.log(blob);
  // let url = URL.createObjectURL(scriptBlob);
  // let worker = new Worker(url, { type: 'module' });
  let worker = new Worker(src, { type: 'module' });

  worker.onmessage = () => {
    set_workers_ready();
  };

  worker.postMessage({ type: 'init', memory: plonk_wasm_init.memory });
  console.log('awaiting workers ready...');
  // URL.revokeObjectURL(url);
  await workers_ready;
  console.log('finished');

  window.plonk_wasm = override_bindings(plonk_wasm, worker);

  await loadScript('./snarky_js_chrome.bc.js');
}

function loadScript(src) {
  let script = document.createElement('script');
  script.src = src;
  document.body.appendChild(script);
  return new Promise((r) => script.addEventListener('load', () => r()));
}
