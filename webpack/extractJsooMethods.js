// run this script once to generate src/snarky-class-spec
let fs = require('fs').promises;
let snarky = require('../src/node_bindings/snarky_js_node.bc.js');

// classes that should be proxied
let classNames = ['Field', 'Bool', 'Circuit', 'Poseidon', 'Group', 'Scalar'];

(async () => {
  await snarky.isReady;

  let classList = [];
  for (let className of classNames) {
    let Class = snarky[className];
    let props = Object.keys(Class).map((key) => ({
      name: key,
      type: typeof Class[key],
    }));
    classList.push({ name: className, props });
  }

  let specJson = JSON.stringify(classList, null, 2);
  await fs.writeFile('src/snarky-class-spec.json', specJson);
  // this could be useful for the browser version:
  // await fs.writeFile('src/snarky-class-spec.js', 'export default ' + specJson);

  global.wasm_rayon_poolbuilder.free();
  global.wasm_workers.forEach((worker) => {
    worker.terminate();
  });
})();
