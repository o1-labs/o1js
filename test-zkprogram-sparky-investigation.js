// ZkProgram Sparky Investigation Tests
// Created: July 4, 2025 12:00 AM UTC
// Last Modified: July 4, 2025 12:00 AM UTC

import { Field, ZkProgram, Provable, Bool } from './dist/node/index.js';

// Test 1: Basic ZkProgram compilation
async function testBasicZkProgram() {
  console.log('Testing basic ZkProgram compilation...');
  
  const BasicProgram = ZkProgram({
    name: 'BasicProgram',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      addOne: {
        privateInputs: [],
        method(input) {
          return input.add(1);
        }
      }
    }
  });
  
  try {
    const result = await BasicProgram.compile();
    console.log('✅ Basic ZkProgram compilation successful');
    console.log('Verification key hash:', result.verificationKey?.hash || 'missing');
    return result;
  } catch (error) {
    console.log('❌ Basic ZkProgram compilation failed:', error.message);
    return null;
  }
}

// Test 2: ZkProgram with rangeCheck0 - explicit range checking
async function testRangeCheckZkProgram() {
  console.log('Testing ZkProgram with rangeCheck0...');
  
  const RangeCheckProgram = ZkProgram({
    name: 'RangeCheckProgram',
    publicInput: Field,
    publicOutput: Bool,
    
    methods: {
      checkRange: {
        privateInputs: [Field],
        method(input, value) {
          // This should trigger rangeCheck0 internally
          const isValid = value.lessThan(Field(1000));
          
          // Additional range check that should use rangeCheck0
          value.assertLessThan(Field(2048));
          
          return isValid;
        }
      }
    }
  });
  
  try {
    const result = await RangeCheckProgram.compile();
    console.log('✅ RangeCheck ZkProgram compilation successful');
    console.log('Verification key hash:', result.verificationKey?.hash || 'missing');
    return result;
  } catch (error) {
    console.log('❌ RangeCheck ZkProgram compilation failed:', error.message);
    return null;
  }
}

// Test 3: ZkProgram with multiple range checks
async function testMultipleRangeChecks() {
  console.log('Testing ZkProgram with multiple range checks...');
  
  const MultiRangeProgram = ZkProgram({
    name: 'MultiRangeProgram',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      multiRangeCheck: {
        privateInputs: [Field, Field, Field],
        method(input, a, b, c) {
          // Multiple range checks that should use rangeCheck0
          a.assertLessThan(Field(100));
          b.assertLessThan(Field(500));
          c.assertLessThan(Field(1000));
          
          // Combine results
          const sum = a.add(b).add(c);
          return input.add(sum);
        }
      }
    }
  });
  
  try {
    const result = await MultiRangeProgram.compile();
    console.log('✅ Multiple range checks ZkProgram compilation successful');
    console.log('Verification key hash:', result.verificationKey?.hash || 'missing');
    return result;
  } catch (error) {
    console.log('❌ Multiple range checks ZkProgram compilation failed:', error.message);
    return null;
  }
}

// Test 4: ZkProgram with boolean operations
async function testBooleanZkProgram() {
  console.log('Testing ZkProgram with boolean operations...');
  
  const BooleanProgram = ZkProgram({
    name: 'BooleanProgram',
    publicInput: Field,
    publicOutput: Bool,
    
    methods: {
      booleanLogic: {
        privateInputs: [Bool, Bool],
        method(input, a, b) {
          const andResult = a.and(b);
          const orResult = a.or(b);
          const notResult = a.not();
          
          // Use input in comparison
          const inputIsZero = input.equals(Field(0));
          
          return andResult.or(orResult).and(notResult.or(inputIsZero));
        }
      }
    }
  });
  
  try {
    const result = await BooleanProgram.compile();
    console.log('✅ Boolean ZkProgram compilation successful');
    console.log('Verification key hash:', result.verificationKey?.hash || 'missing');
    return result;
  } catch (error) {
    console.log('❌ Boolean ZkProgram compilation failed:', error.message);
    return null;
  }
}

// Test 5: ZkProgram with complex range and field operations
async function testComplexRangeFieldProgram() {
  console.log('Testing ZkProgram with complex range and field operations...');
  
  const ComplexProgram = ZkProgram({
    name: 'ComplexProgram',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
      complexComputation: {
        privateInputs: [Field, Field],
        method(input, a, b) {
          // Range checks
          a.assertLessThan(Field(1000));
          b.assertLessThan(Field(2000));
          
          // Field operations
          const sum = a.add(b);
          const product = a.mul(b);
          const difference = a.sub(b);
          
          // More range checks on computed values
          sum.assertLessThan(Field(3000));
          
          // Conditional logic
          const condition = a.greaterThan(b);
          const result = Provable.if(condition, product, difference);
          
          return input.add(result);
        }
      }
    }
  });
  
  try {
    const result = await ComplexProgram.compile();
    console.log('✅ Complex ZkProgram compilation successful');
    console.log('Verification key hash:', result.verificationKey?.hash || 'missing');
    return result;
  } catch (error) {
    console.log('❌ Complex ZkProgram compilation failed:', error.message);
    return null;
  }
}

// Main test runner
async function runZkProgramTests() {
  console.log('=== ZkProgram Sparky Investigation ===\n');
  
  const results = [];
  
  results.push(await testBasicZkProgram());
  console.log('');
  
  results.push(await testRangeCheckZkProgram());
  console.log('');
  
  results.push(await testMultipleRangeChecks());
  console.log('');
  
  results.push(await testBooleanZkProgram());
  console.log('');
  
  results.push(await testComplexRangeFieldProgram());
  console.log('');
  
  // Summary
  const successful = results.filter(r => r !== null).length;
  const total = results.length;
  
  console.log('=== Test Summary ===');
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful > 0) {
    console.log('\nVerification key hashes:');
    results.forEach((result, i) => {
      if (result && result.verificationKey) {
        console.log(`Test ${i + 1}: ${result.verificationKey.hash}`);
      }
    });
  }
}

// Run if called directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  runZkProgramTests().catch(console.error);
}

export {
  testBasicZkProgram,
  testRangeCheckZkProgram,
  testMultipleRangeChecks,
  testBooleanZkProgram,
  testComplexRangeFieldProgram,
  runZkProgramTests
};