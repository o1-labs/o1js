export { Field, Bool, Circuit, Poseidon, Group, Scalar, shutdown, snarkyReady };
let snarkyServer = require('./node_bindings/snarky_js_node.bc.js');
let snarkySpec = require('./snarky-class-spec.json');

// proxy all classes, so subclasses can be declared at the top level, and static props still work later on
let snarkyProxies = {};
for (let classSpec of snarkySpec) {
  let className = classSpec.name;
  // constructor
  let Class = function (...args) {
    return new snarkyServer[className](...args);
  };
  for (let prop of classSpec.props) {
    let propName = prop.name;
    if (prop.type === 'function') {
      // static method
      Class[propName] = function (...args) {
        return snarkyServer[className][propName].apply(this, args);
      };
    } else {
      // other static prop
      Object.defineProperty(Class, propName, {
        get: function () {
          return snarkyServer[className][propName];
        },
      });
    }
  }
  snarkyProxies[className] = Class;
}
let { Field, Bool, Circuit, Poseidon, Group, Scalar } = snarkyProxies;

let snarkyReady = snarkyServer.snarky_ready.then(() => {
  // Field = snarkyServer.Field;
  // Bool = snarkyServer.Bool;
  // Circuit = snarkyServer.Circuit;
  // Poseidon = snarkyServer.Poseidon;
  // Group = snarkyServer.Group;
  // Scalar = snarkyServer.Scalar;
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
