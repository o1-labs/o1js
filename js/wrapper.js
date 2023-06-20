import { wasm, withThreadPool } from './node/node-backend.js';
import { default as snarky } from '../compiled/_node_bindings/snarky_js_node.bc.cjs';

export { getSnarky, getWasm, withThreadPool };

let getSnarky = () => snarky;

function getWasm() {
  return wasm;
}
