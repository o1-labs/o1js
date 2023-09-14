import { wasm, withThreadPool } from './node/node-backend.js';

let snarky;

// this dynamic import makes jest respect the import order
// otherwise the cjs file gets imported before its implicit esm dependencies and fails
if (typeof require !== 'undefined') {
  snarky = require('../compiled/_node_bindings/snarky_js_node.bc.cjs');
} else {
  ESM: snarky = (
    await import('../compiled/_node_bindings/snarky_js_node.bc.cjs')
  ).default;
}

export { getSnarky, getWasm, withThreadPool };

let getSnarky = () => snarky;

function getWasm() {
  return wasm;
}
