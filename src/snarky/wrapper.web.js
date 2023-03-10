import { initSnarkyJS } from './web/plonk_init.js';

export {
  getSnarky,
  getWasm,
  snarkyReady,
  shutdown,
  initThreadPool,
  exitThreadPool,
};

let getSnarky = () => globalThis.__snarky;

function getWasm() {
  return globalThis.plonk_wasm;
}

let snarkyReady = initSnarkyJS();
let shutdown = () => {};

// TODO
async function initThreadPool() {}
async function exitThreadPool() {}
