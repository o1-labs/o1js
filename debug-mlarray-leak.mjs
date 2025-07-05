#!/usr/bin/env node

/**
 * Debug script to find where MLArray format is leaking into FieldVar
 */

import { Field, SmartContract, State, state, method, Mina, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('🔍 MLArray Format Leak Debug');
console.log('============================\n');

// Switch to Sparky backend
await switchBackend('sparky');
console.log('✅ Using Sparky backend:', getCurrentBackend());

// Intercept sparkyConstraintBridge calls to see what's being passed
const bridge = globalThis.sparkyConstraintBridge;
if (bridge) {
  console.log('🔧 Intercepting bridge calls...\n');
  
  // Keep track of all calls and their arguments
  const callLog = [];
  
  // Intercept all methods
  const methods = Object.getOwnPropertyNames(bridge)
    .filter(name => typeof bridge[name] === 'function');
  
  methods.forEach(methodName => {
    const original = bridge[methodName];
    bridge[methodName] = function(...args) {
      const logEntry = {
        method: methodName,
        args: args.map(arg => {
          if (Array.isArray(arg)) {
            return {
              type: 'array',
              length: arg.length,
              firstElement: arg[0],
              isMlArray: arg.length > 0 && arg[0] === 0,
              preview: JSON.stringify(arg).substring(0, 100) + '...'
            };
          }
          return { type: typeof arg, value: arg };
        })
      };
      
      callLog.push(logEntry);
      
      // Log MLArray-like structures
      args.forEach((arg, i) => {
        if (Array.isArray(arg) && arg.length === 4 && arg[0] === 0) {
          console.log(`\n🚨 POTENTIAL MLARRAY in ${methodName} arg[${i}]:`);
          console.log('  Full value:', arg);
          console.log('  This looks like [0, elem1, elem2, elem3] - an MLArray!');
        }
      });
      
      try {
        return original.apply(this, args);
      } catch (e) {
        console.log(`\n❌ Error in ${methodName}:`, e.message);
        if (e.message.includes('4 arguments')) {
          console.log('🎯 This is the 4-argument error!');
          console.log('Last few calls before error:');
          callLog.slice(-5).forEach(entry => {
            console.log(`  ${entry.method}:`, entry.args);
          });
        }
        throw e;
      }
    };
  });
}

// Set up test contract
const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);

// Create a contract with state initialization
class TestContract extends SmartContract {
  constructor(address) {
    super(address);
  }
  
  init() {
    super.init();
    console.log('\n📍 Inside init()');
    
    // Create a Field and see what happens
    const zero = Field(0);
    console.log('  Field(0) created');
    console.log('  zero.value:', zero.value);
    console.log('  zero.value is array:', Array.isArray(zero.value));
    console.log('  zero.value.length:', zero.value?.length);
    
    // Try to intercept the state.set call
    const originalSet = this.value.set;
    this.value.set = function(field) {
      console.log('\n📍 State.set() called:');
      console.log('  field:', field);
      console.log('  field.value:', field.value);
      console.log('  field.constructor.name:', field.constructor.name);
      
      // Check if field is wrapped in something
      if (field && typeof field === 'object') {
        console.log('  field keys:', Object.keys(field));
      }
      
      return originalSet.call(this, field);
    };
    
    this.value.set(zero);
  }
}

// Add state manually
state(Field)(TestContract.prototype, 'value');

// Add a simple method
method(TestContract.prototype, 'setValue', [Field], function(x) {
  this.value.set(x);
});

console.log('\n🔧 Starting compilation...\n');

try {
  await TestContract.compile();
  console.log('✅ Compilation succeeded!');
} catch (e) {
  console.log('❌ Compilation failed:', e.message);
  
  // Log the full error
  if (e.message.includes('FieldVar format') || e.message.includes('4 arguments')) {
    console.log('\n🎯 FOUND THE ERROR!');
    console.log('Full error:', e);
  }
}

// Also check Field structure more deeply
console.log('\n📋 Deep Field Structure Analysis');
console.log('--------------------------------');

const testField = Field(123);
console.log('Field(123) structure:');
console.log('  .value:', testField.value);
console.log('  .toJSON:', typeof testField.toJSON);
console.log('  .toBigInt:', typeof testField.toBigInt);
console.log('  .toString:', typeof testField.toString);

// Check if Field has any array-like properties
if (testField.value && Array.isArray(testField.value)) {
  console.log('\nChecking if value could be mistaken for MLArray:');
  console.log('  value[0]:', testField.value[0]);
  console.log('  value.length:', testField.value.length);
  console.log('  Matches MLArray pattern [0, ...]:', testField.value[0] === 0);
}