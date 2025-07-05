#!/usr/bin/env node

// Test to reproduce xLimbs12 error with full stack trace

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function testRangeCheck() {
  console.log('Testing range check on Sparky backend...');
  
  await switchBackend('sparky');
  
  try {
    // Run within constraint system to reproduce the error
    const cs = await Provable.constraintSystem(() => {
      const value = Provable.witness(Field, () => Field(100));
      const maxValue = Field(255);
      
      // This should trigger the xLimbs12 error
      value.assertLessThan(maxValue.add(Field(1)));
      
      return value;
    });
    
    console.log('Constraint system generated successfully');
    console.log('Gates:', cs.gates.length);
  } catch (error) {
    console.error('Full error:', error);
    console.error('\nStack trace:');
    console.error(error.stack);
  }
}

testRangeCheck().catch(console.error);