#!/usr/bin/env node

/**
 * 🔬 DEBUG: runAndCheck Witness Storage Bug Investigation
 * 
 * This test specifically calls runAndCheck to trigger the witness creation
 * pathway that's causing the "Original witness size: 0" bug.
 */

import { Field, ZkProgram, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testRunAndCheckBug() {
  console.log('🔬 DEBUGGING: runAndCheck Witness Storage Bug');
  console.log('=============================================');
  
  // Switch to Sparky to test the bug
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  // Test 1: Create a simple ZkProgram that requires witness creation
  console.log('\n📊 TEST 1: ZkProgram with multiplication');
  console.log('---------------------------------------');
  
  const SimpleMultiplication = ZkProgram({
    name: 'SimpleMultiplication',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      multiply: {
        privateInputs: [Field, Field],
        async method(input, a, b) {
          console.log('Inside ZkProgram method - multiplying', a.toString(), '*', b.toString());
          const result = a.mul(b);
          console.log('Multiplication result:', result.toString());
          result.assertEquals(input);
          console.log('Assertion completed');
          return result;
        }
      }
    }
  });
  
  try {
    console.log('Compiling ZkProgram...');
    await SimpleMultiplication.compile();
    console.log('✓ ZkProgram compiled successfully');
    
    console.log('\nGenerating proof with valid inputs (3 * 4 = 12)...');
    const proof = await SimpleMultiplication.multiply(
      Field.from(12), // expected result
      Field.from(3),  // private input a
      Field.from(4)   // private input b
    );
    
    console.log('✓ Proof generated successfully');
    console.log('Proof public input:', proof.publicInput.toString());
    console.log('Proof public output:', proof.publicOutput.toString());
    
  } catch (error) {
    console.log('❌ ZkProgram test failed:', error);
    
    // Show more error details
    if (error.stack) {
      console.log('\nStack trace:', error.stack);
    }
  }
  
  // Test 2: Try a simple invalid case to see constraint checking
  console.log('\n📊 TEST 2: Invalid multiplication (should fail)');
  console.log('---------------------------------------------');
  
  try {
    console.log('Generating proof with invalid inputs (3 * 4 ≠ 10)...');
    const proof = await SimpleMultiplication.multiply(
      Field.from(10), // wrong expected result
      Field.from(3),  // private input a
      Field.from(4)   // private input b
    );
    
    console.log('❌ UNEXPECTED: Invalid proof generated!', proof);
    
  } catch (error) {
    console.log('✅ EXPECTED: Invalid proof correctly failed:', error.message);
  }
  
  console.log('\n🎯 ANALYSIS COMPLETE');
  console.log('===================');
  console.log('Check the debug logs above for:');
  console.log('1. "exists_impl called with compute function: false" ← Main bug indicator');
  console.log('2. "Original witness size: 0" ← Witness storage bug indicator');
  console.log('3. Constraint satisfaction failures during proof generation');
}

testRunAndCheckBug().catch(console.error);