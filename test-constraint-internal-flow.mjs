#!/usr/bin/env node

import { Field, switchBackend, ZkProgram } from './dist/node/index.js';

// Test to understand the internal constraint flow
async function testInternalFlow() {
  console.log('=== Testing Internal Constraint Flow ===\n');
  
  await switchBackend('sparky');
  
  // Create a minimal program to trace the flow
  const TestProgram = ZkProgram({
    name: 'ConstraintFlowTest',
    publicInput: undefined,
    methods: {
      test: {
        privateInputs: [Field, Field],
        async method(a, b) {
          console.log('\n>>> METHOD EXECUTION START <<<');
          console.log('Inputs are variables:', !a.isConstant(), !b.isConstant());
          
          // This multiplication MUST add a constraint because a and b are variables
          let z = a.mul(b);
          console.log('Performed multiplication of variables');
          
          console.log('>>> METHOD EXECUTION END <<<\n');
          return z;
        }
      }
    }
  });
  
  console.log('Starting compilation...\n');
  
  // Compile and watch the debug output
  try {
    const { verificationKey } = await TestProgram.compile();
    console.log('\nCompilation complete!');
    console.log('VK hash:', verificationKey.hash.toString());
  } catch (error) {
    console.error('Compilation failed:', error);
  }
  
  console.log('\n=== Key Observations ===');
  console.log('1. Look for "startConstraintAccumulation" - when constraint mode begins');
  console.log('2. Look for "gates.generic called" - when constraints are added');
  console.log('3. Look for "getAccumulatedConstraints" - when OCaml queries constraints');
  console.log('4. Look for "Found X constraints" - how many constraints OCaml sees');
  console.log('5. Check if constraint count is 0 - this is the bug');
  
  // Now let's try to access the constraint system directly after compilation
  console.log('\n=== Post-Compilation Check ===');
  
  // Analyze the method to see constraints
  const analysis = await TestProgram.analyzeMethods();
  console.log('Method analysis:', JSON.stringify(analysis, null, 2));
}

testInternalFlow().catch(console.error);