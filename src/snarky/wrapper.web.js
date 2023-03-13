import { initSnarkyJS, withThreadPool } from './web/web-backend.js';

export { getSnarky, getWasm, snarkyReady, shutdown, withThreadPool };

let getSnarky = () => globalThis.__snarky;

function getWasm() {
  return globalThis.plonk_wasm;
}

let snarkyReady = initSnarkyJS();
let shutdown = () => {};
