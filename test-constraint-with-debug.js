#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function testConstraints() {
  console.log('🔍 Testing Constraint Generation\n');
  
  const simpleCircuit = () => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    a.add(b).assertEquals(c);
  };
  
  try {
    // Test with Snarky
    console.log('📊 Snarky backend:');
    await switchBackend('snarky');
    const snarkyCS = await Provable.constraintSystem(simpleCircuit);
    console.log('Gates:', snarkyCS.gates.length);
    console.log('Coefficients:', snarkyCS.gates[0].coeffs);
    console.log('Digest:', snarkyCS.digest);
    
    // Test with Sparky
    console.log('\n📊 Sparky backend:');
    await switchBackend('sparky');
    
    // This will trigger stderr output
    console.error('\n--- SPARKY DEBUG ---');
    const sparkyCS = await Provable.constraintSystem(simpleCircuit);
    console.error('--- END DEBUG ---\n');
    
    console.log('Gates:', sparkyCS.gates.length);
    console.log('Coefficients:', sparkyCS.gates[0].coeffs);
    console.log('Digest:', sparkyCS.digest);
    
    // Compare
    console.log('\n🔍 Comparison:');
    console.log('Coefficients match:', JSON.stringify(snarkyCS.gates[0].coeffs) === JSON.stringify(sparkyCS.gates[0].coeffs));
    console.log('Digests match:', snarkyCS.digest === sparkyCS.digest);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testConstraints().catch(console.error);