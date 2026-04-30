import './bindings/crypto/bindings.js';
import { getBackendPreference, lockBackend } from './lib/backend.js';

// assigned via initializeBindings()
export let wasm;
export let withThreadPool;

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

  lockBackend();

  if (getBackendPreference() === 'native') {
    ({ wasm, withThreadPool } = await import('./bindings/js/node/native-backend.js'));
  } else {
    ({ wasm, withThreadPool } = await import('./bindings/js/node/node-backend.js'));
  }

  // this dynamic import makes jest respect the import order
  // otherwise the cjs file gets imported before its implicit esm dependencies and fails
  CJS: if (typeof require !== 'undefined') {
    snarky = require('./bindings/compiled/node_bindings/o1js_node.bc.cjs');
  }
  ESM: snarky = (await import('./bindings/compiled/node_bindings/o1js_node.bc.cjs')).default;
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
  Ledger,
  Pickles,
  Snarky,
  Test,
  isInitialized as areBindingsInitialized,
  initializeBindings,
};
