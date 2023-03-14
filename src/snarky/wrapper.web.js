import { initSnarkyJS, withThreadPool } from './web/web-backend.js';

export { getSnarky, getWasm, shutdown, withThreadPool };

let getSnarky = () => globalThis.__snarky;

function getWasm() {
  return globalThis.plonk_wasm;
}

await initSnarkyJS();
let shutdown = () => {};
