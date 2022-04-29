let snarky = require('./node_bindings/snarky_js_node.bc.js');

export { getSnarky, getWasm, snarky_ready, shutdown };

let getSnarky = () => snarky;
let snarky_ready = snarky.snarky_ready;

function getWasm() {
  return globalThis.jsoo_runtime.plonk_wasm;
}

let didShutdown = false;
async function shutdown() {
  if (global.wasm_rayon_poolbuilder && !didShutdown) {
    didShutdown = true;
    global.wasm_rayon_poolbuilder.free();
    await Promise.all(global.wasm_workers.map((worker) => worker.terminate()));
    process.exit(0);
  }
}
