#!/usr/bin/env node

/**
 * Debug script to trace ML Array issues during compilation
 * Created: January 5, 2025 14:35 UTC
 */

import { SmartContract, State, state, Field, method, switchBackend, declareMethods } from './dist/node/index.js';

async function debugCompilationMLArray() {
  console.log('\n=== COMPILATION ML ARRAY DEBUG ===\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('✅ Switched to Sparky backend');
  
  // Hook into all field operations to trace ML Array issues
  const sparkyInstance = globalThis.__sparkyInstance;
  if (sparkyInstance?.field) {
    // Wrap ALL field functions to catch the ML Array
    for (const [name, func] of Object.entries(sparkyInstance.field)) {
      if (typeof func === 'function') {
        const originalFunc = func;
        sparkyInstance.field[name] = function(...args) {
          console.log(`\n📞 WASM field.${name}() called with ${args.length} args`);
          
          args.forEach((arg, i) => {
            if (Array.isArray(arg) && arg.length === 4) {
              console.log(`   🚨 Arg[${i}] is 4-element array:`, JSON.stringify(arg));
              console.log(`      [0]:`, arg[0], typeof arg[0]);
              console.log(`      [1]:`, arg[1], typeof arg[1]);
              console.log(`      [2]:`, arg[2], typeof arg[2]);
              console.log(`      [3]:`, arg[3], typeof arg[3]);
            }
          });
          
          try {
            return originalFunc.apply(this, args);
          } catch (error) {
            console.error(`   ❌ ${name} error:`, error.message);
            throw error;
          }
        };
      }
    }
  }
  
  // Also hook the OCaml bridge to see what's coming from OCaml
  const bridge = globalThis.sparkyConstraintBridge;
  if (bridge) {
    const originalStart = bridge.startConstraintAccumulation;
    bridge.startConstraintAccumulation = function() {
      console.log('\n🔍 OCaml calling startConstraintAccumulation');
      return originalStart.call(this);
    };
    
    const originalEnd = bridge.endConstraintAccumulation;
    bridge.endConstraintAccumulation = function() {
      console.log('\n🔍 OCaml calling endConstraintAccumulation');
      return originalEnd.call(this);
    };
  }
  
  // Hook into __snarky.field operations too
  const snarkyField = globalThis.__snarky?.field;
  if (snarkyField) {
    const originalConstant = snarkyField.constant;
    snarkyField.constant = function(value) {
      console.log('\n📞 __snarky.field.constant called:');
      console.log('   value:', JSON.stringify(value));
      console.log('   value type:', typeof value);
      
      if (Array.isArray(value)) {
        console.log('   value is array, length:', value.length);
        if (value.length === 4) {
          console.log('   🚨 4-ELEMENT ARRAY DETECTED IN __snarky.field.constant!');
        }
      }
      
      return originalConstant.call(this, value);
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
  declareMethods(TestContract, { increment: [] });
  
  // Try to compile
  console.log('\n🚀 Starting compilation...\n');
  try {
    await TestContract.compile();
    console.log('✅ Compilation succeeded!');
  } catch (error) {
    console.error('\n❌ Compilation failed:', error);
  }
}

debugCompilationMLArray().catch(console.error);