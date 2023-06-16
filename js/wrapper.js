import { wasm, withThreadPool } from './node/node-backend.js';
// TODO: the modified directory _node_bindings (with underscore) is a hack to
// prevent typescript from processing this folder.
// any cleaner solution is appreciated!
import { default as snarky } from '../compiled/_node_bindings/snarky_js_node.bc.cjs';

export { getSnarky, getWasm, withThreadPool };

let getSnarky = () => snarky;

function getWasm() {
  return wasm;
}
