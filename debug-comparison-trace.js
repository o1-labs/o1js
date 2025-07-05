// Trace comparison operation failure
// Created: July 4, 2025 12:00 AM UTC
// Last Modified: July 4, 2025 12:00 AM UTC

import { Field, switchBackend, getCurrentBackend, Provable } from './dist/node/index.js';

async function traceComparisonFailure() {
  console.log('=== Tracing Comparison Failure ===');
  
  await switchBackend('sparky');
  console.log('Backend:', getCurrentBackend());
  
  try {
    console.log('Creating field values...');
    const a = Field(5);
    const b = Field(10);
    
    console.log('Testing lessThan in constraint analysis context...');
    
    const constraintSystem = Provable.constraintSystem(() => {
      console.log('Inside constraint system analysis...');
      
      try {
        console.log('About to call a.lessThan(b)...');
        const result = a.lessThan(b);
        console.log('lessThan result:', result);
        console.log('lessThan result type:', typeof result);
        
        if (result === undefined) {
          console.log('❌ lessThan returned undefined!');
        } else {
          console.log('✅ lessThan returned a value');
        }
        
        return result;
      } catch (error) {
        console.log('Error inside lessThan:', error.message);
        console.log('Error stack:', error.stack);
        throw error;
      }
    });
    
    console.log('Constraint system result:', constraintSystem);
    
  } catch (error) {
    console.log('Top-level error:', error.message);
    console.log('Stack trace:', error.stack);
  }
}

traceComparisonFailure().catch(console.error);