#!/usr/bin/env node

/**
 * Test semantic Boolean AND constraint implementation
 * 
 * Created: July 5, 2025, 1:50 AM UTC
 * Last Modified: July 5, 2025, 1:50 AM UTC
 */

import { switchBackend, getCurrentBackend, Bool, Field, Provable } from './dist/node/index.js';

async function testSemanticBooleanAnd() {
  console.log('🎯 Testing Semantic Boolean AND Implementation\n');
  
  // Switch to Sparky backend
  switchBackend('sparky');
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  // Test if emitBooleanAnd is available
  console.log('\n🔍 Checking if emitBooleanAnd is available in Sparky instance...');
  
  // Access the Sparky instance to check for emitBooleanAnd
  const sparkyInstance = globalThis.__sparkyInstance;
  if (sparkyInstance) {
    console.log('✅ Sparky instance found');
    if (sparkyInstance.field) {
      console.log('✅ Field module found');
      if (sparkyInstance.field.emitBooleanAnd) {
        console.log('✅ emitBooleanAnd function found in field module');
      } else {
        console.log('❌ emitBooleanAnd function NOT found in field module');
        console.log('Available field methods:');
        console.log(Object.getOwnPropertyNames(sparkyInstance.field));
      }
    } else {
      console.log('❌ Field module NOT found');
    }
  } else {
    console.log('❌ Sparky instance NOT found');
  }
  
  // Test constraint bridge
  console.log('\n🔍 Checking constraint bridge...');
  if (globalThis.sparkyConstraintBridge) {
    console.log('✅ Constraint bridge found');
    if (globalThis.sparkyConstraintBridge.emitBooleanAnd) {
      console.log('✅ emitBooleanAnd function found in constraint bridge');
    } else {
      console.log('❌ emitBooleanAnd function NOT found in constraint bridge');
    }
  } else {
    console.log('❌ Constraint bridge NOT found');
  }
  
  // Test simple Boolean AND to see what happens
  console.log('\n📊 Testing simple Boolean AND...');
  
  const cs = await Provable.constraintSystem(() => {
    const a = Provable.witness(Bool, () => Bool(true));
    const b = Provable.witness(Bool, () => Bool(false));
    console.log('Creating a.and(b)...');
    const result = a.and(b);
    console.log('Boolean AND completed');
    return result;
  });
  
  console.log(`Result: ${cs.rows} constraints`);
  
  // Try to call emitBooleanAnd directly if available
  console.log('\n🧪 Attempting direct call to emitBooleanAnd...');
  try {
    if (globalThis.sparkyConstraintBridge?.emitBooleanAnd) {
      // Create simple field variables for testing
      const a = [1, 0]; // Variable 0
      const b = [1, 1]; // Variable 1
      
      const result = globalThis.sparkyConstraintBridge.emitBooleanAnd(a, b);
      console.log('✅ Direct emitBooleanAnd call succeeded:', result);
    } else {
      console.log('❌ emitBooleanAnd not available for direct call');
    }
  } catch (error) {
    console.log('❌ Direct emitBooleanAnd call failed:', error.message);
  }
}

testSemanticBooleanAnd().catch(console.error);