#!/usr/bin/env node

/**
 * Critical test: Verify that verification keys match EXACTLY between
 * Snarky and Sparky backends for both odd and even private input counts.
 * 
 * This is essential for backend compatibility.
 */

import { Field, ZkProgram, initializeBindings, Poseidon, switchBackend } from './dist/node/index.js';

console.log('🔑 Testing Verification Key Matching Between Backends...');

await initializeBindings();

// Test programs with different private input counts
const TestPrograms = {
  // 0 private inputs (even)
  zeroInputs: ZkProgram({
    name: 'ZeroInputsVK',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [],
        method(publicInput) {
          publicInput.assertEquals(Field(42));
        },
      },
    },
  }),

  // 1 private input (odd) - previously broken
  oneInput: ZkProgram({
    name: 'OneInputVK', 
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field],
        method(publicInput, privateField) {
          const hash = Poseidon.hash([privateField, Field(100)]);
          hash.assertEquals(publicInput);
        },
      },
    },
  }),

  // 2 private inputs (even)
  twoInputs: ZkProgram({
    name: 'TwoInputsVK',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field, Field],
        method(publicInput, field1, field2) {
          const hash = Poseidon.hash([field1, field2]);
          hash.assertEquals(publicInput);
        },
      },
    },
  }),

  // 3 private inputs (odd) - previously broken
  threeInputs: ZkProgram({
    name: 'ThreeInputsVK',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field, Field, Field],
        method(publicInput, field1, field2, field3) {
          const hash = Poseidon.hash([field1, field2, field3]);
          hash.assertEquals(publicInput);
        },
      },
    },
  }),

  // 4 private inputs (even)
  fourInputs: ZkProgram({
    name: 'FourInputsVK',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field, Field, Field, Field],
        method(publicInput, f1, f2, f3, f4) {
          const hash = Poseidon.hash([f1, f2, f3, f4]);
          hash.assertEquals(publicInput);
        },
      },
    },
  }),

  // 5 private inputs (odd)
  fiveInputs: ZkProgram({
    name: 'FiveInputsVK',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field, Field, Field, Field, Field],
        method(publicInput, f1, f2, f3, f4, f5) {
          const hash = Poseidon.hash([f1, f2, f3, f4, f5]);
          hash.assertEquals(publicInput);
        },
      },
    },
  }),
};

async function compareVerificationKeys(name, program, inputCount) {
  console.log(`\n🔍 Testing ${name} (${inputCount} private inputs):`);
  
  try {
    // Compile with Snarky backend
    console.log('  📋 Compiling with Snarky backend...');
    await switchBackend('snarky');
    const { verificationKey: snarkyVK } = await program.compile();
    console.log('  ✅ Snarky compilation successful');

    // Compile with Sparky backend  
    console.log('  📋 Compiling with Sparky backend...');
    await switchBackend('sparky');
    const { verificationKey: sparkyVK } = await program.compile();
    console.log('  ✅ Sparky compilation successful');

    // Compare verification keys
    console.log('  🔍 Comparing verification keys...');
    
    // Convert to strings for comparison
    const snarkyVKStr = JSON.stringify(snarkyVK);
    const sparkyVKStr = JSON.stringify(sparkyVK);
    
    const vksMatch = snarkyVKStr === sparkyVKStr;
    
    if (vksMatch) {
      console.log(`  🎉 ✅ VERIFICATION KEYS MATCH for ${inputCount} inputs`);
      return { success: true, inputCount, vksMatch: true };
    } else {
      console.log(`  ❌ VERIFICATION KEYS DIFFER for ${inputCount} inputs`);
      
      // Show detailed comparison
      console.log('  📊 Snarky VK length:', snarkyVKStr.length);
      console.log('  📊 Sparky VK length:', sparkyVKStr.length);
      
      // Find first difference
      let diffPos = -1;
      for (let i = 0; i < Math.min(snarkyVKStr.length, sparkyVKStr.length); i++) {
        if (snarkyVKStr[i] !== sparkyVKStr[i]) {
          diffPos = i;
          break;
        }
      }
      
      if (diffPos >= 0) {
        console.log(`  📍 First difference at position ${diffPos}`);
        console.log(`  📍 Snarky: ...${snarkyVKStr.substring(Math.max(0, diffPos-10), diffPos+10)}...`);
        console.log(`  📍 Sparky: ...${sparkyVKStr.substring(Math.max(0, diffPos-10), diffPos+10)}...`);
      }
      
      return { success: false, inputCount, vksMatch: false };
    }

  } catch (error) {
    console.log(`  💥 FAILED: ${error.message}`);
    return { success: false, inputCount, error: error.message };
  }
}

