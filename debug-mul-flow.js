#!/usr/bin/env node

/**
 * Debug Multiplication Flow
 * 
 * This script traces the exact flow of Field.mul() to identify where
 * the Add(Var(VarId), Constant(...)) expression is coming from.
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugMultiplicationFlow() {
  console.log('🔍 Debugging Field.mul() Flow');
  console.log('============================');
  
  // Switch to Sparky to see the debug output
  if (getCurrentBackend() !== 'sparky') {
    await switchBackend('sparky');
  }
  
  console.log('Testing simple multiplication: 3 * 4');
  
  // Capture the exact sequence
  await Provable.runAndCheck(() => {
    console.log('\n1. Creating witness variables:');
    const a = Provable.witness(Field, () => {
      console.log('   Creating a = 3');
      return Field(3);
    });
    
    const b = Provable.witness(Field, () => {
      console.log('   Creating b = 4');
      return Field(4);
    });
    
    console.log('\n2. Calling a.mul(b):');
    const result = a.mul(b);
    console.log('   result =', result);
    
    console.log('\n3. Calling result.assertEquals(12):');
    // This is where we see the Add expression in debug output
    result.assertEquals(Field(12));
    
    console.log('\n4. Completed constraint generation');
  });
  
  console.log('\n🔍 Analysis:');
  console.log('=============');
  console.log('Check the debug output above to see:');
  console.log('1. What does a.mul(b) return exactly?');
  console.log('2. When does the Add(Var, Constant) appear?');
  console.log('3. Is it in mul() or in assertEquals()?');
}

// Run the debug
debugMultiplicationFlow().catch(console.error);