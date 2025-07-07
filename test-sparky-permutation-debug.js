#!/usr/bin/env node
import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

console.log('🔍 Sparky Permutation Debug Test');
console.log('==================================\n');

// Test program similar to SimpleArithmetic from correctness benchmark
const TestProgram = ZkProgram({
  name: 'TestProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field, Field],
      async method(publicInput, a, b) {
        // Create actual constraints: result = publicInput + a * b
        const result = a.mul(b).add(publicInput);
        return { publicOutput: result };
      },
    },
  },
});

async function testBackend(backend) {
  console.log(`\n📊 Testing ${backend} backend:`);
  console.log('─'.repeat(40));
  
  try {
    // Switch backend
    await switchBackend(backend);
    console.log(`✅ Switched to ${backend}`);
    
    // Compile
    console.log('⏳ Compiling...');
    const startCompile = Date.now();
    const { verificationKey } = await TestProgram.compile();
    const compileTime = Date.now() - startCompile;
    console.log(`✅ Compiled in ${compileTime}ms`);
    console.log(`📝 VK hash: ${verificationKey.hash}`);
    
    // Create proof with actual inputs
    console.log('⏳ Creating proof...');
    const publicInput = Field(10);
    const a = Field(5);
    const b = Field(3);
    // Expected: 10 + 5 * 3 = 25
    
    const startProof = Date.now();
    const proofResult = await TestProgram.compute(publicInput, a, b);
    const proof = proofResult.proof || proofResult;
    const proofTime = Date.now() - startProof;
    console.log(`✅ Proof created in ${proofTime}ms`);
    console.log(`📊 Public output: ${proof.publicOutput}`);
    
    // Verify proof
    console.log('⏳ Verifying proof...');
    const startVerify = Date.now();
    const isValid = await TestProgram.verify(proof);
    const verifyTime = Date.now() - startVerify;
    console.log(`✅ Verified in ${verifyTime}ms`);
    console.log(`📊 Proof valid: ${isValid}`);
    
    return { 
      success: true, 
      vkHash: verificationKey.hash,
      publicOutput: proof.publicOutput,
      proofValid: isValid
    };
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (error.stack) {
      // Show more detailed stack trace for permutation errors
      if (error.message.includes('permutation')) {
        console.error('\n🔍 Full error details:');
        console.error(error.stack);
      } else {
        console.error('\nStack trace:');
        console.error(error.stack.split('\n').slice(0, 10).join('\n'));
      }
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Testing ZkProgram with actual constraints to isolate permutation error\n');
  
  // Test both backends
  const snarkyResult = await testBackend('snarky');
  const sparkyResult = await testBackend('sparky');
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📈 SUMMARY:');
  console.log('─'.repeat(50));
  console.log(`Snarky: ${snarkyResult.success ? '✅ PASS' : '❌ FAIL'}`);
  if (snarkyResult.success) {
    console.log(`  - VK Hash: ${snarkyResult.vkHash}`);
    console.log(`  - Output: ${snarkyResult.publicOutput}`);
  }
  console.log(`Sparky: ${sparkyResult.success ? '✅ PASS' : '❌ FAIL'}`);
  if (sparkyResult.success) {
    console.log(`  - VK Hash: ${sparkyResult.vkHash}`);
    console.log(`  - Output: ${sparkyResult.publicOutput}`);
  }
  
  if (!snarkyResult.success || !sparkyResult.success) {
    console.log('\n⚠️  One or both backends failed!');
    if (sparkyResult.error && sparkyResult.error.includes('permutation')) {
      console.log('\n🎯 PERMUTATION ERROR REPRODUCED!');
      console.log('The permutation construction issue has been isolated.');
    }
  } else if (snarkyResult.vkHash === sparkyResult.vkHash) {
    console.log('\n✅ VK hashes match!');
  } else {
    console.log('\n⚠️  VK hashes differ!');
  }
  
  process.exit(snarkyResult.success && sparkyResult.success ? 0 : 1);
}

main().catch(console.error);