async function runVKComparisonTests() {
  console.log('\n🚀 Starting Verification Key Matching Tests...\n');
  console.log('This is CRITICAL - VKs must match exactly for backend compatibility!\n');
  
  const results = [];

  // Test each input count
  results.push(await compareVerificationKeys('ZeroInputs', TestPrograms.zeroInputs, 0));
  results.push(await compareVerificationKeys('OneInput', TestPrograms.oneInput, 1));
  results.push(await compareVerificationKeys('TwoInputs', TestPrograms.twoInputs, 2));
  results.push(await compareVerificationKeys('ThreeInputs', TestPrograms.threeInputs, 3));
  results.push(await compareVerificationKeys('FourInputs', TestPrograms.fourInputs, 4));
  results.push(await compareVerificationKeys('FiveInputs', TestPrograms.fiveInputs, 5));

  // Analyze results
  console.log('\n' + '='.repeat(70));
  console.log('🔑 VERIFICATION KEY MATCHING RESULTS:');
  console.log('='.repeat(70));

  const successful = results.filter(r => r.success && r.vksMatch);
  const failed = results.filter(r => !r.success || !r.vksMatch);

  console.log(`✅ VKs Match: ${successful.length}/${results.length} test cases`);
  console.log(`❌ VKs Differ: ${failed.length}/${results.length} test cases`);

  console.log('\n📊 Breakdown by Input Count:');
  for (const result of results) {
    const status = result.success && result.vksMatch ? '✅ MATCH' : '❌ DIFFER';
    const inputType = result.inputCount % 2 === 0 ? 'even' : 'odd';
    console.log(`  ${result.inputCount} inputs (${inputType}): ${status}`);
  }

  // Check odd vs even pattern
  const oddResults = results.filter(r => r.inputCount % 2 === 1);
  const evenResults = results.filter(r => r.inputCount % 2 === 0);
  
  const oddMatches = oddResults.filter(r => r.success && r.vksMatch).length;
  const evenMatches = evenResults.filter(r => r.success && r.vksMatch).length;
  
  console.log('\n🔍 Pattern Analysis:');
  console.log(`  Odd inputs (1,3,5): ${oddMatches}/${oddResults.length} VKs match`);
  console.log(`  Even inputs (0,2,4): ${evenMatches}/${evenResults.length} VKs match`);

  if (failed.length === 0) {
    console.log('\n🎉🎉🎉 PERFECT! ALL VERIFICATION KEYS MATCH! 🎉🎉🎉');
    console.log('✅ Sparky backend is 100% compatible with Snarky');
    console.log('✅ Both odd and even private input counts work correctly');
    console.log('✅ The Poseidon fix maintains perfect compatibility');
  } else {
    console.log('\n⚠️  COMPATIBILITY ISSUES DETECTED ⚠️');
    console.log('❌ Some verification keys do not match between backends');
    console.log('❌ This indicates the fix may need refinement');
    
    for (const failure of failed) {
      if (failure.error) {
        console.log(`   - ${failure.inputCount} inputs: ${failure.error}`);
      } else if (!failure.vksMatch) {
        console.log(`   - ${failure.inputCount} inputs: VK mismatch`);
      }
    }
  }
  
  console.log('\n🔑 Verification key comparison complete.\n');
  
  return failed.length === 0;
}

// Run the tests
runVKComparisonTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 VK comparison failed with error:', error);
    process.exit(1);
  });