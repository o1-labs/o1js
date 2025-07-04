#!/usr/bin/env node
/**
 * Debug assertEquals constraint generation
 */

import { Field, Provable, switchBackend, getCurrentBackend } from '../../../dist/node/index.js';

async function debugAssertEquals() {
  console.log('\n🔍 DEBUG: assertEquals Constraint Generation\n');

  // Test 1: Direct assertEquals on constant
  console.log('📊 Test 1: Direct assertEquals on constant');
  
  await switchBackend('snarky');
  console.log('\n=== SNARKY ===');
  const snarkyCS1 = await Provable.constraintSystem(() => {
    const x = Field(5);
    x.assertEquals(Field(5));
  });
  console.log(`Constraints: ${snarkyCS1.gates.length}`);
  console.log(`Gates: ${JSON.stringify(snarkyCS1.gates.map(g => g.type))}`);

  await switchBackend('sparky');
  console.log('\n=== SPARKY ===');
  const sparkyCS1 = await Provable.constraintSystem(() => {
    const x = Field(5);
    x.assertEquals(Field(5));
  });
  console.log(`Constraints: ${sparkyCS1.gates.length}`);
  console.log(`Gates: ${JSON.stringify(sparkyCS1.gates.map(g => g.type))}`);

  // Test 2: assertEquals on witness
  console.log('\n\n📊 Test 2: assertEquals on witness variable');
  
  await switchBackend('snarky');
  console.log('\n=== SNARKY ===');
  const snarkyCS2 = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    x.assertEquals(Field(5));
  });
  console.log(`Constraints: ${snarkyCS2.gates.length}`);
  console.log(`Gates: ${JSON.stringify(snarkyCS2.gates.map(g => g.type))}`);

  await switchBackend('sparky');
  console.log('\n=== SPARKY ===');
  const sparkyCS2 = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    x.assertEquals(Field(5));
  });
  console.log(`Constraints: ${sparkyCS2.gates.length}`);
  console.log(`Gates: ${JSON.stringify(sparkyCS2.gates.map(g => g.type))}`);

  // Test 3: assertEquals between two witnesses
  console.log('\n\n📊 Test 3: assertEquals between two witness variables');
  
  await switchBackend('snarky');
  console.log('\n=== SNARKY ===');
  const snarkyCS3 = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(5));
    x.assertEquals(y);
  });
  console.log(`Constraints: ${snarkyCS3.gates.length}`);
  console.log(`Gates: ${JSON.stringify(snarkyCS3.gates.map(g => g.type))}`);

  await switchBackend('sparky');
  console.log('\n=== SPARKY ===');  
  const sparkyCS3 = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(5));
    x.assertEquals(y);
  });
  console.log(`Constraints: ${sparkyCS3.gates.length}`);
  console.log(`Gates: ${JSON.stringify(sparkyCS3.gates.map(g => g.type))}`);

  // Test 4: Trace what happens with assertEquals
  console.log('\n\n📊 Test 4: Detailed trace of assertEquals');
  
  await switchBackend('sparky');
  console.log('\n=== SPARKY DETAILED TRACE ===');
  
  // We'll need to look at the internal implementation
  console.log('Creating witness variable...');
  const testCircuit = () => {
    const x = Provable.witness(Field, () => {
      console.log('  Inside witness callback');
      return Field(5);
    });
    console.log('  Witness created, calling assertEquals...');
    x.assertEquals(Field(5));
    console.log('  assertEquals completed');
  };
  
  console.log('Starting constraint system generation...');
  const sparkyCS4 = await Provable.constraintSystem(testCircuit);
  console.log(`Final constraints: ${sparkyCS4.gates.length}`);
  
  // Let's also check what happens with subtraction (which assertEquals uses internally)
  console.log('\n\n📊 Test 5: Field subtraction (used by assertEquals)');
  
  await switchBackend('snarky');
  console.log('\n=== SNARKY ===');
  const snarkyCS5 = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(5));
    const z = x.sub(y); // Should create a constraint
    z.assertEquals(Field(0)); // Should create another constraint
  });
  console.log(`Constraints: ${snarkyCS5.gates.length}`);
  
  await switchBackend('sparky');
  console.log('\n=== SPARKY ===');
  const sparkyCS5 = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(5));
    const z = x.sub(y); // Should create a constraint
    z.assertEquals(Field(0)); // Should create another constraint
  });
  console.log(`Constraints: ${sparkyCS5.gates.length}`);
  
  await switchBackend('snarky');
  console.log('\n✅ Test complete\n');
}

debugAssertEquals().catch(console.error);