import { initSnarkyJS } from '../chrome_bindings/plonk_init.js';

export { getSnarky, getWasm, snarky_ready, shutdown };

let getSnarky = () => globalThis.__snarky;

function getWasm() {
  return globalThis.plonk_wasm;
}

let snarky_ready = initSnarkyJS();
let shutdown = () => {};
