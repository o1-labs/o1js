import { Field, Provable, initializeBindings, switchBackend } from './dist/node/index.js';

console.log('=== Testing Constraint Routing Fix ===\n');

await initializeBindings();

// Test simple circuit with routing tracking
const testCircuit = () => {
  const x = Provable.witness(Field, () => Field(3));
  const y = Provable.witness(Field, () => Field(5));
  const sum = x.add(y);
  sum.assertEquals(Field(8));
};

console.log('🧪 Testing with Snarky backend...');
const snarkyCS = await Provable.constraintSystem(testCircuit);
console.log(`Snarky constraints: ${snarkyCS.gates.length}`);

// Get routing stats if available
try {
  const sparkyAdapter = await import('./src/bindings/sparky-adapter.js');
  if (sparkyAdapter.getConstraintFlowStats) {
    const stats = sparkyAdapter.getConstraintFlowStats();
    console.log('Snarky routing stats:', stats);
  }
} catch (e) {
  console.log('Could not get routing stats:', e.message);
}

console.log('\n🔄 Switching to Sparky backend...');
await switchBackend('sparky');

console.log('🧪 Testing with Sparky backend...');
const sparkyCS = await Provable.constraintSystem(testCircuit);
console.log(`Sparky constraints: ${sparkyCS.gates.length}`);

// Get routing stats for Sparky
try {
  const sparkyAdapter = await import('./src/bindings/sparky-adapter.js');
  if (sparkyAdapter.getConstraintFlowStats) {
    const stats = sparkyAdapter.getConstraintFlowStats();
    console.log('Sparky routing stats:', stats);
  }
} catch (e) {
  console.log('Could not get routing stats:', e.message);
}

console.log('\n📊 Constraint Count Comparison:');
console.log(`Snarky: ${snarkyCS.gates.length} constraints`);
console.log(`Sparky: ${sparkyCS.gates.length} constraints`);
console.log(`Inflation: ${((sparkyCS.gates.length / snarkyCS.gates.length - 1) * 100).toFixed(1)}%`);

// Check if routing fix worked
const routingWorked = sparkyCS.gates.length !== snarkyCS.gates.length;
console.log(`\n✅ Routing fix validation: ${routingWorked ? 'Different results (routing works)' : 'Identical results (potential routing bug)'}`);

process.exit(0);