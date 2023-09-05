import { wasm, withThreadPool } from './node/node-backend.js';

// this dynamic import makes jest respect the import order
// otherwise the cjs file gets imported before its implicit esm dependencies and fails
let snarky = await import('../compiled/_node_bindings/snarky_js_node.bc.cjs');

export { getSnarky, getWasm, withThreadPool };

let getSnarky = () => snarky.default;

function getWasm() {
  return wasm;
}
