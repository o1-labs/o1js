#!/usr/bin/env node

// Test to check what type of error object is being thrown from WASM

import { switchBackend } from './dist/node/index.js';
import { getSparkyInstance } from './dist/node/bindings/sparky-adapter/module-loader.js';

async function testErrorObjectType() {
  console.log('Testing error object type from WASM...');
  
  await switchBackend('sparky');
  
  const originalTakeObject = globalThis.takeObject;
  let capturedError = null;
  
  // Override takeObject to capture the error
  globalThis.takeObject = function(idx) {
    const obj = heap[idx];
    console.log('\n=== takeObject called ===');
    console.log('Index:', idx);
    console.log('Object type:', typeof obj);
    console.log('Object constructor:', obj?.constructor?.name);
    console.log('Is Error?', obj instanceof Error);
    console.log('Object:', obj);
    if (obj instanceof Error) {
      console.log('Error message:', obj.message);
      console.log('Error stack:', obj.stack);
    }
    capturedError = obj;
    
    // Call original function
    if (originalTakeObject) {
      return originalTakeObject(idx);
    }
    const ret = heap[idx];
    heap[idx] = heap_next;
    heap_next = idx;
    return ret;
  };
  
  try {
    const sparky = getSparkyInstance();
    const gates = sparky.gates;
    
    // Try to call rangeCheck0 with invalid limbs arrays
    const x = [1, 1]; // FieldVar for variable 1
    const xLimbs12 = []; // This should have 6 elements
    const xLimbs2 = []; // This should have 8 elements
    const isCompact = false;
    
    console.log('\nCalling rangeCheck0 with invalid limbs arrays...');
    gates.rangeCheck0(x, xLimbs12, xLimbs2, isCompact);
    
    console.log('Range check succeeded (unexpected)');
  } catch (error) {
    console.log('\n=== Caught error ===');
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    console.error('Is Error?', error instanceof Error);
    console.error('Error:', error);
    
    if (error instanceof Error) {
      console.error('\nError message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    console.log('\n=== Captured error from takeObject ===');
    console.log('Type:', typeof capturedError);
    console.log('Constructor:', capturedError?.constructor?.name);
    console.log('Value:', capturedError);
  } finally {
    // Restore original function
    if (originalTakeObject) {
      globalThis.takeObject = originalTakeObject;
    }
  }
}

// Check if heap is available
if (typeof heap !== 'undefined') {
  console.log('heap is available, length:', heap.length);
} else {
  console.log('heap is not available globally');
}

testErrorObjectType().catch(console.error);