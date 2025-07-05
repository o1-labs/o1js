#!/usr/bin/env node

/**
 * Debug script to understand the rangeCheck0 routing issue
 */

import { switchBackend, getCurrentBackend, initializeBindings } from './src/bindings.js';
import { Snarky } from './src/bindings.js';

console.log('🔧 Starting routing debug...');

// Initialize bindings first
console.log('🔧 Initializing bindings...');
await initializeBindings();

// Test initial backend
console.log('Initial backend:', getCurrentBackend());
console.log('Initial Snarky.gates:', typeof Snarky.gates);
if (Snarky.gates) {
  console.log('Initial Snarky.gates.rangeCheck0:', typeof Snarky.gates.rangeCheck0);
}

// Test routing with sparky backend
console.log('\n🔧 Switching to Sparky backend...');
try {
  await switchBackend('sparky');
  console.log('✅ Backend switched to:', getCurrentBackend());
  
  // Test the routing
  console.log('\n🔧 Testing routing after Sparky switch...');
  console.log('Snarky object:', typeof Snarky);
  console.log('Snarky.gates:', typeof Snarky.gates);
  console.log('Snarky.gates.rangeCheck0:', typeof Snarky.gates.rangeCheck0);
  
  // Check global routing state
  console.log('\n🔧 Checking global routing state...');
  console.log('globalThis.__snarky:', !!globalThis.__snarky);
  console.log('globalThis.__snarky.Snarky:', !!globalThis.__snarky?.Snarky);
  console.log('globalThis.__snarky.Snarky.gates:', !!globalThis.__snarky?.Snarky?.gates);
  console.log('globalThis.__snarky.Snarky.gates.rangeCheck0:', !!globalThis.__snarky?.Snarky?.gates?.rangeCheck0);
  
  // Check sparky specific state
  console.log('\n🔧 Checking Sparky state...');
  console.log('globalThis.__currentBackend:', globalThis.__currentBackend);
  console.log('globalThis.__sparkyActive:', globalThis.__sparkyActive);
  
  // Test a simple call to rangeCheck0
  console.log('\n🔧 Testing rangeCheck0 call...');
  try {
    // This should trigger the same error we're seeing
    const { Field } = await import('./src/index.js');
    const testField = Field(100);
    console.log('Created test field:', testField.toString());
    
    // Create proper field limbs (like in range-check.ts)
    const limb12 = [
      Field(0).value, Field(0).value, Field(0).value, 
      Field(0).value, Field(0).value, Field(0).value
    ];
    const limb2 = [
      Field(0).value, Field(0).value, Field(0).value, Field(0).value,
      Field(0).value, Field(0).value, Field(0).value, Field(0).value
    ];
    
    // Try to call rangeCheck0 directly
    console.log('Calling Snarky.gates.rangeCheck0 directly...');
    console.log('Parameters:');
    console.log('  - x (testField.value):', testField.value);
    console.log('  - xLimbs12 (6 FieldVar elements):', limb12);
    console.log('  - xLimbs2 (8 FieldVar elements):', limb2);
    console.log('  - isCompact:', false);
    
    const result = Snarky.gates.rangeCheck0(
      testField.value,
      limb12,
      limb2,
      false
    );
    console.log('rangeCheck0 result:', result);
  } catch (error) {
    console.error('❌ rangeCheck0 call failed:', error.message);
    console.error('Error stack:', error.stack);
  }
  
} catch (error) {
  console.error('❌ Backend switch failed:', error.message);
}