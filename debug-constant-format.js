#!/usr/bin/env node

/**
 * Debug the specific constant FieldVar format issue
 */

import { switchBackend, getCurrentBackend, initializeBindings } from './src/bindings.js';

console.log('🔧 Starting constant format debug...');

// Initialize bindings first
console.log('🔧 Initializing bindings...');
await initializeBindings();

// Switch to sparky backend
console.log('\n🔧 Switching to Sparky backend...');
try {
  await switchBackend('sparky');
  console.log('✅ Backend switched to:', getCurrentBackend());
  
  console.log('\n🔧 Testing simple constant creation...');
  const { Field, Provable } = await import('./src/index.js');
  
  // Test creating simple constants
  console.log('Creating Field(0)...');
  const zero = Field(0);
  console.log('✅ Field(0) created:', zero.toString());
  
  console.log('Creating Field(100)...');
  const hundred = Field(100);
  console.log('✅ Field(100) created:', hundred.toString());
  
  console.log('\n🔧 Testing simple constraint...');
  try {
    Provable.runAndCheck(() => {
      zero.assertEquals(Field(0));
      console.log('✅ Simple assertEquals(0, 0) works');
    });
  } catch (error) {
    console.error('❌ Simple assertEquals failed:', error.message);
  }
  
  console.log('\n🔧 Testing constant arithmetic...');
  try {
    Provable.runAndCheck(() => {
      const result = Field(7).add(Field(3));
      result.assertEquals(Field(10));
      console.log('✅ Constant arithmetic (7 + 3 = 10) works');
    });
  } catch (error) {
    console.error('❌ Constant arithmetic failed:', error.message);
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Error stack:', error.stack);
}