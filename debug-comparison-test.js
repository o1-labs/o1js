#!/usr/bin/env node

/**
 * Comparison test to understand the difference between Snarky and Sparky
 */

console.log('🔄 Snarky vs Sparky Comparison Test');
console.log('====================================');

async function testBackend(backendName) {
  console.log(`\n🧪 Testing ${backendName.toUpperCase()} backend:`);
  console.log('─'.repeat(40));
  
  try {
    const o1js = await import('./dist/node/index.js');
    
    // Switch to the target backend
    await o1js.switchBackend(backendName);
    console.log(`✅ Switched to ${backendName} backend`);
    
    // Test basic field operations
    const a = o1js.Field(5);
    const b = o1js.Field(3);
    const c = a.mul(b);
    console.log(`✅ Field operations: 5 * 3 = ${c.toString()}`);
    
    // Create the same ZkProgram as the correctness test
    const SimpleArithmetic = o1js.ZkProgram({
      name: 'SimpleArithmetic',
      publicInput: o1js.Field,
      publicOutput: o1js.Field,
      methods: {
        compute: {
          privateInputs: [o1js.Field, o1js.Field],
          async method(publicInput, a, b) {
            const result = a.mul(b).add(publicInput);
            return { publicOutput: result };
          },
        },
      },
    });
    
    console.log('🔧 Compiling ZkProgram...');
    await SimpleArithmetic.compile();
    console.log('✅ Compilation successful');
    
    console.log('🎯 Running test case: compute(10, 5, 3) expecting 25...');
    try {
      const proof = await SimpleArithmetic.compute(o1js.Field(10), o1js.Field(5), o1js.Field(3));
      console.log('✅ Proof generation successful');
      
      const verified = await SimpleArithmetic.verify(proof);
      console.log(`✅ Verification result: ${verified}`);
      
      if (proof.publicOutput) {
        console.log(`✅ Public output: ${proof.publicOutput.toString()}`);
      }
      
      return { success: true, backend: backendName };
      
    } catch (proofError) {
      console.log('❌ Proof generation failed:', proofError.message);
      if (proofError.message.includes('permutation')) {
        console.log('🔍 This is a constraint system permutation error');
        console.log('   indicating an issue in constraint generation or variable layout');
      }
      return { success: false, backend: backendName, error: proofError.message };
    }
    
  } catch (error) {
    console.log(`❌ ${backendName} test failed:`, error.message);
    return { success: false, backend: backendName, error: error.message };
  }
}

async function runComparison() {
  const results = {};
  
  // Test Snarky backend
  results.snarky = await testBackend('snarky');
  
  // Test Sparky backend
  results.sparky = await testBackend('sparky');
  
  // Compare results
  console.log('\n📊 COMPARISON RESULTS');
  console.log('═'.repeat(40));
  console.log(`Snarky: ${results.snarky.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Sparky: ${results.sparky.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (results.snarky.success && !results.sparky.success) {
    console.log('\n🔍 ANALYSIS: Sparky backend has a constraint system issue');
    console.log('The problem occurs during proof generation, not compilation.');
    console.log('This suggests the constraint graph is malformed.');
    console.log(`\nSparky error: ${results.sparky.error}`);
  } else if (!results.snarky.success && results.sparky.success) {
    console.log('\n🔍 ANALYSIS: Snarky backend has an issue');
  } else if (!results.snarky.success && !results.sparky.success) {
    console.log('\n🔍 ANALYSIS: Both backends have issues');
  } else {
    console.log('\n🎉 ANALYSIS: Both backends working correctly!');
  }
}

runComparison().catch(console.error);