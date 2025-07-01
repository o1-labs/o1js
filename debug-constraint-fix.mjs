#!/usr/bin/env node
/**
 * Test the constraint bridge fix
 */

import { Field, switchBackend } from './dist/node/index.js';

async function testConstraintFix() {
  console.log('=== CONSTRAINT BRIDGE FIX TEST ===\n');
  
  await switchBackend('sparky');
  
  if (globalThis.sparkyConstraintBridge) {
    console.log('Testing constraint bridge after fix...\n');
    
    const bridge = globalThis.sparkyConstraintBridge;
    
    // First, test without starting constraint accumulation
    console.log('=== TEST 1: Direct constraint query (no compilation mode) ===');
    let constraints = bridge.getAccumulatedConstraints();
    console.log('Constraints without compilation mode:', constraints.length);
    
    // Now test with constraint accumulation
    console.log('\n=== TEST 2: With constraint accumulation ===');
    bridge.startConstraintAccumulation();
    
    constraints = bridge.getAccumulatedConstraints();
    console.log('Constraints after starting accumulation:', constraints.length);
    
    // Test field operations
    console.log('\n=== TEST 3: Field operations ===');
    
    const a = Field(100);
    const b = Field(200);
    console.log('Created two fields');
    
    constraints = bridge.getAccumulatedConstraints();
    console.log('Constraints after field creation:', constraints.length);
    
    // Try an assertion (will throw but should generate constraints)
    try {
      a.assertEquals(b);
    } catch (error) {
      console.log('Assertion threw as expected');
    }
    
    constraints = bridge.getAccumulatedConstraints();
    console.log('Constraints after assertEquals:', constraints.length);
    
    // Check if we're getting the isCompilingCircuit debug message
    console.log('\nIf you see a debug message about isCompilingCircuit flag above, the fix is working');
    
    bridge.endConstraintAccumulation();
  } else {
    console.log('No constraint bridge available');
  }
}

testConstraintFix().catch(console.error);