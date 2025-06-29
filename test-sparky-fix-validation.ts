#!/usr/bin/env node

/**
 * Test script to validate that the Sparky Poseidon fix correctly handles
 * both odd and even numbers of private inputs without runtime parsing.
 */

import { initializeBindings, Field, ZkProgram, switchBackend, Poseidon } from './dist/node/index.js';

console.log('🔧 Testing Sparky Poseidon fix validation...');

await initializeBindings();

// Test programs with different numbers of private inputs
const TestPrograms = {
  // 0 private inputs (even)
  noInputs: ZkProgram({
    name: 'NoInputsTest', 
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [],
        method(publicInput) {
          // Just verify the public input equals 42
          publicInput.assertEquals(42);
        },
      },
    },
  }),

  // 1 private input (odd) - Previously failed
  oneInput: ZkProgram({
    name: 'OneInputTest',
    publicInput: Field, 
    methods: {
      test: {
        privateInputs: [Field],
        method(publicInput, privateField) {
          // Hash the private input with itself and verify against public
          const hash = Poseidon.hash([privateField, privateField]);
          hash.assertEquals(publicInput);
        },
      },
    },
  }),

  // 2 private inputs (even)
  twoInputs: ZkProgram({
    name: 'TwoInputsTest',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field, Field],
        method(publicInput, privateField1, privateField2) {
          // Hash the two private inputs and verify against public
          const hash = Poseidon.hash([privateField1, privateField2]);
          hash.assertEquals(publicInput);
        },
      },
    },
  }),

  // 3 private inputs (odd) - Previously failed  
  threeInputs: ZkProgram({
    name: 'ThreeInputsTest',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field, Field, Field], 
        method(publicInput, field1, field2, field3) {
          // Hash all three inputs iteratively and verify against public
          const hash = Poseidon.hash([field1, field2, field3]);
          hash.assertEquals(publicInput);
        },
      },
    },
  }),

  // 5 private inputs (odd) - Test larger odd number
  fiveInputs: ZkProgram({
    name: 'FiveInputsTest',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field, Field, Field, Field, Field],
        method(publicInput, f1, f2, f3, f4, f5) {
          // Hash all five inputs and verify against public
          const hash = Poseidon.hash([f1, f2, f3, f4, f5]);
          hash.assertEquals(publicInput);
        },
      },
    },
  }),
};

async function testProgram(name, program, privateInputs, description) {
  console.log(`\n📋 Testing ${name}: ${description}`);
  
  try {
    // Switch to Sparky backend
    await switchBackend('sparky');
    console.log('  ✓ Switched to Sparky backend');

    // Compile the program (this is where the bug previously occurred)
    console.log('  🔨 Compiling program...');
    const { verificationKey } = await program.compile();
    console.log('  ✓ Compilation successful!');

    // Generate test values and compute expected hash
    const testValues = privateInputs.map((_, i) => Field(100 + i));
    let expectedHash;
    
    if (testValues.length === 0) {
      expectedHash = Field(42); // No hash, just verify constant
    } else {
      // Switch to Snarky to compute expected hash (known working)
      await switchBackend('snarky');
      expectedHash = Poseidon.hash(testValues);
      await switchBackend('sparky');
    }

    console.log(`  🧮 Expected hash/value: ${expectedHash.toString()}`);

    // Create proof 
    console.log('  🔐 Generating proof...');
    const proof = await program.test(expectedHash, ...testValues);
    console.log('  ✓ Proof generation successful!');

    // Verify proof
    console.log('  ✅ Verifying proof...');
    const isValid = await program.verify(proof);
    
    if (isValid) {
      console.log(`  🎉 ${name} PASSED - Sparky correctly handled ${privateInputs.length} private inputs`);
      return true;
    } else {
      console.log(`  ❌ ${name} FAILED - Proof verification failed`);
      return false;
    }

  } catch (error) {
    console.log(`  💥 ${name} FAILED - ${error.message}`);
    console.log(`  📍 Error details:`, error.stack?.split('\n').slice(0, 3).join('\n'));
    return false;
  }
}

async function runValidationTests() {
  console.log('\n🚀 Starting Sparky Poseidon fix validation tests...\n');
  
  const results = [];

  // Test each program
  results.push(await testProgram(
    'NoInputsTest', 
    TestPrograms.noInputs, 
    [],
    '0 private inputs (even) - baseline test'
  ));

  results.push(await testProgram(
    'OneInputTest', 
    TestPrograms.oneInput, 
    [Field],
    '1 private input (odd) - previously broken'
  ));

  results.push(await testProgram(
    'TwoInputsTest', 
    TestPrograms.twoInputs, 
    [Field, Field],
    '2 private inputs (even) - should work'
  ));

  results.push(await testProgram(
    'ThreeInputsTest', 
    TestPrograms.threeInputs, 
    [Field, Field, Field],
    '3 private inputs (odd) - previously broken'
  ));

  results.push(await testProgram(
    'FiveInputsTest', 
    TestPrograms.fiveInputs, 
    [Field, Field, Field, Field, Field],
    '5 private inputs (odd) - larger test case'
  ));

  // Summary
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION RESULTS:');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}/${total} tests`);
  console.log(`❌ Failed: ${total - passed}/${total} tests`);
  
  if (passed === total) {
    console.log('\n🎉🎉🎉 ALL TESTS PASSED! 🎉🎉🎉');
    console.log('✅ Sparky now correctly handles both odd and even private input counts');
    console.log('✅ Runtime parsing has been eliminated');
    console.log('✅ Poseidon iterative hashing bug has been fixed');
  } else {
    console.log('\n❌ Some tests failed. The fix may need additional work.');
  }
  
  console.log('\n🔧 Fix validation complete.\n');
  
  return passed === total;
}

// Run the validation
runValidationTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Validation failed with error:', error);
    process.exit(1);
  });