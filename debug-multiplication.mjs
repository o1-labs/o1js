import { Field, Provable, switchBackend } from './dist/node/index.js';

console.log('🔍 Testing field multiplication constraint count...');

// Test multiplication with both backends
async function testMultiplication() {
  console.log('\n=== Testing SNARKY backend ===');
  await switchBackend('snarky');
  
  const snarkyCircuit = () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    const z = x.mul(y);
    z.assertEquals(Field(12));
  };
  
  const snarkyCS = await Provable.constraintSystem(snarkyCircuit);
  console.log(`Snarky constraints: ${snarkyCS.gates.length}`);
  console.log('Snarky gates:', snarkyCS.gates.map(g => g.type));
  
  console.log('\n=== Testing SPARKY backend ===');
  await switchBackend('sparky');
  
  const sparkyCircuit = () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    const z = x.mul(y);
    z.assertEquals(Field(12));
  };
  
  const sparkyCS = await Provable.constraintSystem(sparkyCircuit);
  console.log(`Sparky constraints: ${sparkyCS.gates.length}`);
  console.log('Sparky gates:', sparkyCS.gates.map(g => g.type));
  
  console.log('\n=== ANALYSIS ===');
  console.log(`Constraint count match: ${snarkyCS.gates.length === sparkyCS.gates.length ? '✅' : '❌'}`);
  console.log(`Snarky: ${snarkyCS.gates.length}, Sparky: ${sparkyCS.gates.length}`);
}

testMultiplication().catch(console.error);