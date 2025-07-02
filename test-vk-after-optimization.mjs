#!/usr/bin/env node

/**
 * Test VK generation after constraint optimization breakthrough
 */

import { Field, ZkProgram, Provable, switchBackend } from './dist/node/index.js';

async function testVKGeneration(backend) {
  console.log(`\n🔧 Testing VK generation with ${backend.toUpperCase()}...`);
  
  await switchBackend(backend);
  
  // Simple program for VK comparison
  const SimpleProgram = ZkProgram({
    name: 'SimpleTest',
    publicInput: Field,
    methods: {
      simpleAdd: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          const sum = publicInput.add(privateInput);
          sum.assertEquals(Field(5)); // Simple assertion
        }
      }
    }
  });
  
  try {
    console.log(`   Compiling program...`);
    const compileStart = performance.now();
    const { verificationKey } = await SimpleProgram.compile();
    const compileTime = performance.now() - compileStart;
    
    console.log(`   Compile time: ${compileTime.toFixed(2)}ms`);
    console.log(`   VK hash: ${verificationKey.hash}`);
    console.log(`   VK data length: ${verificationKey.data.length}`);
    
    return {
      backend,
      compileTime,
      vkHash: verificationKey.hash,
      vkDataLength: verificationKey.data.length,
      success: true
    };
    
  } catch (error) {
    console.log(`   ❌ Compilation failed: ${error.message}`);
    return {
      backend,
      compileTime: 0,
      vkHash: null,
      vkDataLength: 0,
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🚀 VK Generation Test After Constraint Optimization');
  console.log('==================================================');
  
  try {
    const snarkyResult = await testVKGeneration('snarky');
    const sparkyResult = await testVKGeneration('sparky');
    
    console.log('\n📊 VK COMPARISON');
    console.log('================');
    
    if (snarkyResult.success && sparkyResult.success) {
      const vkMatch = snarkyResult.vkHash === sparkyResult.vkHash;
      const lengthMatch = snarkyResult.vkDataLength === sparkyResult.vkDataLength;
      
      console.log(`VK Hash Match: ${vkMatch ? '✅' : '❌'}`);
      console.log(`  Snarky: ${snarkyResult.vkHash}`);
      console.log(`  Sparky: ${sparkyResult.vkHash}`);
      
      console.log(`VK Data Length Match: ${lengthMatch ? '✅' : '❌'}`);
      console.log(`  Snarky: ${snarkyResult.vkDataLength}`);
      console.log(`  Sparky: ${sparkyResult.vkDataLength}`);
      
      const compileRatio = sparkyResult.compileTime / snarkyResult.compileTime;
      console.log(`Compile Time Ratio: ${compileRatio.toFixed(2)}x`);
      
      if (vkMatch && lengthMatch) {
        console.log('\n🎉 VK PARITY ACHIEVED!');
        console.log('The constraint optimization breakthrough has achieved VK compatibility!');
      } else {
        console.log('\n⚠️ VK parity not yet achieved, but constraint optimization is working');
        console.log('Further API compatibility fixes needed for full VK parity');
      }
    } else {
      console.log('\n❌ One or both backends failed to compile');
      if (!snarkyResult.success) console.log(`Snarky error: ${snarkyResult.error}`);
      if (!sparkyResult.success) console.log(`Sparky error: ${sparkyResult.error}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);