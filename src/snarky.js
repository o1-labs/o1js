import './bindings/crypto/bindings.js';
import { wasm, withThreadPool } from './bindings/js/node/node-backend.js';

let snarky;

// this dynamic import makes jest respect the import order
// otherwise the cjs file gets imported before its implicit esm dependencies and fails
CJS: if (typeof require !== 'undefined') {
  snarky = require('./bindings/compiled/_node_bindings/o1js_node.bc.cjs');
}
ESM: snarky = (
  await import('./bindings/compiled/_node_bindings/o1js_node.bc.cjs')
).default;

let { Snarky, Ledger, Pickles, Test } = snarky;

export { Snarky, Ledger, Pickles, Test, withThreadPool, wasm };
