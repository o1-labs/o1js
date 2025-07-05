#!/usr/bin/env node

/**
 * Direct WASM call debugging
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('🔍 Direct WASM Debug');
console.log('====================\n');

// Switch to Sparky backend
await switchBackend('sparky');
console.log('✅ Using Sparky backend:', getCurrentBackend());

// Get the sparky instance directly
const sparky = globalThis.__sparky;
const bridge = globalThis.sparkyConstraintBridge;

if (!sparky || !sparky.field) {
  console.error('❌ Sparky not available');
  process.exit(1);
}

console.log('\n📋 Testing direct WASM calls with BigInt');
console.log('-----------------------------------------');

// Test 1: Create a constant with string (this should work)
console.log('\nTest 1: constant("123")');
try {
  const result1 = sparky.field.constant("123");
  console.log('✅ Success:', result1);
} catch (e) {
  console.log('❌ Error:', e.message);
}

// Test 2: Try to pass a FieldVar with BigInt
console.log('\nTest 2: Pass FieldVar with BigInt to assertEqual');
try {
  // Create FieldVar arrays that contain BigInt
  const fieldVar1 = [0, [0, 123n]];  // This is what Field(123).value looks like
  const fieldVar2 = [0, [0, 456n]];  // This is what Field(456).value looks like
  
  console.log('fieldVar1:', fieldVar1);
  console.log('fieldVar2:', fieldVar2);
  
  // This should fail with the FieldVar format error
  sparky.field.assertEqual(fieldVar1, fieldVar2);
  console.log('✅ Success (unexpected!)');
} catch (e) {
  console.log('❌ Error:', e.message);
  if (e.message.includes('FieldVar format')) {
    console.log('🎯 FOUND IT! This is the FieldVar format error');
  }
}

// Test 3: Test with pre-stringified BigInt
console.log('\nTest 3: Pass FieldVar with stringified BigInt');
try {
  // Convert BigInt to string
  const fieldVar1 = [0, [0, "123"]];
  const fieldVar2 = [0, [0, "456"]];
  
  console.log('fieldVar1:', fieldVar1);
  console.log('fieldVar2:', fieldVar2);
  
  sparky.field.assertEqual(fieldVar1, fieldVar2);
  console.log('✅ Success');
} catch (e) {
  console.log('❌ Error:', e.message);
}

// Test 4: Intercept WASM module to see exact data
console.log('\n📋 Intercepting WASM module calls');
console.log('----------------------------------');

// Check the actual sparky wasm module
console.log('\nSparky field methods:', Object.keys(sparky.field));

// Get reference to the wasm module if available
const wasmModule = globalThis.sparkyWasmModule || sparky.__wasm_module;
if (wasmModule) {
  console.log('\n✅ WASM module available');
  console.log('WASM exports:', Object.keys(wasmModule));
} else {
  console.log('\n❌ WASM module not directly accessible');
}

// Test 5: Try different FieldVar formats
console.log('\n📋 Testing various FieldVar formats');
console.log('------------------------------------');

const testFormats = [
  { name: 'Correct format with string', value: [0, [0, "123"]] },
  { name: 'With BigInt (will fail)', value: [0, [0, 123n]] },
  { name: 'Wrong nesting 1', value: [0, 0, "123"] },
  { name: 'Wrong nesting 2', value: [0, "123"] },
  { name: 'Extra argument', value: [0, 0, "123", "extra"] },
];

for (const test of testFormats) {
  console.log(`\nTesting: ${test.name}`);
  console.log('Value:', test.value);
  
  try {
    // Try to use it as a constant
    const cvar = sparky.field.constant(test.value);
    console.log('✅ constant() succeeded:', cvar);
  } catch (e) {
    console.log('❌ constant() failed:', e.message);
    if (e.message.includes('got 4 arguments')) {
      console.log('🎯 This is the 4-argument error!');
    }
  }
}

// Test 6: Check if the issue is in the constraint accumulation phase
console.log('\n📋 Testing constraint accumulation');
console.log('-----------------------------------');

if (bridge && bridge.startConstraintAccumulation) {
  try {
    console.log('Starting constraint accumulation...');
    bridge.startConstraintAccumulation();
    
    // Now try operations with BigInt
    console.log('Creating field vars with BigInt...');
    const fieldVar1 = [0, [0, 123n]];
    const fieldVar2 = [0, [0, 456n]];
    
    console.log('Calling assertEqual with BigInt FieldVars...');
    sparky.field.assertEqual(fieldVar1, fieldVar2);
    
    console.log('✅ No error during constraint accumulation');
  } catch (e) {
    console.log('❌ Error during constraint accumulation:', e.message);
    if (e.message.includes('FieldVar format')) {
      console.log('🎯 Error occurs during constraint accumulation!');
    }
  } finally {
    try {
      bridge.endConstraintAccumulation();
    } catch (e) {
      console.log('Error ending constraint accumulation:', e.message);
    }
  }
}