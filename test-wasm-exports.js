#!/usr/bin/env node

/**
 * Test WASM exports to check if emitBooleanAnd is available
 * 
 * Created: July 5, 2025, 1:55 AM UTC
 * Last Modified: July 5, 2025, 1:55 AM UTC
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testWasmExports() {
  console.log('🔍 Testing WASM exports for emitBooleanAnd\n');
  
  // Switch to Sparky backend to trigger loading
  switchBackend('sparky');
  
  // Wait for loading to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  // Check globalThis for sparky instance
  console.log('\n📋 Checking global Sparky instance...');
  
  if (globalThis.__sparkyInstance) {
    const sparkyInstance = globalThis.__sparkyInstance;
    console.log('✅ Found __sparkyInstance');
    
    if (sparkyInstance.field) {
      console.log('✅ Found field module');
      
      // List all methods on field module
      console.log('\n📋 Available field methods:');
      const fieldMethods = Object.getOwnPropertyNames(sparkyInstance.field);
      fieldMethods.forEach(method => {
        console.log(`  - ${method}`);
      });
      
      // Check specifically for emitBooleanAnd
      if (sparkyInstance.field.emitBooleanAnd) {
        console.log('\n✅ emitBooleanAnd found in field module');
        console.log('Type:', typeof sparkyInstance.field.emitBooleanAnd);
      } else {
        console.log('\n❌ emitBooleanAnd NOT found in field module');
      }
      
      // Check for emitIfConstraint for comparison
      if (sparkyInstance.field.emitIfConstraint) {
        console.log('✅ emitIfConstraint found in field module (for comparison)');
        console.log('Type:', typeof sparkyInstance.field.emitIfConstraint);
      } else {
        console.log('❌ emitIfConstraint NOT found in field module');
      }
      
    } else {
      console.log('❌ Field module not found');
    }
  } else {
    console.log('❌ __sparkyInstance not found');
  }
  
  // Check if sparky constraint bridge exists
  console.log('\n📋 Checking constraint bridge...');
  if (globalThis.sparkyConstraintBridge) {
    console.log('✅ sparkyConstraintBridge found');
    
    const bridgeMethods = Object.getOwnPropertyNames(globalThis.sparkyConstraintBridge);
    console.log('\n📋 Available bridge methods:');
    bridgeMethods.forEach(method => {
      console.log(`  - ${method}`);
    });
    
    if (globalThis.sparkyConstraintBridge.emitBooleanAnd) {
      console.log('\n✅ emitBooleanAnd found in constraint bridge');
    } else {
      console.log('\n❌ emitBooleanAnd NOT found in constraint bridge');
    }
    
  } else {
    console.log('❌ sparkyConstraintBridge not found');
  }
}

testWasmExports().catch(console.error);