#!/usr/bin/env node

/**
 * Debug script focused on BigInt serialization issue in FieldVar format
 */

import { Field, SmartContract, State, state, method, Mina, switchBackend, getCurrentBackend, Provable } from './dist/node/index.js';

console.log('🔍 BigInt Serialization Debug');
console.log('============================\n');

// Switch to Sparky backend
await switchBackend('sparky');
console.log('✅ Using Sparky backend\n');

// Test 1: Examine Field internal structure
console.log('📋 Test 1: Field Internal Structure');
console.log('-----------------------------------');
const field = Field(123);
console.log('Field(123) created');
console.log('field.value type:', typeof field.value);
console.log('field.value:', field.value);

// Try to understand the structure
if (Array.isArray(field.value)) {
  console.log('\nfield.value is an array with', field.value.length, 'elements:');
  field.value.forEach((elem, i) => {
    console.log(`  [${i}]: type=${typeof elem}, value=`, elem);
    if (Array.isArray(elem)) {
      console.log(`       (nested array with ${elem.length} elements)`);
      elem.forEach((nested, j) => {
        console.log(`       [${j}]: type=${typeof nested}, value=`, nested);
      });
    }
  });
}

// Test 2: Try to trace the compilation path
console.log('\n📋 Test 2: Compilation Path Test');
console.log('--------------------------------');

try {
  const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(Local);
  
  class MinimalContract extends SmartContract {
    @state(Field) x = State();
    
    @method
    update(newValue) {
      // Log what's happening inside the method
      console.log('\n🔍 Inside update method:');
      console.log('  newValue:', newValue);
      console.log('  newValue.value:', newValue.value);
      
      const current = this.x.getAndRequireEquals();
      console.log('  current:', current);
      console.log('  current.value:', current.value);
      
      this.x.set(newValue);
    }
  }
  
  console.log('Starting compilation...\n');
  
  // Add more detailed logging
  const originalLog = console.log;
  const originalError = console.error;
  let errorDetails = null;
  
  // Intercept console to capture more details
  console.error = function(...args) {
    errorDetails = args;
    originalError.apply(console, args);
  };
  
  try {
    await MinimalContract.compile();
    console.log('✅ Compilation succeeded!');
  } catch (error) {
    console.log('❌ Compilation failed');
    console.log('Error message:', error.message);
    
    // Check if this is the FieldVar format error
    if (error.message.includes('FieldVar format')) {
      console.log('\n🎯 This is the FieldVar format error!');
      console.log('Full error:', error);
    }
  }
  
  // Restore console
  console.log = originalLog;
  console.error = originalError;
  
} catch (error) {
  console.error('Setup error:', error.message);
}

// Test 3: Direct investigation of Field constant creation
console.log('\n📋 Test 3: Field Constant Creation Path');
console.log('---------------------------------------');

// Let's trace what happens when we create a Field constant
const testField = Field(42);
console.log('Created Field(42)');

// Check if Field has a toConstant method or similar
console.log('\nField instance methods:');
const fieldMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(testField))
  .filter(name => typeof testField[name] === 'function');
console.log(fieldMethods.slice(0, 10), '...');

// Test 4: Check how constants are supposed to be formatted
console.log('\n📋 Test 4: Expected FieldVar Format');
console.log('-----------------------------------');
console.log('According to the Rust parser, constants should be:');
console.log('  [0, [0, "value"]]');
console.log('  where "value" is a decimal string');
console.log('\nBut we might be sending something different...');

// Try to manually create the expected format
const manualFieldVar = [0, [0, "42"]];
console.log('\nManually created FieldVar:', JSON.stringify(manualFieldVar));

// Test 5: Check if there's a conversion function we're missing
console.log('\n📋 Test 5: Conversion Functions');
console.log('-------------------------------');
if (globalThis.sparkyConstraintBridge) {
  console.log('sparkyConstraintBridge available');
  
  // Check if there's a test function
  if (globalThis.sparkyConstraintBridge.testFieldVarConstant) {
    console.log('\nTesting testFieldVarConstant with different formats:');
    
    try {
      // Test the expected format
      const result1 = globalThis.sparkyConstraintBridge.testFieldVarConstant([0, [0, "42"]]);
      console.log('✅ Format [0, [0, "42"]] worked:', result1);
    } catch (e) {
      console.log('❌ Format [0, [0, "42"]] failed:', e.message);
    }
    
    try {
      // Test what Field might be producing
      const result2 = globalThis.sparkyConstraintBridge.testFieldVarConstant([0, 0, "42", "extra"]);
      console.log('✅ Format [0, 0, "42", "extra"] worked:', result2);
    } catch (e) {
      console.log('❌ Format [0, 0, "42", "extra"] failed:', e.message);
    }
  }
}