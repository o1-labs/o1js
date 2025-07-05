// Debug exists() mode detection
// Created: July 4, 2025 12:00 AM UTC
// Last Modified: July 4, 2025 12:00 AM UTC

import { Field, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testExistsMode() {
  console.log('=== Testing exists() Mode Detection ===');
  
  await switchBackend('sparky');
  console.log('Backend:', getCurrentBackend());
  
  try {
    console.log('1. Testing simple exists call...');
    const run = (await import('./dist/node/index.js')).Core.Run;
    
    const result1 = run.exists(1, () => {
      console.log('Compute function called');
      return Field(42);
    });
    
    console.log('Simple exists result:', result1);
    
    console.log('2. Testing exists during constraint compilation...');
    
    // Simulate constraint compilation context
    const { Provable } = await import('./dist/node/index.js');
    
    const constraintSystem = Provable.constraintSystem(() => {
      console.log('Inside constraint system analysis...');
      
      const result2 = run.exists(1, () => {
        console.log('Compute function called during constraint analysis');
        try {
          return Field(99);
        } catch (e) {
          console.log('Error in compute function:', e.message);
          throw e;
        }
      });
      
      console.log('Exists result during constraint analysis:', result2);
      return result2;
    });
    
    console.log('Constraint system result:', constraintSystem);
    
  } catch (error) {
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

testExistsMode().catch(console.error);