#!/usr/bin/env node
/**
 * Debug FieldVar format and isConstant detection
 */

import { Field, switchBackend, initializeBindings } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

console.log('=== FIELDVAR FORMAT DEBUG ===\n');

async function debugFieldVarFormat() {
  console.log('Testing FieldVar format with Sparky...');
  await switchBackend('sparky');
  await initializeBindings();
  
  // Create a witness variable through enterAsProver
  const enterAsProver = Snarky.run.enterAsProver(1);
  const result = enterAsProver(0); // 0 = None (create witness)
  console.log('enterAsProver result:', result);
  
  if (result && result.length > 1) {
    const fieldVar = result[1]; // First variable
    console.log('FieldVar:', fieldVar);
    console.log('FieldVar type:', typeof fieldVar);
    console.log('FieldVar isArray:', Array.isArray(fieldVar));
    
    if (Array.isArray(fieldVar)) {
      console.log('FieldVar structure:');
      console.log('  [0]:', fieldVar[0], typeof fieldVar[0]);
      console.log('  [1]:', fieldVar[1], typeof fieldVar[1]);
      if (Array.isArray(fieldVar[1])) {
        console.log('    [1][0]:', fieldVar[1][0], typeof fieldVar[1][0]);
        console.log('    [1][1]:', fieldVar[1][1], typeof fieldVar[1][1]);
      }
    }
    
    // Convert to Field and check if it's treated as constant
    try {
      const field = new Field(fieldVar);
      console.log('\nField object:');
      console.log('field.isConstant():', field.isConstant());
      console.log('field.value:', field.value);
      console.log('field.valueOf():', field.valueOf());
      
      if (field.isConstant()) {
        console.log('❌ PROBLEM: Field is treated as constant!');
        console.log('Constant value:', field.toBigInt());
      } else {
        console.log('✅ GOOD: Field is treated as variable');
      }
    } catch (error) {
      console.log('Error creating Field:', error.message);
    }
  }
}

debugFieldVarFormat().catch(console.error);