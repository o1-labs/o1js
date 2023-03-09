import './prepare-node-backend.js';
import wasm from '../_node_bindings/plonk_wasm.cjs';

// console.log(wasm);

export { snarky_ready };

let snarky_ready = Promise.resolve();
