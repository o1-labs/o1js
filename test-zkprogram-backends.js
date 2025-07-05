// ZkProgram Backend Comparison Test
// Created: July 4, 2025 12:00 AM UTC
// Last Modified: July 4, 2025 12:00 AM UTC

import { Field, ZkProgram, switchBackend, getCurrentBackend } from './dist/node/index.js';

// Test with both backends
async function testZkProgramBothBackends() {
  console.log('=== ZkProgram Backend Comparison ===\n');
  
  // Test with Snarky backend first
  console.log('Testing with Snarky backend...');
  try {
    await switchBackend('snarky');
    console.log('✅ Switched to Snarky backend');
    console.log('Current backend:', getCurrentBackend());
  } catch (error) {
    console.log('❌ Failed to switch to Snarky:', error.message);
  }
  
  const SnarkyProgram = ZkProgram({
    name: 'SnarkyTest',
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
  
  let snarkyResult = null;
  try {
    console.log('Compiling with Snarky...');
    snarkyResult = await SnarkyProgram.compile();
    console.log('✅ Snarky compilation successful');
    console.log('Snarky VK hash:', snarkyResult.verificationKey?.hash || 'missing');
  } catch (error) {
    console.log('❌ Snarky compilation failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test with Sparky backend
  console.log('Testing with Sparky backend...');
  try {
    await switchBackend('sparky');
    console.log('✅ Switched to Sparky backend');
    console.log('Current backend:', getCurrentBackend());
  } catch (error) {
    console.log('❌ Failed to switch to Sparky:', error.message);
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
  
  let sparkyResult = null;
  try {
    console.log('Compiling with Sparky...');
    sparkyResult = await SparkyProgram.compile();
    console.log('✅ Sparky compilation successful');
    console.log('Sparky VK hash:', sparkyResult.verificationKey?.hash || 'missing');
  } catch (error) {
    console.log('❌ Sparky compilation failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Summary
  console.log('=== Summary ===');
  console.log(`Snarky compilation: ${snarkyResult ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Sparky compilation: ${sparkyResult ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (snarkyResult && sparkyResult) {
    console.log('\nComparison:');
    console.log(`Snarky VK: ${snarkyResult.verificationKey?.hash || 'missing'}`);
    console.log(`Sparky VK: ${sparkyResult.verificationKey?.hash || 'missing'}`);
    console.log(`VK Match: ${snarkyResult.verificationKey?.hash === sparkyResult.verificationKey?.hash ? '✅ YES' : '❌ NO'}`);
  }
}

// Test with rangeCheck0
async function testRangeCheckBothBackends() {
  console.log('\n=== RangeCheck Backend Comparison ===\n');
  
  // Test with Snarky backend
  console.log('Testing rangeCheck with Snarky...');
  try {
    await switchBackend('snarky');
    console.log('✅ Switched to Snarky backend');
  } catch (error) {
    console.log('❌ Failed to switch to Snarky:', error.message);
  }
  
  const SnarkyRangeProgram = ZkProgram({
    name: 'SnarkyRange',
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
  
  let snarkyRangeResult = null;
  try {
    console.log('Compiling rangeCheck with Snarky...');
    snarkyRangeResult = await SnarkyRangeProgram.compile();
    console.log('✅ Snarky rangeCheck compilation successful');
    console.log('Snarky rangeCheck VK hash:', snarkyRangeResult.verificationKey?.hash || 'missing');
  } catch (error) {
    console.log('❌ Snarky rangeCheck compilation failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test with Sparky backend
  console.log('Testing rangeCheck with Sparky...');
  try {
    await switchBackend('sparky');
    console.log('✅ Switched to Sparky backend');
  } catch (error) {
    console.log('❌ Failed to switch to Sparky:', error.message);
  }
  
  const SparkyRangeProgram = ZkProgram({
    name: 'SparkyRange',
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
  
  let sparkyRangeResult = null;
  try {
    console.log('Compiling rangeCheck with Sparky...');
    sparkyRangeResult = await SparkyRangeProgram.compile();
    console.log('✅ Sparky rangeCheck compilation successful');
    console.log('Sparky rangeCheck VK hash:', sparkyRangeResult.verificationKey?.hash || 'missing');
  } catch (error) {
    console.log('❌ Sparky rangeCheck compilation failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Summary
  console.log('=== RangeCheck Summary ===');
  console.log(`Snarky rangeCheck: ${snarkyRangeResult ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Sparky rangeCheck: ${sparkyRangeResult ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (snarkyRangeResult && sparkyRangeResult) {
    console.log('\nRangeCheck Comparison:');
    console.log(`Snarky VK: ${snarkyRangeResult.verificationKey?.hash || 'missing'}`);
    console.log(`Sparky VK: ${sparkyRangeResult.verificationKey?.hash || 'missing'}`);
    console.log(`VK Match: ${snarkyRangeResult.verificationKey?.hash === sparkyRangeResult.verificationKey?.hash ? '✅ YES' : '❌ NO'}`);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testZkProgramBothBackends();
    await testRangeCheckBothBackends();
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

runAllTests().catch(console.error);