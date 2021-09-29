import init, * as plonk_wasm from '/plonk_wasm.js';
export const initSnarkyJS = (async (bundleName) => {
  window.plonk_wasm = plonk_wasm;
  await init();
  var set_workers_ready;
  var workers_ready = new Promise(function(resolve) { set_workers_ready = resolve; });
  var worker = new Worker('/worker_init.js', { "type": "module" });
  worker.onmessage = function() { set_workers_ready(); };
  await workers_ready;
  var newScript = document.createElement('script');
  newScript.src = '/snarky_js_chrome.bc.js'; // This is the bundled snarky bindings code -- see webpack.config.js on how the bundle is generated
  document.body.appendChild(newScript);
  newScript.addEventListener('load', () => {
    var newScript = document.createElement('script');
    newScript.src = bundleName; // This is the bundled snarkyjs code -- see webpack.config.js on how the bundle is generated
    document.body.appendChild(newScript);
  });
});
