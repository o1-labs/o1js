import './bindings/crypto/bindings.js';
import { wasm, withThreadPool } from './bindings/js/node/node-backend.js';

let Snarky, Ledger, Pickles, Test_;
let isInitialized = false;
let initializingPromise;

async function initializeBindings() {
  if (isInitialized) return;
  if (initializingPromise) {
    await initializingPromise;
    return;
  }
  let snarky;
  let resolve;
  initializingPromise = new Promise((r) => (resolve = r));

  // this dynamic import makes jest respect the import order
  // otherwise the cjs file gets imported before its implicit esm dependencies and fails
  CJS: if (typeof require !== 'undefined') {
    snarky = require('./bindings/compiled/_node_bindings/o1js_node.bc.cjs');
  }
  ESM: snarky = (await import('./bindings/compiled/_node_bindings/o1js_node.bc.cjs')).default;
  ({ Snarky, Ledger, Pickles, Test: Test_ } = snarky);
  resolve();
  initializingPromise = undefined;
  isInitialized = true;
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
  wasm,
  initializeBindings,
  isInitialized as areBindingsInitialized,
};
