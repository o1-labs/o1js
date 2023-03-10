import { wasm, initThreadPool, shutdown } from './node/node-backend.js';
import { default as snarky } from '../_node_bindings/snarky_js_node.bc.cjs';

export { getSnarky, getWasm, shutdown, initThreadPool };

let getSnarky = () => snarky;

function getWasm() {
  return wasm;
}
