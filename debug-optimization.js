#!/usr/bin/env node

// Debug the exact optimization pass that's removing the essential constraint
import { switchBackend, getCurrentBackend, Field } from './dist/node/index.js';

console.log('🔍 DEBUGGING OPTIMIZATION PIPELINE');
console.log('==================================');

try {
  // Switch to Sparky and set debug mode
  await switchBackend('sparky');
  console.log(`Current backend: ${getCurrentBackend()}`);

  // Trigger Sparky initialization by creating a field operation
  console.log('🔧 Initializing Sparky instance...');
  const initField = Field(1);
  initField.assertEquals(initField); // This will trigger initialization
  
  // Get access to the WASM instance
  const sparkyModule = globalThis.__sparkyInstance;
  if (!sparkyModule) {
    throw new Error('Sparky instance not found after initialization');
  }
  console.log('✅ Sparky instance found');

  console.log('🔧 Setting optimization mode to DEBUG to see what happens...');
  sparkyModule.set_optimization_mode('debug');
  console.log('✅ Optimization mode set to DEBUG (no optimizations)');

  // Reset constraint system
  sparkyModule.field.reset();

  // Create the same constraint that was being eliminated
  console.log('📋 Creating essential constraint: input.assertEquals(Field(42))');
  
  const input = Field(5); // This will become variable 1
  const target = Field(42); // This will become variable 0 (constant)
  
  // This should create constraint: 1*v1 + (-1)*v0 = 0
  input.assertEquals(target);
  
  console.log('✅ Constraint created');

  // Get constraint count with no optimization
  const constraintCount = sparkyModule.field.rows();
  console.log(`📊 Constraint count with DEBUG mode (no optimization): ${constraintCount}`);
  
  // Now test with aggressive optimization
  console.log('\n🔧 Testing with AGGRESSIVE optimization...');
  sparkyModule.field.reset();
  sparkyModule.set_optimization_mode('aggressive');
  
  const input2 = Field(5);
  const target2 = Field(42);
  input2.assertEquals(target2);
  
  const aggressiveCount = sparkyModule.field.rows();
  console.log(`📊 Constraint count with AGGRESSIVE mode: ${aggressiveCount}`);
  
  if (aggressiveCount === 0) {
    console.log('❌ BUG CONFIRMED: Aggressive optimization removes essential constraint!');
  } else {
    console.log('✅ Constraint preserved with aggressive optimization');
  }

} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('Stack:', error.stack);
}