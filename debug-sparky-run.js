const path = '/home/fizzixnerd/src/o1labs/o1js2/src/sparky/sparky-wasm/pkg-node/sparky_wasm.js';
const sparkyModule = require(path);
const instance = new sparkyModule.SnarkyConstraintSystemCompat();

console.log('Run module methods:');
console.log(Object.getOwnPropertyNames(instance.run).filter(name => !name.startsWith('_')));

console.log('\nInProver type:', typeof instance.run.inProver);

if (instance.run.inProver) {
  console.log('InProver callable:', typeof instance.run.inProver === 'function');
  try {
    const result = instance.run.inProver();
    console.log('InProver result:', result);
    console.log('InProver result type:', typeof result);
  } catch (e) {
    console.log('InProver error:', e.message);
  }
}

console.log('\nRun module structure:');
for (const prop of Object.getOwnPropertyNames(instance.run)) {
  if (!prop.startsWith('_')) {
    console.log(`  ${prop}: ${typeof instance.run[prop]}`);
  }
}