export {
  Field,
  Bool,
  Circuit,
  Poseidon,
  Group,
  Scalar,
  shutdown,
  snarkyReady,
  isSnarkyReady,
};
let snarkyServer = require('./node_bindings/snarky_js_node.bc.js');
let snarkySpec = require('./snarky-class-spec.json');

// proxy all classes, so subclasses can be declared at the top level, and static props still work later on
// currently this does not proxy class *instances*. So `new Field(5)` returns the same thing as before and only works after snarkyReady
let { Field, Bool, Circuit, Poseidon, Group, Scalar } = proxyClasses(
  snarkyServer,
  snarkySpec
);
let isSnarkyReady = false;
let snarkyReady = snarkyServer.snarky_ready.then(() => {
  isSnarkyReady = true;
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

function proxyClasses(moduleObject, moduleSpec) {
  let moduleProxy = {};
  for (let classSpec of moduleSpec) {
    let className = classSpec.name;
    // constructor
    let Class = function (...args) {
      if (!isSnarkyReady) throw Error(constructError(className));
      return new moduleObject[className](...args);
    };
    for (let prop of classSpec.props) {
      let propName = prop.name;
      if (prop.type === 'function') {
        // static method
        Class[propName] = function (...args) {
          if (!isSnarkyReady) throw Error(methodError(className, propName));
          return moduleObject[className][propName].apply(this, args);
        };
      } else {
        // other static prop
        Object.defineProperty(Class, propName, {
          get: function () {
            return moduleObject[className][propName];
          },
        });
      }
    }
    moduleProxy[className] = Class;
  }
  return moduleProxy;
}

let constructError = (
  className
) => `Cannot call class constructor because snarkyjs has not finished loading.
Try calling \`await snarkyReady\` before \`new ${className}()\``;
let methodError = (
  className,
  methodName
) => `Cannot call static method because snarkyjs has not finished loading.
Try calling \`await snarkyReady\` before \`${className}.${methodName}()\``;
