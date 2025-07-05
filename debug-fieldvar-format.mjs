#!/usr/bin/env node

/**
 * Debug script to investigate FieldVar format error during SmartContract compilation
 * 
 * Error: "Invalid FieldVar format: expected constant with 1 argument, got 4 arguments"
 */

console.log('🔍 FieldVar Format Debug Script');
console.log('================================\n');

// Load o1js with Sparky backend
import { Field, SmartContract, State, state, method, Mina, switchBackend, getCurrentBackend } from './dist/node/index.js';

// Switch to Sparky backend
console.log('🔄 Switching to Sparky backend...');
await switchBackend('sparky');
console.log('✅ Backend switched to:', getCurrentBackend());
console.log('');

// Test 1: Simple Field constant creation
console.log('📋 Test 1: Field Constant Creation');
console.log('----------------------------------');
try {
  const field1 = Field(123);
  console.log('Field(123) created successfully');
  console.log('Field.value format:', JSON.stringify(field1.value));
  console.log('Field.value type:', typeof field1.value);
  console.log('Field.value is array:', Array.isArray(field1.value));
  if (Array.isArray(field1.value)) {
    console.log('Field.value length:', field1.value.length);
    console.log('Field.value elements:', field1.value.map((v, i) => `[${i}]: ${JSON.stringify(v)}`).join(', '));
  }
} catch (error) {
  console.error('❌ Error creating Field constant:', error.message);
}
console.log('');

// Test 2: Field operations
console.log('📋 Test 2: Field Operations');
console.log('---------------------------');
try {
  const a = Field(10);
  const b = Field(20);
  console.log('a = Field(10), a.value:', JSON.stringify(a.value));
  console.log('b = Field(20), b.value:', JSON.stringify(b.value));
  
  // Test addition
  const sum = a.add(b);
  console.log('sum = a.add(b), sum.value:', JSON.stringify(sum.value));
  
  // Test with Field(0) and Field(1)
  const zero = Field(0);
  const one = Field(1);
  console.log('Field(0).value:', JSON.stringify(zero.value));
  console.log('Field(1).value:', JSON.stringify(one.value));
} catch (error) {
  console.error('❌ Error in field operations:', error.message);
}
console.log('');

// Test 3: What happens when Field is used in state
console.log('📋 Test 3: Field in State Context');
console.log('---------------------------------');
try {
  // Check what Field looks like when used as a state type
  console.log('Field constructor:', Field);
  console.log('Field.name:', Field.name);
  console.log('Field as string:', Field.toString());
  
  // Check if Field has special properties for state
  const stateFieldKeys = Object.keys(Field);
  console.log('Field keys:', stateFieldKeys.slice(0, 10), '...'); // First 10 keys
  
  // Check Field prototype
  console.log('Field.prototype keys:', Object.keys(Field.prototype).slice(0, 10), '...');
} catch (error) {
  console.error('❌ Error examining Field:', error.message);
}
console.log('');

// Test 4: Direct WASM interaction test
console.log('📋 Test 4: Direct Sparky Interaction');
console.log('------------------------------------');
try {
  // Check if we can access the sparky constraint bridge
  if (globalThis.sparkyConstraintBridge) {
    console.log('✅ sparkyConstraintBridge available');
    console.log('Bridge methods:', Object.keys(globalThis.sparkyConstraintBridge));
  } else {
    console.log('❌ sparkyConstraintBridge not available');
  }
  
  // Check sparky instance
  if (globalThis.__sparky) {
    console.log('✅ __sparky available');
    if (globalThis.__sparky.field) {
      console.log('Field module methods:', Object.keys(globalThis.__sparky.field));
      
      // Try creating a constant directly
      try {
        console.log('\n🔍 Testing direct constant creation:');
        const testValue = "123";
        console.log('Input value:', testValue);
        console.log('Input type:', typeof testValue);
        
        const result = globalThis.__sparky.field.constant(testValue);
        console.log('Direct constant result:', JSON.stringify(result));
        console.log('Result type:', typeof result);
        console.log('Result is array:', Array.isArray(result));
      } catch (e) {
        console.error('Direct constant creation error:', e.message);
      }
    }
  } else {
    console.log('❌ __sparky not available');
  }
} catch (error) {
  console.error('❌ Error in direct interaction:', error.message);
}
console.log('');

// Test 5: Check the actual error location
console.log('📋 Test 5: Tracing the Error Path');
console.log('---------------------------------');
try {
  // Create a simple circuit that triggers the error
  const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(Local);
  console.log('✅ LocalBlockchain initialized');
  
  // Use decorator syntax properly
  class TestContract extends SmartContract {
    // We'll manually set up the state since decorators are tricky
    constructor(address) {
      super(address);
      // Manual state setup
      this.value = State();
    }
    
    init() {
      super.init();
      console.log('🔍 Inside init()');
      try {
        const zero = Field(0);
        console.log('  Field(0) created, value:', JSON.stringify(zero.value));
        console.log('  About to call this.value.set()...');
        this.value.set(zero);
        console.log('  ✅ set() succeeded');
      } catch (e) {
        console.error('  ❌ Error in init():', e.message);
        throw e;
      }
    }
  }
  
  // Add state decorator manually
  state(Field)(TestContract.prototype, 'value');
  
  console.log('\n🔧 Starting compilation...');
  try {
    await TestContract.compile();
    console.log('✅ Compilation succeeded!');
  } catch (error) {
    console.error('❌ Compilation error:', error.message);
    
    // Try to find where the error originates
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      console.log('\n📍 Error location:');
      stackLines.slice(0, 5).forEach(line => console.log('  ', line));
    }
  }
} catch (error) {
  console.error('❌ Test setup error:', error.message);
}