#!/usr/bin/env node

/**
 * Debug using Field API directly to find where BigInt causes issues
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('🔍 Field API Debug');
console.log('==================\n');

// Add BigInt serialization support
BigInt.prototype.toJSON = function() { return this.toString(); };

// Switch to Sparky backend
await switchBackend('sparky');
console.log('✅ Using Sparky backend:', getCurrentBackend());

// Intercept console.error to catch any internal errors
const originalError = console.error;
console.error = function(...args) {
  console.log('\n🚨 CONSOLE.ERROR INTERCEPTED:');
  originalError.apply(console, args);
  
  // Check if it's our target error
  const errorStr = args.join(' ');
  if (errorStr.includes('FieldVar format') || errorStr.includes('4 arguments')) {
    console.log('🎯 FOUND THE ERROR!');
    console.trace('Stack trace:');
  }
};

console.log('\n📋 Test 1: Simple Field operations');
console.log('----------------------------------');

try {
  const a = Field(123);
  const b = Field(456);
  console.log('Created Field(123) and Field(456)');
  console.log('a.value:', a.value);
  console.log('b.value:', b.value);
  
  // This should trigger the error
  console.log('\nCalling a.assertEquals(b)...');
  a.assertEquals(b);
  console.log('✅ assertEquals succeeded (unexpected!)');
} catch (e) {
  console.log('❌ Error:', e.message);
  if (e.message.includes('FieldVar format') || e.message.includes('4 arguments')) {
    console.log('🎯 FOUND IT! This is where the error occurs');
    console.log('Full error:', e);
  }
}

console.log('\n📋 Test 2: Inside Provable.runAndCheck');
console.log('---------------------------------------');

try {
  Provable.runAndCheck(() => {
    console.log('Inside runAndCheck...');
    const x = Field(42);
    const y = Field(84);
    console.log('x.value:', x.value);
    console.log('y.value:', y.value);
    
    // Try operations
    console.log('\nTrying x.add(y)...');
    const sum = x.add(y);
    console.log('sum.value:', sum.value);
    
    console.log('\nTrying x.assertEquals(y)...');
    x.assertEquals(y);
  });
  console.log('✅ runAndCheck succeeded');
} catch (e) {
  console.log('❌ Error in runAndCheck:', e.message);
  if (e.message.includes('FieldVar format') || e.message.includes('4 arguments')) {
    console.log('🎯 Error occurs in runAndCheck!');
  }
}

console.log('\n📋 Test 3: Check sparkyConstraintBridge');
console.log('----------------------------------------');

const bridge = globalThis.sparkyConstraintBridge;
if (bridge) {
  console.log('✅ sparkyConstraintBridge available');
  console.log('Methods:', Object.keys(bridge));
  
  // Try to use it directly
  if (bridge.testFieldVarConstant) {
    console.log('\nTesting various formats with testFieldVarConstant:');
    
    // Test with BigInt
    try {
      const result = bridge.testFieldVarConstant([0, [0, 123n]]);
      console.log('✅ BigInt format worked:', result);
    } catch (e) {
      console.log('❌ BigInt format failed:', e.message);
    }
    
    // Test with string
    try {
      const result = bridge.testFieldVarConstant([0, [0, "123"]]);
      console.log('✅ String format worked:', result);
    } catch (e) {
      console.log('❌ String format failed:', e.message);
    }
  }
} else {
  console.log('❌ sparkyConstraintBridge not available');
}

// Restore console.error
console.error = originalError;

console.log('\n📋 Test 4: Direct field module access');
console.log('-------------------------------------');

// Try to access through the module system
try {
  // Import the sparky adapter module directly
  const sparkyAdapter = await import('./dist/node/bindings/sparky-adapter/index.js');
  console.log('✅ Sparky adapter imported');
  console.log('Exports:', Object.keys(sparkyAdapter));
  
  // Check if we can get the instance
  if (sparkyAdapter.getSparkyInstance) {
    const instance = sparkyAdapter.getSparkyInstance();
    console.log('✅ Got sparky instance');
    console.log('Instance methods:', Object.keys(instance));
  }
} catch (e) {
  console.log('❌ Could not import sparky adapter:', e.message);
}