#!/usr/bin/env node
/**
 * Simple constraint counting debug script
 * Run with: node src/test/parity/debug-constraints-simple.mjs
 */

import { Field, Provable, Bool, switchBackend, getCurrentBackend } from '../../../dist/node/index.js';

async function testConstraintCount() {
  console.log('\n🔍 CONSTRAINT COUNT DEBUG TEST\n');
  
  const originalBackend = getCurrentBackend();
  console.log(`Current backend: ${originalBackend}`);

  // Test 1: Simple assertEquals
  console.log('\n📊 Test 1: Simple assertEquals');
  try {
    // Snarky
    await switchBackend('snarky');
    const snarkyCS1 = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(5));
      x.assertEquals(Field(5));
    });
    console.log(`  Snarky constraints: ${snarkyCS1.gates.length}`);
    console.log(`  Snarky gate types: ${JSON.stringify(snarkyCS1.gates.map(g => g.type))}`);
    
    // Sparky
    await switchBackend('sparky');
    const sparkyCS1 = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(5));
      x.assertEquals(Field(5));
    });
    console.log(`  Sparky constraints: ${sparkyCS1.gates.length}`);
    console.log(`  Sparky gate types: ${JSON.stringify(sparkyCS1.gates.map(g => g.type))}`);
    console.log(`  Match: ${snarkyCS1.gates.length === sparkyCS1.gates.length ? '✅' : '❌'}`);
  } catch (error) {
    console.error('  Error:', error.message);
  }

  // Test 2: Field addition
  console.log('\n📊 Test 2: Field addition');
  try {
    // Snarky
    await switchBackend('snarky');
    const snarkyCS2 = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(5));
      const y = Provable.witness(Field, () => Field(7));
      const z = x.add(y);
      z.assertEquals(Field(12));
    });
    console.log(`  Snarky constraints: ${snarkyCS2.gates.length}`);
    
    // Sparky
    await switchBackend('sparky');
    const sparkyCS2 = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(5));
      const y = Provable.witness(Field, () => Field(7));
      const z = x.add(y);
      z.assertEquals(Field(12));
    });
    console.log(`  Sparky constraints: ${sparkyCS2.gates.length}`);
    console.log(`  Match: ${snarkyCS2.gates.length === sparkyCS2.gates.length ? '✅' : '❌'}`);
  } catch (error) {
    console.error('  Error:', error.message);
  }

  // Test 3: Empty circuit
  console.log('\n📊 Test 3: Empty circuit');
  try {
    // Snarky
    await switchBackend('snarky');
    const snarkyCS3 = await Provable.constraintSystem(() => {
      // Empty
    });
    console.log(`  Snarky constraints: ${snarkyCS3.gates.length}`);
    
    // Sparky
    await switchBackend('sparky');
    const sparkyCS3 = await Provable.constraintSystem(() => {
      // Empty
    });
    console.log(`  Sparky constraints: ${sparkyCS3.gates.length}`);
    console.log(`  Match: ${snarkyCS3.gates.length === sparkyCS3.gates.length ? '✅' : '❌'}`);
  } catch (error) {
    console.error('  Error:', error.message);
  }

  // Test 4: Multiplication
  console.log('\n📊 Test 4: Field multiplication');
  try {
    // Snarky
    await switchBackend('snarky');
    const snarkyCS4 = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(5));
      const y = Provable.witness(Field, () => Field(7));
      const z = x.mul(y);
      z.assertEquals(Field(35));
    });
    console.log(`  Snarky constraints: ${snarkyCS4.gates.length}`);
    
    // Sparky
    await switchBackend('sparky');
    const sparkyCS4 = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(5));
      const y = Provable.witness(Field, () => Field(7));
      const z = x.mul(y);
      z.assertEquals(Field(35));
    });
    console.log(`  Sparky constraints: ${sparkyCS4.gates.length}`);
    console.log(`  Match: ${snarkyCS4.gates.length === sparkyCS4.gates.length ? '✅' : '❌'}`);
  } catch (error) {
    console.error('  Error:', error.message);
  }

  // Test 5: Boolean check
  console.log('\n📊 Test 5: Boolean check');
  try {
    // Snarky
    await switchBackend('snarky');
    const snarkyCS5 = await Provable.constraintSystem(() => {
      const b = Provable.witness(Bool, () => Bool(true));
      b.assertTrue();
    });
    console.log(`  Snarky constraints: ${snarkyCS5.gates.length}`);
    
    // Sparky
    await switchBackend('sparky');
    const sparkyCS5 = await Provable.constraintSystem(() => {
      const b = Provable.witness(Bool, () => Bool(true));
      b.assertTrue();
    });
    console.log(`  Sparky constraints: ${sparkyCS5.gates.length}`);
    console.log(`  Match: ${snarkyCS5.gates.length === sparkyCS5.gates.length ? '✅' : '❌'}`);
  } catch (error) {
    console.error('  Error:', error.message);
  }

  // Restore original backend
  await switchBackend(originalBackend);
  console.log(`\n✅ Restored backend to: ${originalBackend}\n`);
}

// Run the test
testConstraintCount().catch(console.error);