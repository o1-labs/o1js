import { Field, Provable, switchBackend } from './dist/node/index.js';

console.log('🔍 Testing assertEquals ONLY...');

// Test assertEquals without multiplication
async function testAssertEqualsOnly() {
  console.log('\n=== Testing SNARKY backend ===');
  await switchBackend('snarky');
  
  const snarkyCircuit = () => {
    const x = Provable.witness(Field, () => Field(12));
    x.assertEquals(Field(12));  // Just assert a witness equals a constant
  };
  
  const snarkyCS = await Provable.constraintSystem(snarkyCircuit);
  console.log(`Snarky constraints: ${snarkyCS.gates.length}`);
  console.log('Snarky gates:', snarkyCS.gates.map(g => g.type));
  
  console.log('\n=== Testing SPARKY backend ===');
  await switchBackend('sparky');
  
  const sparkyCircuit = () => {
    const x = Provable.witness(Field, () => Field(12));
    x.assertEquals(Field(12));  // Just assert a witness equals a constant
  };
  
  const sparkyCS = await Provable.constraintSystem(sparkyCircuit);
  console.log(`Sparky constraints: ${sparkyCS.gates.length}`);
  console.log('Sparky gates:', sparkyCS.gates.map(g => g.type));
  
  console.log('\n=== ANALYSIS ===');
  console.log(`Constraint count match: ${snarkyCS.gates.length === sparkyCS.gates.length ? '✅' : '❌'}`);
  console.log(`Snarky: ${snarkyCS.gates.length}, Sparky: ${sparkyCS.gates.length}`);
}

testAssertEqualsOnly().catch(console.error);