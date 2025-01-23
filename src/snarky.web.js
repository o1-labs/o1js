import './bindings/crypto/bindings.js';
import {
  initializeBindings as init,
  withThreadPool,
  wasm,
} from './bindings/js/web/web-backend.js';

let Snarky, Ledger, Pickles, Test_, OCamlobject;
let isInitialized = false;

async function initializeBindings() {
  if (isInitialized) return;
  isInitialized = true;

  await init();
  ({ Snarky, Ledger, Pickles, Test: Test_, OCamlobject } = globalThis.__snarky);
}

async function Test() {
  await initializeBindings();
  return Test_;
}

export {
  Snarky,
  Ledger,
  Pickles,
  Test,
  withThreadPool,
  OCamlobject,
  wasm,
  initializeBindings,
  isInitialized as areBindingsInitialized,
};
