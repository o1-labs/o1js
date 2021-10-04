import init, * as plonk_wasm from '/plonk_wasm.js';
import {override_bindings} from './worker_run.js';
export const initSnarkyJS = (async (bundle) => {
  var plonk_wasm_init = await init();

  var set_workers_ready;
  var workers_ready = new Promise(function(resolve) {
    set_workers_ready = resolve;
  });
  
  var worker = new Worker('/worker_init.js', {
    "type": "module"
  });
  worker.onmessage = function() { set_workers_ready(); };
  worker.postMessage({type: "init", memory: plonk_wasm_init.memory});
  await workers_ready;

  window.plonk_wasm = override_bindings(plonk_wasm, worker);

  var snarkyBindings = document.createElement('script');
  snarkyBindings.src = '/snarky_js_chrome.bc.js'; // This is the bundled snarky bindings code -- see webpack.config.js on how the bundle is generated
  document.body.appendChild(snarkyBindings);

  snarkyBindings.addEventListener('load', () => {
    var snarkyLib = document.createElement('script');
    snarkyLib.src = "/snarky.js"; // This is the bundled snarkyjs code -- see webpack.config.js on how the bundle is generated
    document.body.appendChild(snarkyLib);
    if (bundle) {
      snarkyLib.addEventListener("load", () => {
        var snarkyLib = document.createElement('script');
        snarkyLib.src = bundle;
        document.body.appendChild(snarkyLib);
      })
    }
  });
});
