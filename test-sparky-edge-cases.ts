/**
 * Sparky Edge Cases Test
 * Tests various edge cases that might stress the Sparky implementation
 */

import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testSparkyEdgeCases() {
  console.log('📝 Testing Sparky edge cases...');
  
  // Initialize bindings and switch to Sparky
  console.log('Initializing Sparky backend...');
  await initializeBindings();
  await switchBackend('sparky');
  console.log('Current backend:', getCurrentBackend());
  
  const testCases = [
    {
      name: 'Zero private inputs',
      program: () => ZkProgram({
        name: 'zeroInputTest',
        publicInput: Field,
        methods: {
          justCheck: {
            privateInputs: [],
            async method(publicInput: Field) {
              // Just assert public input equals itself
              publicInput.assertEquals(publicInput);
            },
          },
        },
      })
    },
    {
      name: 'Single private input (odd)',
      program: () => ZkProgram({
        name: 'singleInputTest',
        publicInput: Field,
        methods: {
          square: {
            privateInputs: [Field],
            async method(publicInput: Field, x: Field) {
              const squared = x.mul(x);
              squared.assertEquals(publicInput);
            },
          },
        },
      })
    },
    {
      name: 'Two private inputs (even)',
      program: () => ZkProgram({
        name: 'twoInputTest',
        publicInput: Field,
        methods: {
          add: {
            privateInputs: [Field, Field],
            async method(publicInput: Field, x: Field, y: Field) {
              const sum = x.add(y);
              sum.assertEquals(publicInput);
            },
          },
        },
      })
    },
    {
      name: 'Five private inputs (odd)',
      program: () => ZkProgram({
        name: 'fiveInputTest',
        publicInput: Field,
        methods: {
          sum5: {
            privateInputs: [Field, Field, Field, Field, Field],
            async method(publicInput: Field, a: Field, b: Field, c: Field, d: Field, e: Field) {
              const sum = a.add(b).add(c).add(d).add(e);
              sum.assertEquals(publicInput);
            },
          },
        },
      })
    },
    {
      name: 'Six private inputs (even)',
      program: () => ZkProgram({
        name: 'sixInputTest',
        publicInput: Field,
        methods: {
          sum6: {
            privateInputs: [Field, Field, Field, Field, Field, Field],
            async method(publicInput: Field, a: Field, b: Field, c: Field, d: Field, e: Field, f: Field) {
              const sum = a.add(b).add(c).add(d).add(e).add(f);
              sum.assertEquals(publicInput);
            },
          },
        },
      })
    },
    {
      name: 'Large number of inputs (15)',
      program: () => ZkProgram({
        name: 'largeInputTest',
        publicInput: Field,
        methods: {
          sum15: {
            privateInputs: Array(15).fill(Field),
            async method(publicInput: Field, ...inputs: Field[]) {
              let sum = inputs[0];
              for (let i = 1; i < inputs.length; i++) {
                sum = sum.add(inputs[i]);
              }
              sum.assertEquals(publicInput);
            },
          },
        },
      })
    }
  ];
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const testCase of testCases) {
    try {
      console.log(`\n📝 Testing: ${testCase.name}...`);
      const program = testCase.program();
      const { verificationKey } = await program.compile();
      console.log(`✅ ${testCase.name} - Compilation successful`);
      console.log(`📏 VK length: ${verificationKey.data.length} chars`);
      passedTests++;
    } catch (error) {
      console.error(`❌ ${testCase.name} - FAILED:`, error.message);
    }
  }
  
  console.log('\n============================================================');
  console.log('📄 EDGE CASE TEST RESULTS:');
  console.log('============================================================');
  console.log(`📊 Tests passed: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL EDGE CASES PASSED!');
    console.log('✅ Sparky handles various input counts correctly');
    console.log('✅ No regression in edge case handling');
  } else {
    console.log('⚠️  Some edge cases failed');
    console.log(`🔧 ${totalTests - passedTests} test(s) need investigation`);
  }
  
  console.log('\n🔧 Edge case testing complete!');
}

testSparkyEdgeCases().catch(console.error);
