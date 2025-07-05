// ZkProgram rangeCheck0 Debug Test
// Created: July 4, 2025 12:00 AM UTC
// Last Modified: July 4, 2025 12:00 AM UTC

import { Field, ZkProgram, switchBackend, getCurrentBackend, Provable } from './dist/node/index.js';

// Test different range check operations to isolate the issue
async function testBasicRangeCheck() {
  console.log('=== Testing Basic Range Check ===');
  
  await switchBackend('sparky');
  console.log('Current backend:', getCurrentBackend());
  
  const BasicRangeProgram = ZkProgram({
    name: 'BasicRange',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      simpleRange: {
        privateInputs: [Field],
        method(input, value) {
          console.log('Inside method - input:', input?.toString());
          console.log('Inside method - value:', value?.toString());
          
          // Try the simplest possible range check
          try {
            console.log('About to call assertLessThan...');
            value.assertLessThan(Field(100));
            console.log('assertLessThan completed successfully');
            
            return input.add(value);
          } catch (error) {
            console.log('Error in assertLessThan:', error.message);
            throw error;
          }
        }
      }
    }
  });
  
  try {
    console.log('Starting basic range check compilation...');
    const result = await BasicRangeProgram.compile();
    console.log('✅ Basic range check successful');
    return result;
  } catch (error) {
    console.log('❌ Basic range check failed:', error.message);
    console.log('Stack:', error.stack);
    return null;
  }
}

// Test different comparison operations
async function testComparisonOperations() {
  console.log('\n=== Testing Comparison Operations ===');
  
  await switchBackend('sparky');
  
  const ComparisonProgram = ZkProgram({
    name: 'Comparison',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      testComparisons: {
        privateInputs: [Field],
        method(input, value) {
          try {
            // Test different comparison operations
            console.log('Testing lessThan...');
            const isLess = value.lessThan(Field(100));
            console.log('lessThan completed');
            
            console.log('Testing greaterThan...');
            const isGreater = value.greaterThan(Field(10));
            console.log('greaterThan completed');
            
            console.log('Testing equals...');
            const isEqual = value.equals(Field(50));
            console.log('equals completed');
            
            // Try conditional logic
            console.log('Testing conditional logic...');
            const result = Provable.if(isLess, input.add(Field(1)), input.sub(Field(1)));
            console.log('conditional logic completed');
            
            return result;
          } catch (error) {
            console.log('Error in comparison operations:', error.message);
            throw error;
          }
        }
      }
    }
  });
  
  try {
    console.log('Starting comparison operations compilation...');
    const result = await ComparisonProgram.compile();
    console.log('✅ Comparison operations successful');
    return result;
  } catch (error) {
    console.log('❌ Comparison operations failed:', error.message);
    return null;
  }
}

// Test minimal program without range checks
async function testMinimalProgram() {
  console.log('\n=== Testing Minimal Program (No Range Checks) ===');
  
  await switchBackend('sparky');
  
  const MinimalProgram = ZkProgram({
    name: 'Minimal',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      justAdd: {
        privateInputs: [Field],
        method(input, value) {
          // No range checks, just basic field arithmetic
          return input.add(value);
        }
      }
    }
  });
  
  try {
    console.log('Starting minimal program compilation...');
    const result = await MinimalProgram.compile();
    console.log('✅ Minimal program successful');
    return result;
  } catch (error) {
    console.log('❌ Minimal program failed:', error.message);
    return null;
  }
}

// Test with witness-only range check
async function testWitnessRangeCheck() {
  console.log('\n=== Testing Witness-Only Range Check ===');
  
  await switchBackend('sparky');
  
  const WitnessProgram = ZkProgram({
    name: 'Witness',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      witnessRange: {
        privateInputs: [Field],
        method(input, value) {
          // Only use witness, no constraints
          Provable.asProver(() => {
            console.log('In witness: value =', value.toString());
            const isValid = value.toBigInt() < 100n;
            console.log('In witness: isValid =', isValid);
          });
          
          return input.add(value);
        }
      }
    }
  });
  
  try {
    console.log('Starting witness-only compilation...');
    const result = await WitnessProgram.compile();
    console.log('✅ Witness-only successful');
    return result;
  } catch (error) {
    console.log('❌ Witness-only failed:', error.message);
    return null;
  }
}

// Main test runner
async function runRangeCheckDebug() {
  console.log('🔍 ZkProgram rangeCheck0 Debug Investigation\n');
  
  const results = {
    minimal: await testMinimalProgram(),
    witness: await testWitnessRangeCheck(),
    comparison: await testComparisonOperations(),
    basicRange: await testBasicRangeCheck()
  };
  
  console.log('\n=== Debug Summary ===');
  console.log(`Minimal program (no range checks): ${results.minimal ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Witness-only program: ${results.witness ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Comparison operations: ${results.comparison ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Basic range check (assertLessThan): ${results.basicRange ? '✅ PASS' : '❌ FAIL'}`);
  
  if (results.minimal && !results.basicRange) {
    console.log('\n🎯 CONCLUSION: Issue is specifically with assertLessThan/rangeCheck0 in Sparky');
  } else if (!results.minimal) {
    console.log('\n🎯 CONCLUSION: Issue is more fundamental with Sparky ZkProgram compilation');
  }
}

runRangeCheckDebug().catch(console.error);