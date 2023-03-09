import { initSnarkyJS } from '../chrome_bindings/plonk_init.js';

export { getSnarky, getWasm, snarkyReady, shutdown };

let getSnarky = () => globalThis.__snarky;

function getWasm() {
  return globalThis.plonk_wasm;
}

let snarkyReady = initSnarkyJS();
let shutdown = () => {};
