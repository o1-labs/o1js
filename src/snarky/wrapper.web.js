import { initSnarkyJS } from './web/plonk_init.js';

export { getSnarky, getWasm, shutdown, initThreadPool };

let getSnarky = () => globalThis.__snarky;

function getWasm() {
  return globalThis.plonk_wasm;
}

await initSnarkyJS();
let shutdown = () => {};

// TODO
async function initThreadPool() {}
