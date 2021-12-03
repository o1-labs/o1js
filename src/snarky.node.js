export {
  Field,
  Bool,
  Circuit,
  Poseidon,
  Group,
  Scalar,
  Ledger,
  shutdown,
  isReady,
};
let { proxyClasses } = require('./proxyClasses.js');
let snarkyServer = require('./node_bindings/snarky_js_node.bc.js');
let snarkySpec = require('./snarky-class-spec.json');

// proxy all classes, so subclasses can be declared at the top level, and static props still work later on
// currently this does not proxy class *instances*. So `new Field(5)` returns the same thing as before and only works after isReady
let { Field, Bool, Circuit, Poseidon, Group, Scalar, Ledger } = proxyClasses(
  () => snarkyServer,
  snarkySpec,
  () => isReadyBoolean
);
let isReadyBoolean = false;
let isReady = snarkyServer.snarky_ready.then(() => {
  isReadyBoolean = true;
});

let didShutdown = false;
function shutdown() {
  if (global.wasm_rayon_poolbuilder && !didShutdown) {
    didShutdown = true;
    global.wasm_rayon_poolbuilder.free();
    return Promise.all(
      global.wasm_workers.map(async (worker) => {
        await worker.terminate();
      })
    );
  }
}
