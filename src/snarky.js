export let Field;
export let Bool;
export let Circuit;
export let Poseidon;
export let Group;
export let Scalar;

export const shutdown = () => {
  if (global.wasm_rayon_poolbuilder) {
    global.wasm_rayon_poolbuilder.free();
    return Promise.all(
      global.wasm_workers.map(async (worker) => {
        await worker.terminate();
      })
    );
  }
};

(() => {
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    // Since we export off the window object, we don't actually use this import for exporting.
    // The reason we require the web bindings here is just to get it included in the webpack output bundle.
    const _ = require('./chrome_bindings/snarky_js_chrome.bc.js');
    Field = window.__snarky.Field;
    Bool = window.__snarky.Bool;
    Circuit = window.__snarky.Circuit;
    Poseidon = window.__snarky.Poseidon;
    Group = window.__snarky.Group;
    Scalar = window.__snarky.Scalar;
  } else {
    const snarkyServer = require('./node_bindings/snarky_js_node.bc.js');
    Field = snarkyServer.Field;
    Bool = snarkyServer.Bool;
    Circuit = snarkyServer.Circuit;
    Poseidon = snarkyServer.Poseidon;
    Group = snarkyServer.Group;
    Scalar = snarkyServer.Scalar;
  }
})();
