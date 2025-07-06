/**
 * Progressive Complexity Test
 * 
 * Tests increasingly complex operations to identify where VK divergence begins
 */

let o1js, Field, ZkProgram, Bool, switchBackend, getCurrentBackend, Poseidon, Provable;

async function loadO1js() {
  o1js = await import('./dist/node/index.js');
  ({ Field, ZkProgram, Bool, switchBackend, getCurrentBackend, Poseidon, Provable } = o1js);
}

async function runProgressiveComplexityTest() {
  await loadO1js();
  
  console.log('🧪 PROGRESSIVE COMPLEXITY TEST');
  console.log('==============================\n');
  
  // Define test programs with increasing complexity
  const testPrograms = [
    {
      name: 'Addition',
      createProgram: () => ZkProgram({
        name: 'AdditionProgram',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          add: {
            privateInputs: [],
            async method(publicInput) {
              const result = publicInput.add(Field(1));
              return { publicOutput: result };
            }
          }
        }
      })
    },
    
    {
      name: 'Multiplication',
      createProgram: () => ZkProgram({
        name: 'MultiplicationProgram',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          multiply: {
            privateInputs: [],
            async method(publicInput) {
              const result = publicInput.mul(Field(2));
              return { publicOutput: result };
            }
          }
        }
      })
    },
    
    {
      name: 'assertEquals',
      createProgram: () => ZkProgram({
        name: 'AssertEqualsProgram',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          assertAndReturn: {
            privateInputs: [],
            async method(publicInput) {
              const doubled = publicInput.mul(Field(2));
              doubled.assertEquals(publicInput.add(publicInput));
              return { publicOutput: doubled };
            }
          }
        }
      })
    },
    
    {
      name: 'Boolean',
      createProgram: () => ZkProgram({
        name: 'BooleanProgram',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          booleanOp: {
            privateInputs: [],
            async method(publicInput) {
              const isZero = publicInput.equals(Field(0));
              const result = Provable.if(isZero, Field(1), Field(0));
              return { publicOutput: result };
            }
          }
        }
      })
    },
    
    {
      name: 'Hash',
      createProgram: () => ZkProgram({
        name: 'HashProgram',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          hash: {
            privateInputs: [],
            async method(publicInput) {
              const result = Poseidon.hash([publicInput, Field(1)]);
              return { publicOutput: result };
            }
          }
        }
      })
    }
  ];
  
  const results = {};
  
  for (const testCase of testPrograms) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log('─'.repeat(30));
    
    const testResults = {};
    
    // Test both backends
    for (const backend of ['snarky', 'sparky']) {
      try {
        // Switch backend
        await switchBackend(backend);
        
        // Create program instance
        const program = testCase.createProgram();
        
        // Compile
        const startTime = Date.now();
        const compilation = await program.compile();
        const compileTime = Date.now() - startTime;
        
        // Extract VK data
        const vkHash = compilation.verificationKey.hash.toString();
        const vkData = compilation.verificationKey.data;
        
        testResults[backend] = {
          success: true,
          compileTime,
          vkHash,
          vkDataLength: vkData.length
        };
        
        console.log(`  ${backend}: ✅ ${compileTime}ms, VK: ${vkHash.slice(0, 20)}...`);
        
      } catch (error) {
        testResults[backend] = {
          success: false,
          error: error.message
        };
        console.log(`  ${backend}: ❌ ${error.message}`);
      }
    }
    
    // Compare results for this test case
    if (testResults.snarky.success && testResults.sparky.success) {
      const hashMatch = testResults.snarky.vkHash === testResults.sparky.vkHash;
      const lengthMatch = testResults.snarky.vkDataLength === testResults.sparky.vkDataLength;
      
      console.log(`  VK Match: ${hashMatch ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
      if (!hashMatch) {
        console.log(`    Snarky: ${testResults.snarky.vkHash.slice(0, 30)}...`);
        console.log(`    Sparky: ${testResults.sparky.vkHash.slice(0, 30)}...`);
      }
      
      if (!lengthMatch) {
        console.log(`  Length Mismatch: Snarky=${testResults.snarky.vkDataLength}, Sparky=${testResults.sparky.vkDataLength}`);
      }
      
      // Performance comparison
      const speedup = (testResults.snarky.compileTime / testResults.sparky.compileTime).toFixed(1);
      console.log(`  Performance: Sparky ${speedup}x faster`);
      
      testResults.hashMatch = hashMatch;
      testResults.lengthMatch = lengthMatch;
      testResults.speedup = parseFloat(speedup);
    } else {
      testResults.hashMatch = false;
      testResults.lengthMatch = false;
    }
    
    results[testCase.name] = testResults;
  }
  
  // Summary analysis
  console.log('\n📊 COMPLEXITY ANALYSIS SUMMARY');
  console.log('═'.repeat(50));
  
  console.log('\n🔑 VK Parity Results:');
  let firstFailure = null;
  for (const [testName, result] of Object.entries(results)) {
    const status = result.hashMatch ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${testName}: ${status}`);
    if (!result.hashMatch && !firstFailure) {
      firstFailure = testName;
    }
  }
  
  if (firstFailure) {
    console.log(`\n⚠️  CRITICAL FINDING: VK divergence first appears in "${firstFailure}" operation`);
    console.log(`    This indicates the constraint system encoding issue is specific to ${firstFailure.toLowerCase()} constraints`);
  } else {
    console.log('\n✅ AMAZING: All operations show VK parity! The fresh snapshot fix resolved the issue completely.');
  }
  
  // Performance analysis
  console.log('\n⚡ Performance Summary:');
  for (const [testName, result] of Object.entries(results)) {
    if (result.speedup) {
      console.log(`  ${testName}: ${result.speedup}x speedup`);
    }
  }
  
  return results;
}

// Execute the test
runProgressiveComplexityTest().catch(console.error);