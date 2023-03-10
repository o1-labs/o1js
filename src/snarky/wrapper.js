import {
  snarkyReady,
  wasm,
  initThreadPool,
  exitThreadPool,
  shutdown,
} from './node/node-backend.js';
import { default as snarky } from '../_node_bindings/snarky_js_node.bc.cjs';

export {
  getSnarky,
  getWasm,
  snarkyReady,
  shutdown,
  initThreadPool,
  exitThreadPool,
};

let getSnarky = () => snarky;

function getWasm() {
  return wasm;
}
