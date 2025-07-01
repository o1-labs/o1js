#!/usr/bin/env node
/**
 * Debug Sparky Mode
 * Check what mode Sparky is in when assertions are called
 */

import { Field, switchBackend } from './dist/node/index.js';

async function debugSparkyMode() {
  console.log('=== SPARKY MODE DEBUG ===\n');
  
  await switchBackend('sparky');
  
  // Let's try to inspect the Sparky adapter's behavior more directly
  // We'll monkey-patch the adapter to log mode information
  
  // Check if we can access Sparky directly via global bridge
  if (globalThis.sparkyConstraintBridge) {
    console.log('Bridge available. Testing direct access...\n');
    
    const bridge = globalThis.sparkyConstraintBridge;
    
    // Start constraint accumulation 
    bridge.startConstraintAccumulation();
    
    // Now let's create a test that should generate constraints and see what happens
    console.log('=== CREATING FIELD VARIABLES ===');
    
    // This should trigger Sparky field creation
    const a = Field(5);
    console.log('Created Field(5)');
    
    const b = Field(7);
    console.log('Created Field(7)');
    
    // Check constraints so far
    let constraints = bridge.getAccumulatedConstraints();
    console.log('Constraints after field creation:', constraints.length);
    
    // Now do an operation that MUST create constraints
    console.log('\n=== PERFORMING ASSERTION ===');
    
    try {
      // This should create constraints in Sparky
      a.assertEquals(b);
      console.log('ERROR: This should have thrown but did not!');
    } catch (error) {
      console.log('Expected error (5 != 7):', error.message);
    }
    
    // Check constraints after assertion
    constraints = bridge.getAccumulatedConstraints();
    console.log('Constraints after assertEquals:', constraints.length);
    
    if (constraints.length === 0) {
      console.log('\n🚨 CRITICAL: No constraints generated even though assertEquals was called!');
      console.log('This means either:');
      console.log('1. Sparky is not in the right mode');
      console.log('2. Field.assertEquals is not calling the Sparky backend');
      console.log('3. The assertion is calling Sparky but constraints are not being recorded');
    }
    
    bridge.endConstraintAccumulation();
  }
  
  // Let's also try to force Sparky into constraint mode if possible
  console.log('\n=== FORCING CONSTRAINT MODE ===');
  
  try {
    // Try to access Sparky instance directly and set mode
    console.log('Attempting to access Sparky WASM directly...');
    
    // We need to find a way to get the Sparky instance
    // Let's see if we can find it in the Field implementation
    
    // Let me try a different approach - let's trace Field.assertEquals
    const originalAssertEquals = Field.prototype.assertEquals;
    
    Field.prototype.assertEquals = function(other) {
      console.log('[TRACE] Field.assertEquals called with:', this.toString(), '==', other.toString());
      
      // Check if this calls into Sparky adapter
      try {
        return originalAssertEquals.call(this, other);
      } catch (error) {
        console.log('[TRACE] assertEquals threw:', error.message);
        throw error;
      }
    };
    
    console.log('Monkey-patched Field.assertEquals. Testing...');
    
    const x = Field(10);
    const y = Field(20);
    
    try {
      x.assertEquals(y);
    } catch (error) {
      console.log('Assertion failed as expected:', error.message);
    }
    
    // Check constraints one more time
    if (globalThis.sparkyConstraintBridge) {
      const constraints = globalThis.sparkyConstraintBridge.getAccumulatedConstraints();
      console.log('Final constraint count:', constraints.length);
    }
    
  } catch (error) {
    console.error('Error in direct mode test:', error);
  }
}

debugSparkyMode().catch(console.error);