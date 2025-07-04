/**
 * Test Sparky backend with a simple proof system
 */

import { Field, Provable, ZkProgram } from '../../../dist/node/index.js';
import { switchBackend, getCurrentBackend } from '../../../dist/node/bindings.js';

// Simple program that squares a number
const Square = ZkProgram({
  name: 'square',
  publicInput: Field,
  
  methods: {
    compute: {
      privateInputs: [Field],
      
      async method(publicInput, x) {
        // Assert that x^2 = publicInput
        x.square().assertEquals(publicInput);
      }
    }
  }
});

async function testWithBackend(backend) {
  console.log(`\n=== Testing with ${backend} backend ===`);
  
  await switchBackend(backend);
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  try {
    console.log('1. Compiling ZkProgram...');
    const startCompile = Date.now();
    await Square.compile();
    const compileTime = Date.now() - startCompile;
    console.log(`   ✓ Compiled in ${compileTime}ms`);
    
    console.log('2. Creating proof...');
    const x = Field(3);
    const publicInput = Field(9); // 3^2 = 9
    
    const startProof = Date.now();
    const proof = await Square.compute(publicInput, x);
    const proofTime = Date.now() - startProof;
    console.log(`   ✓ Proof created in ${proofTime}ms`);
    
    console.log('3. Verifying proof...');
    const startVerify = Date.now();
    const ok = await Square.verify(proof.proof);
    const verifyTime = Date.now() - startVerify;
    console.log(`   ✓ Verification ${ok ? 'passed' : 'failed'} in ${verifyTime}ms`);
    
    console.log('4. Testing with invalid input...');
    try {
      const wrongX = Field(4);
      const badProof = await Square.compute(publicInput, wrongX); // Should fail: 4^2 != 9
      console.log('   ✗ Should have failed but didn\'t!');
    } catch (error) {
      console.log('   ✓ Correctly rejected invalid proof');
    }
    
    return { 
      backend, 
      success: true, 
      compileTime, 
      proofTime, 
      verifyTime 
    };
    
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
    return { backend, success: false, error: error.message };
  }
}

async function main() {
  console.log('Testing proof generation with both backends...');
  
  // Test with Sparky
  const sparkyResult = await testWithBackend('sparky');
  
  // Test with Snarky
  const snarkyResult = await testWithBackend('snarky');
  
  // Compare results
  console.log('\n=== Results Summary ===');
  console.log(`Sparky: ${sparkyResult.success ? 'Success' : 'Failed'}`);
  if (sparkyResult.success) {
    console.log(`  - Compile: ${sparkyResult.compileTime}ms`);
    console.log(`  - Proof: ${sparkyResult.proofTime}ms`);
    console.log(`  - Verify: ${sparkyResult.verifyTime}ms`);
  } else {
    console.log(`  - Error: ${sparkyResult.error}`);
  }
  
  console.log(`\nSnarky: ${snarkyResult.success ? 'Success' : 'Failed'}`);
  if (snarkyResult.success) {
    console.log(`  - Compile: ${snarkyResult.compileTime}ms`);
    console.log(`  - Proof: ${snarkyResult.proofTime}ms`);
    console.log(`  - Verify: ${snarkyResult.verifyTime}ms`);
  }
}

main().catch(console.error);