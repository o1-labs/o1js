import init, * as plonk_wasm from './plonk_wasm.js';
(async () => {
  window.plonk_wasm = plonk_wasm;
  await init();
  plonk_wasm.initThreadPool(navigator.hardwareConcurrency).then(function () {
    var newScript = document.createElement('script');
    newScript.src = './snarky_js_chrome.bc.js'; // This is the OCaml bindings to JavaScript
    document.body.appendChild(newScript);
    newScript.addEventListener('load', () => {
      var newScript = document.createElement('script');
      newScript.src = './snarkyjs_web.js'; // This is the bundled SnarkyJS typescript code
      document.body.appendChild(newScript);
    });
  });
})();
