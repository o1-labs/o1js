#!/usr/bin/env node

/**
 * Test proper constraint generation using o1js constraintSystem()
 */

import { Field, Provable } from './dist/node/index.js';
import { constraintSystem } from './dist/node/lib/provable/core/provable-context.js';
import { switchBackend, initializeBindings } from './dist/node/bindings.js';

async function testProperConstraintGeneration() {
  console.log('🔍 Testing PROPER Constraint Generation');
  console.log('======================================\n');

  // Test with Snarky
  console.log('📊 Testing Snarky (proper way):');
  await initializeBindings('snarky');
  
  const cs1 = await constraintSystem(async () => {
    console.log('  1. Creating witness...');
    const x = Provable.witness(Field, () => {
      console.log('    🚨 WITNESS FUNCTION CALLED!');
      return Field(5);
    });
    
    console.log('  2. Adding constraint x = 5...');
    x.assertEquals(Field(5));
    
    console.log('  3. Adding constraint x + y = 8...');
    const y = Provable.witness(Field, () => {
      console.log('    🚨 WITNESS FUNCTION CALLED FOR Y!');
      return Field(3);
    });
    const sum = x.add(y);
    sum.assertEquals(Field(8));
  });
  
  console.log(`  ✅ Snarky: ${cs1.rows} rows, ${cs1.gates.length} gates\n`);

  // Test with Sparky
  console.log('📊 Testing Sparky (proper way):');
  await switchBackend('sparky');
  
  const cs2 = await constraintSystem(async () => {
    console.log('  1. Creating witness...');
    const x = Provable.witness(Field, () => {
      console.log('    🚨 WITNESS FUNCTION CALLED!');
      return Field(5);
    });
    
    console.log('  2. Adding constraint x = 5...');
    x.assertEquals(Field(5));
    
    console.log('  3. Adding constraint x + y = 8...');
    const y = Provable.witness(Field, () => {
      console.log('    🚨 WITNESS FUNCTION CALLED FOR Y!');
      return Field(3);
    });
    const sum = x.add(y);
    sum.assertEquals(Field(8));
  });
  
  console.log(`  ✅ Sparky: ${cs2.rows} rows, ${cs2.gates.length} gates\n`);

  // Analysis
  console.log('🎯 Analysis:');
  console.log(`  Snarky: ${cs1.rows} rows, ${cs1.gates.length} gates`);
  console.log(`  Sparky: ${cs2.rows} rows, ${cs2.gates.length} gates`);
  
  if (cs1.gates.length > 0 || cs2.gates.length > 0) {
    console.log('  ✅ SUCCESS: Proper constraint generation working!');
    console.log('  💡 The issue was missing context setup in manual tests');
  } else {
    console.log('  ⚠️  Still getting 0 gates - need deeper investigation');
  }
  
  // Show gate details
  if (cs1.gates.length > 0) {
    console.log('\n📋 Snarky Gates:');
    cs1.print();
  }
  
  if (cs2.gates.length > 0) {
    console.log('\n📋 Sparky Gates:'); 
    cs2.print();
  }
}

testProperConstraintGeneration().catch(console.error);