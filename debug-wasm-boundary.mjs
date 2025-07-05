#!/usr/bin/env node

/**
 * Debug script to trace the exact WASM boundary issue
 */

import { Field, SmartContract, State, state, method, Mina, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('🔍 WASM Boundary Debug');
console.log('======================\n');

// Override JSON.stringify to handle BigInt and trace calls
const originalStringify = JSON.stringify;
JSON.stringify = function(value, replacer, space) {
  console.log('\n📍 JSON.stringify called:');
  console.log('  Value type:', typeof value);
  console.log('  Value:', value);
  
  // Custom replacer to handle BigInt
  const bigIntReplacer = function(key, val) {
    if (typeof val === 'bigint') {
      console.log(`  Converting BigInt at key "${key}": ${val}n → "${val}"`);
      return val.toString();
    }
    return val;
  };
  
  // Combine with user's replacer if provided
  const combinedReplacer = replacer 
    ? function(k, v) { 
        const result = bigIntReplacer(k, v);
        return replacer(k, result);
      }
    : bigIntReplacer;
  
  try {
    const result = originalStringify.call(this, value, combinedReplacer, space);
    console.log('  Result:', result);
    return result;
  } catch (e) {
    console.log('  ERROR:', e.message);
    throw e;
  }
};

// Switch to Sparky backend
await switchBackend('sparky');
console.log('✅ Using Sparky backend\n');

// Create a SmartContract to trigger the error
const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);

// Create inline contract class
const TestContract = class extends SmartContract {
  constructor(address) {
    super(address);
  }
};

// Add state manually
state(Field)(TestContract.prototype, 'value');

// Add method manually
method(TestContract.prototype, 'setValue', [Field], function(x) {
  console.log('\n🔍 Inside setValue method:');
  console.log('  x:', x);
  console.log('  x.value:', x.value);
  this.value.set(x);
});

console.log('Starting compilation...\n');

// Intercept sparky adapter calls
const sparkyBridge = globalThis.sparkyConstraintBridge;
if (sparkyBridge) {
  console.log('✅ Intercepting sparkyConstraintBridge calls...\n');
  
  // Intercept all bridge methods
  const methodsToIntercept = Object.getOwnPropertyNames(sparkyBridge)
    .filter(name => typeof sparkyBridge[name] === 'function');
  
  methodsToIntercept.forEach(methodName => {
    const original = sparkyBridge[methodName];
    sparkyBridge[methodName] = function(...args) {
      console.log(`\n🔧 ${methodName} called with ${args.length} arguments`);
      args.forEach((arg, i) => {
        console.log(`  arg[${i}]:`, arg);
        if (Array.isArray(arg)) {
          console.log(`    (array with ${arg.length} elements)`);
        }
      });
      
      try {
        const result = original.apply(this, args);
        console.log(`  → result:`, result);
        return result;
      } catch (e) {
        console.log(`  → ERROR: ${e.message}`);
        throw e;
      }
    };
  });
}

// Also intercept direct sparky calls if available
const sparky = globalThis.__sparky;
if (sparky && sparky.field) {
  console.log('✅ Intercepting __sparky.field calls...\n');
  
  const fieldMethods = Object.getOwnPropertyNames(sparky.field)
    .filter(name => typeof sparky.field[name] === 'function');
  
  fieldMethods.forEach(methodName => {
    const original = sparky.field[methodName];
    sparky.field[methodName] = function(...args) {
      console.log(`\n🔬 field.${methodName} called with ${args.length} arguments`);
      args.forEach((arg, i) => {
        console.log(`  arg[${i}]:`, arg);
        if (Array.isArray(arg) && arg.some(elem => typeof elem === 'bigint')) {
          console.log(`    ⚠️  Contains BigInt!`);
        }
      });
      
      try {
        const result = original.apply(this, args);
        console.log(`  → result:`, result);
        return result;
      } catch (e) {
        console.log(`  → ERROR: ${e.message}`);
        console.log(`     Full error:`, e);
        throw e;
      }
    };
  });
}

try {
  await TestContract.compile();
  console.log('\n✅ Compilation succeeded!');
} catch (e) {
  console.log('\n❌ Compilation failed:', e.message);
  
  if (e.message.includes('FieldVar format')) {
    console.log('\n🎯 FOUND THE FIELDVAR FORMAT ERROR!');
    console.log('This is where the 4-argument error occurs.');
  }
}