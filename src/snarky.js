import { initSnarkyJS } from './chrome_bindings/plonk_init.js';

export { Field, Bool, Circuit, Poseidon, Group, Scalar, shutdown };
let Field, Bool, Circuit, Poseidon, Group, Scalar;

let snarkyReady = initSnarkyJS().then(() => {
  Field = window.__snarky.Field;
  Bool = window.__snarky.Bool;
  Circuit = window.__snarky.Circuit;
  Poseidon = window.__snarky.Poseidon;
  Group = window.__snarky.Group;
  Scalar = window.__snarky.Scalar;
});
window.snarkyReady = snarkyReady;

function shutdown() {
  if (global.wasm_rayon_poolbuilder) {
    global.wasm_rayon_poolbuilder.free();
    return Promise.all(
      global.wasm_workers.map(async (worker) => {
        await worker.terminate();
      })
    );
  }
}
