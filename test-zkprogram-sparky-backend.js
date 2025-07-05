// ZkProgram Test with Sparky Backend
// Created: July 4, 2025 12:00 AM UTC
// Last Modified: July 4, 2025 12:00 AM UTC

import { Field, ZkProgram } from './dist/node/index.js';

// Test with Sparky backend
async function testZkProgramWithSparky() {
  console.log('Testing ZkProgram with Sparky backend...');
  
  // Switch to Sparky backend
  try {
    const { setActiveBackend } = await import('./dist/node/index.js');
    console.log('Switching to Sparky backend...');
    await setActiveBackend('sparky');
    console.log('✅ Switched to Sparky backend');
  } catch (error) {
    console.log('❌ Failed to switch to Sparky backend:', error.message);
    return null;
  }
  
  const SparkyProgram = ZkProgram({
    name: 'SparkyTest',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      identity: {
        privateInputs: [],
        method(input) {
          return input;
        }
      }
    }
  });
  
  try {
    console.log('Starting Sparky compilation...');
    const result = await SparkyProgram.compile();
    console.log('✅ Sparky ZkProgram compilation successful');
    console.log('Verification key hash:', result.verificationKey?.hash || 'missing');
    return result;
  } catch (error) {
    console.log('❌ Sparky ZkProgram compilation failed:', error.message);
    console.log('Stack:', error.stack);
    return null;
  }
}

// Test with range check using Sparky
async function testRangeCheckWithSparky() {
  console.log('\nTesting range check with Sparky backend...');
  
  const RangeProgram = ZkProgram({
    name: 'RangeTest',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      rangeCheck: {
        privateInputs: [Field],
        method(input, value) {
          // This should use rangeCheck0
          value.assertLessThan(Field(100));
          return input.add(value);
        }
      }
    }
  });
  
  try {
    console.log('Starting Sparky range check compilation...');
    const result = await RangeProgram.compile();
    console.log('✅ Sparky range check compilation successful');
    console.log('Verification key hash:', result.verificationKey?.hash || 'missing');
    return result;
  } catch (error) {
    console.log('❌ Sparky range check compilation failed:', error.message);
    console.log('Stack:', error.stack);
    return null;
  }
}

// Run tests
async function runTests() {
  const result1 = await testZkProgramWithSparky();
  const result2 = await testRangeCheckWithSparky();
  
  console.log('\n=== Summary ===');
  console.log(`Identity test: ${result1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Range check test: ${result2 ? '✅ PASS' : '❌ FAIL'}`);
}

runTests().catch(console.error);