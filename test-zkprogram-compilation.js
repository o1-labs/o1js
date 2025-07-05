#!/usr/bin/env node

/**
 * Debug ZkProgram compilation issues between Snarky and Sparky
 * 
 * Created: July 5, 2025, 1:05 AM UTC
 * Last Modified: July 5, 2025, 1:05 AM UTC
 */

import { switchBackend, getCurrentBackend, ZkProgram, Field, Provable } from './dist/node/index.js';

async function testZkProgramCompilation() {
  console.log('🔍 Testing ZkProgram compilation with both backends...\n');
  
  // Define a simple ZkProgram
  const TestProgram = ZkProgram({
    name: 'test-program',
    publicInput: Field,
    
    methods: {
      double: {
        privateInputs: [Field],
        method(publicInput, secret) {
          const result = publicInput.mul(Field(2)).add(secret);
          return result;
        }
      }
    }
  });
  
  const results = {};
  
  // Test with Snarky
  console.log('1️⃣ Testing with Snarky backend...');
  switchBackend('snarky');
  console.log('   Current backend:', getCurrentBackend());
  
  try {
    console.log('   Starting compilation...');
    const startTime = Date.now();
    const snarkyResult = await TestProgram.compile();
    const endTime = Date.now();
    
    console.log('✅ Snarky compilation successful');
    console.log('   VK hash:', snarkyResult.verificationKey?.hash?.toString());
    console.log('   VK data length:', snarkyResult.verificationKey?.data?.length);
    console.log('   Compilation time:', endTime - startTime, 'ms');
    
    // Try to analyze methods for constraint count
    try {
      const analysis = await TestProgram.analyzeMethods();
      console.log('   Method analysis:', analysis);
    } catch (e) {
      console.log('   Method analysis: unavailable');
    }
    
    results.snarky = {
      success: true,
      vkHash: snarkyResult.verificationKey?.hash?.toString(),
      time: endTime - startTime
    };
  } catch (error) {
    console.log('❌ Snarky compilation failed:', error.message);
    console.log('   Stack trace:', error.stack);
    results.snarky = {
      success: false,
      error: error.message
    };
  }
  
  // Test with Sparky
  console.log('\n2️⃣ Testing with Sparky backend...');
  switchBackend('sparky');
  console.log('   Current backend:', getCurrentBackend());
  
  // Check if sparky is properly initialized
  const sparkyInstance = globalThis.sparkyWasm || globalThis.sparky;
  console.log('   Sparky instance available:', !!sparkyInstance);
  if (sparkyInstance) {
    console.log('   Key functions:');
    console.log('     - assertEqual:', typeof sparkyInstance.assertEqual);
    console.log('     - constraintSystemFromKeypair:', typeof sparkyInstance.constraintSystemFromKeypair);
    console.log('     - keypairGetVk:', typeof sparkyInstance.keypairGetVk);
    console.log('     - poseidon:', !!sparkyInstance.poseidon);
  }
  
  try {
    console.log('   Starting compilation...');
    const startTime = Date.now();
    const sparkyResult = await TestProgram.compile();
    const endTime = Date.now();
    
    console.log('✅ Sparky compilation successful');
    console.log('   VK hash:', sparkyResult.verificationKey?.hash?.toString());
    console.log('   VK data length:', sparkyResult.verificationKey?.data?.length);
    console.log('   Compilation time:', endTime - startTime, 'ms');
    
    // Try to analyze methods for constraint count
    try {
      const analysis = await TestProgram.analyzeMethods();
      console.log('   Method analysis:', analysis);
    } catch (e) {
      console.log('   Method analysis: unavailable');
    }
    
    results.sparky = {
      success: true,
      vkHash: sparkyResult.verificationKey?.hash?.toString(),
      time: endTime - startTime
    };
  } catch (error) {
    console.log('❌ Sparky compilation failed:', error.message);
    console.log('   Stack trace:', error.stack?.split('\n').slice(0, 5).join('\n'));
    
    // Additional debug info for Sparky
    if (error.message.includes('not implemented') || error.message.includes('not available')) {
      console.log('\n⚠️  This appears to be a missing WASM function implementation.');
      console.log('   The Sparky backend may be missing compilation-related functions.');
    }
    
    if (error.message.includes('undefined') || error.message.includes('null')) {
      console.log('\n⚠️  This might be an uninitialized function or missing binding.');
    }
    
    results.sparky = {
      success: false,
      error: error.message
    };
  }
  
  // Summary
  console.log('\n📊 ZkProgram Compilation Test Summary:');
  console.log('=====================================');
  if (results.snarky.success && results.sparky.success) {
    const vkMatch = results.snarky.vkHash === results.sparky.vkHash;
    console.log(`VK Hash Match: ${vkMatch ? '✅' : '❌'}`);
    if (!vkMatch) {
      console.log(`  Snarky: ${results.snarky.vkHash}`);
      console.log(`  Sparky: ${results.sparky.vkHash}`);
    }
    console.log(`\nPerformance:`);
    console.log(`  Snarky: ${results.snarky.time}ms`);
    console.log(`  Sparky: ${results.sparky.time}ms`);
    console.log(`  Ratio: ${(results.sparky.time / results.snarky.time).toFixed(2)}x`);
  } else {
    if (!results.snarky.success) {
      console.log(`Snarky: ❌ Failed - ${results.snarky.error}`);
    }
    if (!results.sparky.success) {
      console.log(`Sparky: ❌ Failed - ${results.sparky.error}`);
    }
  }
  
  // Test constraint counting separately
  console.log('\n📊 Testing Constraint Counting:');
  console.log('==============================');
  
  // Snarky constraint count
  switchBackend('snarky');
  try {
    const { rows: snarkyRows } = await Provable.constraintSystem(() => {
      TestProgram.rawMethods.double(Field(10), Field(5));
    });
    console.log(`Snarky constraints: ${snarkyRows}`);
  } catch (e) {
    console.log(`Snarky constraints: Failed - ${e.message}`);
  }
  
  // Sparky constraint count
  switchBackend('sparky');
  try {
    const { rows: sparkyRows } = await Provable.constraintSystem(() => {
      TestProgram.rawMethods.double(Field(10), Field(5));
    });
    console.log(`Sparky constraints: ${sparkyRows}`);
  } catch (e) {
    console.log(`Sparky constraints: Failed - ${e.message}`);
  }
}

// Run the test
testZkProgramCompilation().catch(console.error);