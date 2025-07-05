// Debug ZkProgram comparison vs simple constraint system
// Created: July 4, 2025 12:00 AM UTC
// Last Modified: July 4, 2025 12:00 AM UTC

import { Field, ZkProgram, switchBackend, getCurrentBackend, Provable } from './dist/node/index.js';

async function compareConstraintContexts() {
  console.log('=== Comparing Constraint Contexts ===');
  
  await switchBackend('sparky');
  console.log('Backend:', getCurrentBackend());
  
  // Test 1: Simple constraint system context (WORKS)
  console.log('\n1. Simple Constraint System Context:');
  try {
    const constraintSystem = Provable.constraintSystem(() => {
      const a = Field(5);
      const b = Field(10);
      console.log('  About to call a.lessThan(b)...');
      const result = a.lessThan(b);
      console.log('  lessThan result:', result);
      console.log('  lessThan result type:', typeof result);
      console.log('  lessThan result value:', result?.value);
      return result;
    });
    
    const finalResult = await constraintSystem;
    console.log('  Final constraint system result:', finalResult);
  } catch (error) {
    console.log('  Error in simple context:', error.message);
  }
  
  // Test 2: ZkProgram method context (FAILS)
  console.log('\n2. ZkProgram Method Context:');
  const ComparisonProgram = ZkProgram({
    name: 'Comparison',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      testLessThan: {
        privateInputs: [Field],
        method(input, value) {
          console.log('  Inside ZkProgram method...');
          console.log('  input type:', typeof input);
          console.log('  value type:', typeof value);
          
          try {
            console.log('  About to call value.lessThan(Field(100))...');
            const result = value.lessThan(Field(100));
            console.log('  lessThan result:', result);
            console.log('  lessThan result type:', typeof result);
            console.log('  lessThan result value:', result?.value);
            
            if (result === undefined) {
              console.log('  ❌ lessThan returned undefined in ZkProgram!');
              return Field(0); // Return something to prevent crash
            } else {
              console.log('  ✅ lessThan returned valid result in ZkProgram');
              // Try to use the result in conditional logic
              const conditionalResult = Provable.if(result, input.add(Field(1)), input.sub(Field(1)));
              return conditionalResult;
            }
          } catch (error) {
            console.log('  Error in ZkProgram method:', error.message);
            return Field(0);
          }
        }
      }
    }
  });
  
  try {
    console.log('  Starting ZkProgram compilation...');
    const compileResult = await ComparisonProgram.compile();
    console.log('  ✅ ZkProgram compilation successful');
  } catch (error) {
    console.log('  ❌ ZkProgram compilation failed:', error.message);
  }
}

compareConstraintContexts().catch(console.error);