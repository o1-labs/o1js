let Field, Bool, Circuit, Poseidon, Group, Scalar;
export { Field, Bool, Circuit, Poseidon, Group, Scalar, shutdown, snarkyReady };
let snarkyServer = require('./node_bindings/snarky_js_node.bc.js');

let snarkyReady = snarkyServer.snarky_ready.then(() => {
  Field = snarkyServer.Field;
  Bool = snarkyServer.Bool;
  Circuit = snarkyServer.Circuit;
  Poseidon = snarkyServer.Poseidon;
  Group = snarkyServer.Group;
  Scalar = snarkyServer.Scalar;
});

function shutdown() {
  if (global.wasm_rayon_poolbuilder) {
    global.wasm_rayon_poolbuilder.free();
    return Promise.all(
      global.wasm_workers.map(async (worker) => {
        await worker.terminate();
      })
    );
  }
}
