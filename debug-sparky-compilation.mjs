#!/usr/bin/env node

/**
 * Debug script for tracing Sparky compilation failure
 * Created: January 5, 2025 13:50 UTC
 */

import { SmartContract, State, state, Field, method, Mina, switchBackend, getCurrentBackend, declareMethods } from './dist/node/index.js';

async function debugSparkyCompilation() {
  console.log('\n=== SPARKY COMPILATION DEBUG ===\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('✅ Switched to Sparky backend');
  
  // Hook into the global sparky constraint bridge to trace calls
  const originalBridge = globalThis.sparkyConstraintBridge;
  if (originalBridge) {
    console.log('🔍 Hooking into sparkyConstraintBridge...');
    
    // Wrap each function to trace calls
    const wrappedBridge = {};
    for (const [key, value] of Object.entries(originalBridge)) {
      if (typeof value === 'function') {
        wrappedBridge[key] = function(...args) {
          console.log(`📞 sparkyConstraintBridge.${key} called with args:`, args.length);
          try {
            const result = value.apply(this, args);
            console.log(`✅ sparkyConstraintBridge.${key} returned:`, typeof result);
            if (key === 'getFullConstraintSystem' && result) {
              console.log('   - gates:', result.gates?.length || 0);
              console.log('   - publicInputSize:', result.publicInputSize);
              console.log('   - constraintCount:', result.constraintCount);
              console.log('   - rowCount:', result.rowCount);
            }
            return result;
          } catch (error) {
            console.error(`❌ sparkyConstraintBridge.${key} threw:`, error.message);
            throw error;
          }
        };
      } else {
        wrappedBridge[key] = value;
      }
    }
    globalThis.sparkyConstraintBridge = wrappedBridge;
  }
  
  // Define a simple contract
  class TestContract extends SmartContract {
    constructor(address) {
      super(address);
      this.value = State();
    }
    
    async increment() {
      const current = this.value.getAndRequireEquals();
      this.value.set(current.add(1));
    }
  }
  
  // Apply decorators manually
  state(Field)(TestContract.prototype, 'value');
  declareMethods(TestContract, {
    increment: []
  });
  
  // Add debug hooks to OCaml bridge
  const originalSnarky = globalThis.__snarky;
  console.log('🔍 Checking __snarky:', {
    exists: !!originalSnarky,
    type: typeof originalSnarky,
    hasPickles: !!originalSnarky?.Pickles,
    picklesType: typeof originalSnarky?.Pickles
  });
  
  const originalPickles = originalSnarky?.Pickles;
  if (originalPickles?.compile) {
    console.log('🔍 Hooking into Pickles.compile...');
    const originalCompile = originalPickles.compile;
    
    originalPickles.compile = function(rules, options) {
      console.log('\n📞 Pickles.compile called:');
      console.log('   - rules:', rules?.length || 'undefined');
      console.log('   - options:', JSON.stringify(options, null, 2));
      console.log('   - current backend:', getCurrentBackend());
      console.log('   - __sparkyActive:', globalThis.__sparkyActive);
      
      try {
        const result = originalCompile.call(this, rules, options);
        console.log('✅ Pickles.compile returned:', typeof result);
        if (result) {
          console.log('   - getVerificationKey:', typeof result.getVerificationKey);
          console.log('   - provers:', result.provers?.length || 0);
          console.log('   - verify:', typeof result.verify);
          console.log('   - tag:', typeof result.tag);
          
          // Check if getVerificationKey works
          if (result.getVerificationKey) {
            console.log('\n🔍 Testing getVerificationKey...');
            try {
              const vkPromise = result.getVerificationKey();
              console.log('   - getVerificationKey returned:', typeof vkPromise);
              
              if (vkPromise?.then) {
                vkPromise.then(vkResult => {
                  console.log('✅ getVerificationKey promise resolved:', vkResult?.length || 'undefined');
                  if (Array.isArray(vkResult)) {
                    console.log('   - VK array length:', vkResult.length);
                    console.log('   - VK[0]:', vkResult[0]);
                    console.log('   - VK[1] (data):', typeof vkResult[1]);
                    console.log('   - VK[2] (hash):', vkResult[2]);
                  }
                }).catch(error => {
                  console.error('❌ getVerificationKey promise rejected:', error.message);
                });
              }
            } catch (vkError) {
              console.error('❌ getVerificationKey threw:', vkError.message);
            }
          }
        }
        return result;
      } catch (error) {
        console.error('❌ Pickles.compile threw:', error.message);
        throw error;
      }
    };
  }
  
  // Try to compile
  console.log('\n🚀 Starting TestContract.compile()...\n');
  try {
    const result = await TestContract.compile();
    console.log('\n✅ Compilation succeeded!');
    console.log('Result:', {
      hasVK: !!result.verificationKey,
      vkType: typeof result.verificationKey,
      proverCount: Object.keys(result.provers || {}).length
    });
    
    if (!result.verificationKey) {
      console.error('\n❌ ERROR: Compilation succeeded but no verification key!');
    }
  } catch (error) {
    console.error('\n❌ Compilation failed:', error?.message || 'undefined');
    console.error('Error type:', typeof error);
    console.error('Error value:', error);
    if (error?.stack) {
      console.error('Stack:', error.stack);
    }
  }
  
  // Restore original bridge
  if (originalBridge) {
    globalThis.sparkyConstraintBridge = originalBridge;
  }
}

debugSparkyCompilation().catch(console.error);