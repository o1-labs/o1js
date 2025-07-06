#!/usr/bin/env node

/**
 * Minimal test that exactly matches the correctness benchmark
 */

console.log('🧪 Minimal Correctness Test');
console.log('============================');

async function runMinimalTest() {
  try {
    const o1js = await import('./dist/node/index.js');
    
    // Switch to Sparky to test the failing case
    await o1js.switchBackend('sparky');
    console.log('✅ Switched to sparky backend');
    
    // Create the exact same program as in the correctness benchmark
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
    
    console.log('🔧 Compiling program...');
    await SimpleArithmetic.compile();
    console.log('✅ Compilation successful');
    
    // Test the exact same inputs as the failing test case
    console.log('🎯 Testing normal_values case: [10, 5, 3]');
    console.log('   Expected: 10 + 5*3 = 25');
    
    // Use Field types as expected by the method signature
    const publicInput = o1js.Field(10);
    const a = o1js.Field(5);
    const b = o1js.Field(3);
    
    console.log('📋 Calling SimpleArithmetic.compute...');
    const proofResult = await SimpleArithmetic.compute(publicInput, a, b);
    
    console.log('✅ Proof generation successful');
    console.log('📊 Result structure:', {
      hasProof: !!proofResult.proof,
      hasPublicOutput: !!proofResult.publicOutput,
      directProof: !!proofResult.toString // Check if proofResult is itself a proof
    });
    
    // Handle both { proof } and direct proof return patterns
    const proof = proofResult.proof || proofResult;
    
    if (proof.publicOutput) {
      console.log('📋 Public output:', proof.publicOutput.toString());
    } else {
      console.log('⚠️  No publicOutput found in proof');
    }
    
    console.log('🔍 Verifying proof...');
    const verified = await SimpleArithmetic.verify(proof);
    console.log('✅ Verification result:', verified);
    
    if (verified) {
      console.log('🎉 Test PASSED - Sparky is working correctly!');
    } else {
      console.log('❌ Test FAILED - Verification returned false');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('Stack:', error.stack);
    
    // Analyze the error type
    if (error.message.includes('permutation')) {
      console.log('\n🔍 DIAGNOSIS: Constraint system permutation error');
      console.log('   This occurs during proof generation when the constraint');
      console.log('   system has inconsistent variable ordering or layout.');
    } else if (error.message.includes('toConstant')) {
      console.log('\n🔍 DIAGNOSIS: JavaScript type error in proof handling');
      console.log('   This suggests an issue with how proof objects are constructed');
      console.log('   or accessed in the verification code.');
    }
  }
}

runMinimalTest().catch(console.error);