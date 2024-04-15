import './bindings/crypto/bindings.js';
import {
  initializeBindings as init,
  withThreadPool,
} from './bindings/js/web/web-backend.js';

let Snarky, Ledger, Pickles, Test;
let isInitialized = false;

async function initializeBindings() {
  if (isInitialized) return;
  isInitialized = true;

  await init();
  ({ Snarky, Ledger, Pickles, Test } = globalThis.__snarky);
}

let wasm = globalThis.plonk_wasm;

export {
  Snarky,
  Ledger,
  Pickles,
  Test,
  withThreadPool,
  wasm,
  initializeBindings,
};
