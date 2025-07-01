#!/usr/bin/env node
/**
 * Debug constraint system generation in Sparky
 */

import { Field, ZkProgram, switchBackend, initializeBindings } from './dist/node/index.js';

console.log('=== CONSTRAINT SYSTEM DEBUG ===\n');

async function debugConstraints() {
  console.log('Testing constraint system generation with Sparky...');
  await switchBackend('sparky');
  await initializeBindings();
  
  // Simple program with one constraint
  const SimpleProgram = ZkProgram({
    name: 'simple',
    publicInput: Field,
    methods: {
      run: {
        privateInputs: [Field],
        method(publicInput, secret) {
          secret.assertEquals(publicInput);
        }
      }
    }
  });
  
  try {
    console.log('Analyzing constraint system...');
    
    // Get the analysis data (this happens before compile)
    const analysis = await SimpleProgram.analyzeMethods();
    console.log('Analysis:', JSON.stringify(analysis, null, 2));
    
    console.log('\nConstraint system details:');
    console.log('- Rows:', analysis.rows);
    console.log('- Public input size:', analysis.publicInputSize);
    
  } catch (error) {
    console.error('Error during analysis:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugConstraints().catch(console.error);