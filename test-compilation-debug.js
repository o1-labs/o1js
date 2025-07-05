#!/usr/bin/env node

/**
 * Debug SmartContract compilation issues between Snarky and Sparky
 * 
 * Created: July 5, 2025, 1:00 AM UTC
 * Last Modified: July 5, 2025, 1:00 AM UTC
 */

import { switchBackend, getCurrentBackend, SmartContract, State, state, Field, method, Mina, Provable } from './dist/node/index.js';

async function testCompilation() {
  console.log('🔍 Testing SmartContract compilation with both backends...\n');
  
  // Define a simple SmartContract - using runtime definition instead of decorators
  class TestContract extends SmartContract {
    constructor(address) {
      super(address);
      this.value = State();
    }
  }
  
  // Define state
  TestContract._fields = {
    value: Field
  };
  
  // Define method
  TestContract.prototype.increment = async function() {
    const current = this.value.getAndRequireEquals();
    const newValue = current.add(Field(1));
    this.value.set(newValue);
  };
  
  // Mark as method
  TestContract._methods = ['increment'];
  
  const results = {};
  
  // Test with Snarky
  console.log('1️⃣ Testing with Snarky backend...');
  switchBackend('snarky');
  console.log('   Current backend:', getCurrentBackend());
  
  try {
    console.log('   Starting compilation...');
    const startTime = Date.now();
    const snarkyResult = await TestContract.compile();
    const endTime = Date.now();
    
    console.log('✅ Snarky compilation successful');
    console.log('   VK hash:', snarkyResult.verificationKey?.hash);
    console.log('   VK data length:', snarkyResult.verificationKey?.data?.length);
    console.log('   Methods:', Object.keys(snarkyResult.provers || {}));
    console.log('   Compilation time:', endTime - startTime, 'ms');
    
    // Try to get constraint count
    try {
      const { rows } = await Provable.constraintSystem(() => {
        const contract = new TestContract(Field(0));
        contract.increment();
      });
      console.log('   Constraint count:', rows);
    } catch (e) {
      console.log('   Constraint count: unavailable');
    }
    
    results.snarky = {
      success: true,
      vkHash: snarkyResult.verificationKey?.hash,
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
  console.log('   Sparky functions:', sparkyInstance ? Object.keys(sparkyInstance).slice(0, 10).join(', ') + '...' : 'none');
  
  try {
    console.log('   Starting compilation...');
    const startTime = Date.now();
    const sparkyResult = await TestContract.compile();
    const endTime = Date.now();
    
    console.log('✅ Sparky compilation successful');
    console.log('   VK hash:', sparkyResult.verificationKey?.hash);
    console.log('   VK data length:', sparkyResult.verificationKey?.data?.length);
    console.log('   Methods:', Object.keys(sparkyResult.provers || {}));
    console.log('   Compilation time:', endTime - startTime, 'ms');
    
    // Try to get constraint count
    try {
      const { rows } = await Provable.constraintSystem(() => {
        const contract = new TestContract(Field(0));
        contract.increment();
      });
      console.log('   Constraint count:', rows);
    } catch (e) {
      console.log('   Constraint count: unavailable');
    }
    
    results.sparky = {
      success: true,
      vkHash: sparkyResult.verificationKey?.hash,
      time: endTime - startTime
    };
  } catch (error) {
    console.log('❌ Sparky compilation failed:', error.message);
    console.log('   Stack trace:', error.stack);
    
    // Additional debug info for Sparky
    if (error.message.includes('not implemented') || error.message.includes('not available')) {
      console.log('\n⚠️  This appears to be a missing WASM function implementation.');
      console.log('   The Sparky backend may be missing compilation-related functions.');
    }
    
    results.sparky = {
      success: false,
      error: error.message
    };
  }
  
  // Summary
  console.log('\n📊 Compilation Test Summary:');
  console.log('==========================');
  if (results.snarky.success && results.sparky.success) {
    const vkMatch = results.snarky.vkHash === results.sparky.vkHash;
    console.log(`VK Hash Match: ${vkMatch ? '✅' : '❌'}`);
    if (!vkMatch) {
      console.log(`  Snarky: ${results.snarky.vkHash}`);
      console.log(`  Sparky: ${results.sparky.vkHash}`);
    }
  } else {
    if (!results.snarky.success) {
      console.log(`Snarky: ❌ Failed - ${results.snarky.error}`);
    }
    if (!results.sparky.success) {
      console.log(`Sparky: ❌ Failed - ${results.sparky.error}`);
    }
  }
}

// Run the test
testCompilation().catch(console.error);