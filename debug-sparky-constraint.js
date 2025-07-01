#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function debugConstraintGeneration() {
  console.log('🔍 Debug Sparky Constraint Generation\n');
  
  const simpleCircuit = () => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    a.add(b).assertEquals(c);
  };
  
  try {
    // Test with Snarky first for reference
    console.log('📊 Testing with Snarky backend...');
    await switchBackend('snarky');
    const snarkyCS = await Provable.constraintSystem(simpleCircuit);
    console.log('Snarky coefficients:', snarkyCS.gates[0].coeffs);
    
    // Test with Sparky to compare
    console.log('\n📊 Testing with Sparky backend...');
    await switchBackend('sparky');
    
    // Force stderr to be visible
    console.error('--- SPARKY DEBUG OUTPUT START ---');
    const sparkyCS = await Provable.constraintSystem(simpleCircuit);
    console.error('--- SPARKY DEBUG OUTPUT END ---');
    
    console.log('Sparky coefficients:', sparkyCS.gates[0].coeffs);
    
    // Detailed comparison
    console.log('\n🔍 Coefficient Analysis:');
    console.log('Expected (Snarky): [1, 1, -1, 0, 0]');
    console.log('Actual (Sparky):  ', sparkyCS.gates[0].coeffs);
    
    // Check what -1 should be in field representation
    const field = Field(1).neg();
    console.log('\nField(-1) =', field.toString());
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

debugConstraintGeneration().catch(console.error);