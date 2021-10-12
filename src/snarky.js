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

(async () => {
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    const _snarky = require('./chrome_bindings/snarky_js_chrome.bc.js');
    Field = window.__snarky.Field;
    Bool = window.__snarky.Bool;
    Circuit = window.__snarky.Circuit;
    Poseidon = window.__snarky.Poseidon;
    Group = window.__snarky.Group;
    Scalar = window.__snarky.Scalar;
  } else {
    const snarky_node = require('./node_bindings/snarky_js_node.bc.js');
    Field = snarky_node.Field;
    Bool = snarky_node.Bool;
    Circuit = snarky_node.Circuit;
    Poseidon = snarky_node.Poseidon;
    Group = snarky_node.Group;
    Scalar = snarky_node.Scalar;
  }
})();
