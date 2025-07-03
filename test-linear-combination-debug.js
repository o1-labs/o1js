#!/usr/bin/env node

/**
 * DEBUG: Linear combination and internal variable creation
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

async function testLinearCombinationDebug() {
  console.log('🔬 LINEAR COMBINATION DEBUG');
  console.log('==========================');
  
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  console.log('\n📊 TEST 1: Track variable creation in constraint vs witness mode');
  console.log('--------------------------------------------------------------');
  
  // First, generate constraints
  console.log('\n🔍 CONSTRAINT GENERATION MODE:');
  const cs = await Provable.constraintSystem(() => {
    console.log('Creating witness a...');
    const a = Provable.witness(Field, () => Field.from(3));
    console.log('- a created');
    
    console.log('Creating witness b...');
    const b = Provable.witness(Field, () => Field.from(4));
    console.log('- b created');
    
    console.log('Computing c = a.mul(b)...');
    const c = a.mul(b);
    console.log('- c created');
    
    console.log('Asserting c.assertEquals(12)...');
    c.assertEquals(Field.from(12));
    console.log('- assertion added');
  });
  
  console.log('\n✅ Constraint system generated');
  console.log('- Gates:', cs.gates.length);
  
  // Extract variable information from constraints
  const varIds = new Set();
  cs.gates.forEach((gate, i) => {
    console.log(`\nGate ${i}:`, gate.typ);
    if (gate.wires) {
      gate.wires.forEach(wire => {
        console.log(`  Wire: row=${wire.row}, col=${wire.col}`);
      });
    }
  });
  
  console.log('\n🔍 WITNESS GENERATION MODE:');
  try {
    await Provable.runAndCheck(() => {
      console.log('Creating witness a...');
      const a = Provable.witness(Field, () => Field.from(3));
      console.log('- a.value:', a.value);
      
      console.log('Creating witness b...');
      const b = Provable.witness(Field, () => Field.from(4));
      console.log('- b.value:', b.value);
      
      console.log('Computing c = a.mul(b)...');
      const c = a.mul(b);
      console.log('- c.value:', c.value);
      
      console.log('Asserting c.assertEquals(12)...');
      c.assertEquals(Field.from(12));
      console.log('- assertion checked');
    });
    console.log('✅ Witness generation passed');
  } catch (error) {
    console.log('❌ Witness generation failed:', error.message);
    
    // Try to extract more info about the error
    if (error.message.includes('VarId')) {
      const match = error.message.match(/VarId\((\d+)\)/g);
      if (match) {
        console.log('Variable IDs mentioned in error:', match);
      }
    }
  }
  
  console.log('\n📊 TEST 2: Direct assertMul with pre-created witnesses');
  console.log('------------------------------------------------------');
  
  try {
    await Provable.runAndCheck(() => {
      // Create all witnesses first
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      const c = Provable.witness(Field, () => Field.from(12));
      
      console.log('Witnesses created:');
      console.log('- a.value:', a.value);
      console.log('- b.value:', b.value);
      console.log('- c.value:', c.value);
      
      // Import assertMul
      import('./dist/node/lib/provable/gadgets/basic.js').then(({ assertMul }) => {
        console.log('\nCalling assertMul(a, b, c)...');
        assertMul(a, b, c);
        console.log('✅ assertMul succeeded');
      });
    });
  } catch (error) {
    console.log('❌ Direct assertMul failed:', error.message);
  }
  
  console.log('\n📊 TEST 3: Check if Field.mul creates extra variables');
  console.log('----------------------------------------------------');
  
  // Patch existsOne to track calls
  const { existsOne } = await import('./dist/node/lib/provable/core/exists.js');
  let existsOneCalls = 0;
  const originalExistsOne = Snarky.run.existsOne;
  
  Snarky.run.existsOne = function(...args) {
    existsOneCalls++;
    console.log(`🔍 [TRACE] existsOne call #${existsOneCalls}`);
    const result = originalExistsOne.apply(this, args);
    console.log(`- Result:`, result);
    return result;
  };
  
  try {
    const cs2 = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      const c = a.mul(b);
      c.assertEquals(Field.from(12));
    });
    console.log('✅ Constraint generation with patched existsOne');
    console.log(`- existsOne calls: ${existsOneCalls}`);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testLinearCombinationDebug().catch(console.error);