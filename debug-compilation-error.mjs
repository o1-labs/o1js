#!/usr/bin/env node

/**
 * Debug script to trace the exact compilation error with Sparky
 * Created: January 5, 2025 14:15 UTC
 */

import { SmartContract, State, state, Field, method, declareMethods, switchBackend } from './dist/node/index.js';

async function debugCompilationError() {
  console.log('\n=== COMPILATION ERROR DEBUG ===\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('✅ Switched to Sparky backend');
  
  // Hook into the WASM sparky instance
  const sparkyInstance = globalThis.__sparkyInstance;
  if (sparkyInstance?.field) {
    console.log('🔍 Hooking into Sparky WASM field operations...');
    
    // Wrap specific functions that might be involved in the error
    const originalScale = sparkyInstance.field.scale;
    if (originalScale) {
      sparkyInstance.field.scale = function(scalar, x) {
        console.log('\n📞 WASM scale() called:');
        console.log('   scalar:', JSON.stringify(scalar));
        console.log('   scalar type:', typeof scalar);
        console.log('   scalar length:', Array.isArray(scalar) ? scalar.length : 'not array');
        console.log('   x:', JSON.stringify(x));
        
        try {
          return originalScale.call(this, scalar, x);
        } catch (error) {
          console.error('   ❌ WASM scale error:', error.message);
          throw error;
        }
      };
    }
    
    const originalConstant = sparkyInstance.field.constant;
    if (originalConstant) {
      sparkyInstance.field.constant = function(value) {
        console.log('\n📞 WASM constant() called:');
        console.log('   value:', JSON.stringify(value));
        console.log('   value type:', typeof value);
        console.log('   value length:', Array.isArray(value) ? value.length : 'not array');
        
        try {
          return originalConstant.call(this, value);
        } catch (error) {
          console.error('   ❌ WASM constant error:', error.message);
          throw error;
        }
      };
    }
  }
  
  // Hook into OCaml bridge functions that might be involved
  const bridge = globalThis.sparkyConstraintBridge;
  if (bridge) {
    const originalGetFull = bridge.getFullConstraintSystem;
    bridge.getFullConstraintSystem = function() {
      console.log('\n📞 getFullConstraintSystem called');
      try {
        const result = originalGetFull.call(this);
        console.log('   Result:', result ? 'constraint system object' : 'null/undefined');
        return result;
      } catch (error) {
        console.error('   ❌ Error:', error.message);
        throw error;
      }
    };
  }
  
  // Define a minimal contract
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
  
  // Apply decorators
  state(Field)(TestContract.prototype, 'value');
  declareMethods(TestContract, {
    increment: []
  });
  
  // Try to compile and catch the exact error
  console.log('\n🚀 Starting compilation...\n');
  try {
    await TestContract.compile();
    console.log('✅ Compilation succeeded (unexpected\!)');
  } catch (error) {
    console.error('\n❌ Compilation error caught:');
    console.error('   Type:', typeof error);
    console.error('   Message:', error?.message || error);
    console.error('   Constructor:', error?.constructor?.name);
    console.error('   Value:', error);
    
    // If it's a string error, try to parse it
    if (typeof error === 'string' && error.includes('Sparky error:')) {
      console.error('\n🔍 Analyzing Sparky error:');
      const match = error.match(/Invalid FieldVar format: expected (.+), got (.+)/);
      if (match) {
        console.error('   Expected:', match[1]);
        console.error('   Got:', match[2]);
      }
    }
  }
}

debugCompilationError().catch(console.error);