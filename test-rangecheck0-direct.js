#!/usr/bin/env node

// Test to directly call rangeCheck0 to see error with stack trace

import { switchBackend } from './dist/node/index.js';
import { getSparkyInstance } from './dist/node/bindings/sparky-adapter/module-loader.js';

async function testRangeCheck0Direct() {
  console.log('Testing rangeCheck0 directly on Sparky backend...');
  
  await switchBackend('sparky');
  
  try {
    const sparky = getSparkyInstance();
    const gates = sparky.gates;
    
    // Try to call rangeCheck0 with invalid limbs array
    // rangeCheck0 expects: (x, xLimbs12 [6 elements], xLimbs2 [8 elements], isCompact)
    const x = [1, 1]; // FieldVar for variable 1
    const xLimbs12 = []; // This should have 6 elements
    const xLimbs2 = []; // This should have 8 elements
    const isCompact = false;
    
    console.log('Calling rangeCheck0 with invalid limbs arrays...');
    gates.rangeCheck0(x, xLimbs12, xLimbs2, isCompact);
    
    console.log('Range check succeeded (unexpected)');
  } catch (error) {
    console.error('Full error:', error);
    console.error('\nError type:', typeof error);
    console.error('Error constructor:', error.constructor.name);
    console.error('\nStack trace:');
    console.error(error.stack || 'No stack trace available');
    
    // If it's a string error, create a proper Error
    if (typeof error === 'string') {
      const properError = new Error(error);
      console.error('\nProper error stack:');
      console.error(properError.stack);
    }
  }
}

testRangeCheck0Direct().catch(console.error);