// Debug existsOne function
// Created: July 4, 2025 12:00 AM UTC
// Last Modified: July 4, 2025 12:00 AM UTC

import { Field, switchBackend, getCurrentBackend, Provable } from './dist/node/index.js';

async function testExistsOneDirectly() {
  console.log('=== Testing existsOne directly ===');
  
  await switchBackend('sparky');
  console.log('Backend:', getCurrentBackend());
  
  const run = (await import('./dist/node/index.js')).Core.Run;
  
  // Test 1: Direct existsOne call
  console.log('1. Testing direct existsOne call...');
  try {
    const result1 = run.existsOne(() => {
      console.log('Compute function called in direct context');
      return Field(42);
    });
    console.log('Direct existsOne result:', result1);
  } catch (error) {
    console.log('Direct existsOne error:', error.message);
  }
  
  // Test 2: existsOne during constraint analysis
  console.log('2. Testing existsOne during constraint analysis...');
  try {
    const constraintSystem = Provable.constraintSystem(() => {
      console.log('Inside constraint system analysis...');
      
      const result2 = run.existsOne(() => {
        console.log('Compute function called during constraint analysis');
        return Field(99);
      });
      
      console.log('existsOne result during constraint analysis:', result2);
      return result2;
    });
    
    console.log('Constraint system completed, result:', constraintSystem);
  } catch (error) {
    console.log('Constraint analysis error:', error.message);
  }
}

testExistsOneDirectly().catch(console.error);