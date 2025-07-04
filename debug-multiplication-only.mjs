import { Field, Provable, switchBackend } from './dist/node/index.js';

console.log('🔍 Testing field multiplication ONLY (no assertEquals)...');

// Test multiplication without assertEquals
async function testMultiplicationOnly() {
  console.log('\n=== Testing SNARKY backend ===');
  await switchBackend('snarky');
  
  const snarkyCircuit = () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    const z = x.mul(y);  // NO assertEquals here
  };
  
  const snarkyCS = await Provable.constraintSystem(snarkyCircuit);
  console.log(`Snarky constraints: ${snarkyCS.gates.length}`);
  console.log('Snarky gates:', snarkyCS.gates.map(g => g.type));
  
  console.log('\n=== Testing SPARKY backend ===');
  await switchBackend('sparky');
  
  const sparkyCircuit = () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    const z = x.mul(y);  // NO assertEquals here
  };
  
  const sparkyCS = await Provable.constraintSystem(sparkyCircuit);
  console.log(`Sparky constraints: ${sparkyCS.gates.length}`);
  console.log('Sparky gates:', sparkyCS.gates.map(g => g.type));
  
  console.log('\n=== ANALYSIS ===');
  console.log(`Constraint count match: ${snarkyCS.gates.length === sparkyCS.gates.length ? '✅' : '❌'}`);
  console.log(`Snarky: ${snarkyCS.gates.length}, Sparky: ${sparkyCS.gates.length}`);
}

testMultiplicationOnly().catch(console.error);