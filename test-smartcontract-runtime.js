#!/usr/bin/env node

/**
 * Test SmartContract compilation using runtime declaration methods
 * 
 * Created: July 5, 2025, 1:25 AM UTC
 * Last Modified: July 5, 2025, 1:25 AM UTC
 */

import { switchBackend, getCurrentBackend, SmartContract, declareState, declareMethods, Field, Mina, Provable } from './dist/node/index.js';

async function testRuntimeSmartContract() {
  console.log('🔍 Testing SmartContract Compilation with Runtime Declaration\n');
  
  // Define a SmartContract using runtime declaration
  class RuntimeContract extends SmartContract {
    constructor(address) {
      super(address);
    }
  }
  
  // Declare state using runtime method
  declareState(RuntimeContract, {
    value: Field
  });
  
  // Define methods
  RuntimeContract.prototype.increment = function() {
    const current = this.value.getAndRequireEquals();
    const newValue = current.add(Field(1));
    this.value.set(newValue);
  };
  
  RuntimeContract.prototype.update = function(newValue) {
    const current = this.value.getAndRequireEquals();
    newValue.assertGreaterThan(current);
    this.value.set(newValue);
  };
  
  // Declare methods using runtime method
  declareMethods(RuntimeContract, {
    increment: {},
    update: {
      privateInputs: [Field]
    }
  });
  
  console.log('Contract defined with runtime declaration:');
  console.log('  - State: value (Field)');
  console.log('  - Methods: increment(), update(newValue)');
  
  // Test compilation with both backends
  const results = {};
  
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n📦 Testing ${backend} backend...`);
    switchBackend(backend);
    console.log('   Current backend:', getCurrentBackend());
    
    try {
      // Compile the contract
      console.log('   Starting compilation...');
      const startTime = Date.now();
      const compilationResult = await RuntimeContract.compile();
      const endTime = Date.now();
      
      console.log(`   ✅ ${backend}: Compilation successful`);
      console.log('      VK hash:', compilationResult.verificationKey?.hash?.toString());
      console.log('      VK data length:', compilationResult.verificationKey?.data?.length);
      console.log('      Methods compiled:', Object.keys(compilationResult.provers || {}));
      console.log('      Compilation time:', endTime - startTime, 'ms');
      
      results[backend] = {
        success: true,
        vkHash: compilationResult.verificationKey?.hash?.toString(),
        vkDataLength: compilationResult.verificationKey?.data?.length,
        methods: Object.keys(compilationResult.provers || {}),
        time: endTime - startTime
      };
      
    } catch (error) {
      console.log(`   ❌ ${backend}: Compilation failed`);
      console.log('      Error:', error.message);
      
      // Check for specific Sparky issues
      if (backend === 'sparky') {
        const sparkyInstance = globalThis.sparkyWasm || globalThis.sparky;
        console.log('      Sparky WASM available:', !!sparkyInstance);
        if (sparkyInstance) {
          console.log('      Missing functions:');
          const expectedFunctions = [
            'constraintSystemFromKeypair',
            'keypairGetVk',
            'keypairGetConstraintSystemWithAuxiliary',
            'keypairCreate',
            'proverDummyLagrangeBasisEvals'
          ];
          expectedFunctions.forEach(fn => {
            if (typeof sparkyInstance[fn] === 'undefined') {
              console.log(`        - ${fn}: ❌ missing`);
            }
          });
        }
      }
      
      results[backend] = {
        success: false,
        error: error.message
      };
    }
  }
  
  // Compare results
  console.log('\n📊 Compilation Results Summary:');
  console.log('==============================');
  
  if (results.snarky?.success && results.sparky?.success) {
    // Both succeeded
    const vkMatch = results.snarky.vkHash === results.sparky.vkHash;
    console.log(`\nVK Hash Match: ${vkMatch ? '✅' : '❌'}`);
    if (!vkMatch) {
      console.log(`  Snarky: ${results.snarky.vkHash}`);
      console.log(`  Sparky: ${results.sparky.vkHash}`);
    }
    
    console.log(`\nPerformance:`);
    console.log(`  Snarky: ${results.snarky.time}ms`);
    console.log(`  Sparky: ${results.sparky.time}ms`);
    if (results.sparky.time < results.snarky.time) {
      const speedup = results.snarky.time / results.sparky.time;
      console.log(`  🚀 Sparky is ${speedup.toFixed(1)}x faster!`);
    }
  } else {
    // Show what failed
    if (!results.snarky?.success) {
      console.log(`\nSnarky: ❌ Failed - ${results.snarky?.error}`);
    } else {
      console.log(`\nSnarky: ✅ Success`);
    }
    
    if (!results.sparky?.success) {
      console.log(`Sparky: ❌ Failed - ${results.sparky?.error}`);
    } else {
      console.log(`Sparky: ✅ Success`);
    }
  }
  
  // Test constraint generation separately
  console.log('\n\n📊 Testing Constraint Generation for Methods:');
  console.log('==========================================');
  
  for (const backend of ['snarky', 'sparky']) {
    switchBackend(backend);
    console.log(`\n${backend} backend:`);
    
    try {
      // Test increment method
      const incrementCS = await Provable.constraintSystem(() => {
        const contract = new RuntimeContract(Field(0));
        contract.value = { getAndRequireEquals: () => Field(10), set: () => {} };
        contract.increment();
      });
      console.log(`  increment() constraints: ${incrementCS.rows}`);
      
      // Test update method
      const updateCS = await Provable.constraintSystem(() => {
        const contract = new RuntimeContract(Field(0));
        contract.value = { getAndRequireEquals: () => Field(10), set: () => {} };
        contract.update(Field(20));
      });
      console.log(`  update() constraints: ${updateCS.rows}`);
    } catch (error) {
      console.log(`  Constraint generation failed: ${error.message}`);
    }
  }
}

// Run the test
testRuntimeSmartContract().catch(console.error);