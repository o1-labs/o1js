#!/usr/bin/env node

/**
 * Debug script to investigate boolean constraint generation
 */

import { initializeBindings, Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testBooleanConstraints() {
  await initializeBindings();

  console.log('\n=== Testing ACTUAL Boolean Constraints ===');
  
  // Test with Snarky first
  await switchBackend('snarky');
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  const snarkyCS = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(1));
    console.log('Snarky: About to call assertBool');
    a.assertBool(); // This should call assertBoolean
  });
  
  console.log(`Snarky Boolean constraint count: ${snarkyCS.gates.length}`);
  
  // Test with Sparky
  await switchBackend('sparky');
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  const sparkyCS = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(1));
    console.log('Sparky: About to call assertBool');
    a.assertBool(); // This should call assertBoolean
  });
  
  console.log(`Sparky Boolean constraint count: ${sparkyCS.gates.length}`);
  
  console.log('\n=== Testing Field Multiplication (False Boolean Test) ===');
  
  // Test the "boolean logic" test from the VK parity (which doesn't actually use boolean constraints)
  await switchBackend('snarky');
  const snarkyMultCS = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(1));
    const b = Provable.witness(Field, () => Field(0));
    a.mul(b).assertEquals(Field(0)); // NOT a boolean constraint
  });
  
  console.log(`Snarky "boolean logic" (field mult) constraint count: ${snarkyMultCS.gates.length}`);
  
  await switchBackend('sparky');
  const sparkyMultCS = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(1));
    const b = Provable.witness(Field, () => Field(0));
    a.mul(b).assertEquals(Field(0)); // NOT a boolean constraint
  });
  
  console.log(`Sparky "boolean logic" (field mult) constraint count: ${sparkyMultCS.gates.length}`);
  
  console.log('\n=== Results ===');
  console.log(`Actual Boolean constraints - Snarky: ${snarkyCS.gates.length}, Sparky: ${sparkyCS.gates.length}`);
  console.log(`Fake Boolean test (field mult) - Snarky: ${snarkyMultCS.gates.length}, Sparky: ${sparkyMultCS.gates.length}`);
  
  if (snarkyCS.gates.length !== sparkyCS.gates.length) {
    console.log('❌ REAL Boolean constraint count mismatch!');
  } else {
    console.log('✅ REAL Boolean constraint counts match');
  }
  
  if (snarkyMultCS.gates.length !== sparkyMultCS.gates.length) {
    console.log('❌ Fake Boolean test (field mult) constraint count mismatch!');
  } else {
    console.log('✅ Fake Boolean test (field mult) constraint counts match');
  }
}

testBooleanConstraints().catch(console.error);