#!/usr/bin/env node
/**
 * Debug if Sparky field operations are being called
 */

import { Field, switchBackend } from './dist/node/index.js';

async function debugSparkyField() {
  console.log('=== SPARKY FIELD DEBUG ===\n');
  
  await switchBackend('sparky');
  
  // Monkey patch the Sparky adapter to see if field operations are being called
  const { Snarky } = await import('./src/bindings.js');
  
  if (Snarky && Snarky.field) {
    console.log('Found Snarky.field. Monkey patching...');
    
    const originalAssertEqual = Snarky.field.assertEqual;
    
    Snarky.field.assertEqual = function(x, y) {
      console.log('[SPARKY TRACE] Snarky.field.assertEqual called with:', x, y);
      console.log('[SPARKY TRACE] Argument types:', typeof x, typeof y);
      console.log('[SPARKY TRACE] Arguments are arrays:', Array.isArray(x), Array.isArray(y));
      
      try {
        const result = originalAssertEqual.call(this, x, y);
        console.log('[SPARKY TRACE] assertEqual completed successfully');
        return result;
      } catch (error) {
        console.log('[SPARKY TRACE] assertEqual threw error:', error.message);
        throw error;
      }
    };
    
    console.log('Monkey patch applied. Testing Field operations...\n');
    
    // Test field operations
    console.log('=== FIELD OPERATIONS TEST ===');
    
    const a = Field(42);
    const b = Field(42);
    
    console.log('Created Field(42) x 2');
    
    // This should call our monkey-patched function
    try {
      a.assertEquals(b);
      console.log('a.assertEquals(b) completed - fields are equal');
    } catch (error) {
      console.log('a.assertEquals(b) threw:', error.message);
    }
    
    // Test with different values that should throw
    const c = Field(100);
    const d = Field(200);
    
    try {
      c.assertEquals(d);
      console.log('ERROR: c.assertEquals(d) should have thrown!');
    } catch (error) {
      console.log('c.assertEquals(d) threw as expected:', error.message);
    }
    
    // Check if constraints were generated
    if (globalThis.sparkyConstraintBridge) {
      console.log('\n=== CONSTRAINT CHECK ===');
      const bridge = globalThis.sparkyConstraintBridge;
      bridge.startConstraintAccumulation();
      
      try {
        // Do another assertion in compilation mode
        const e = Field(500);
        const f = Field(600);
        e.assertEquals(f);
      } catch (error) {
        console.log('Expected error in compilation mode');
      }
      
      const constraints = bridge.getAccumulatedConstraints();
      console.log('Constraints after operations:', constraints.length);
      
      bridge.endConstraintAccumulation();
    }
    
  } else {
    console.log('Could not find Snarky.field to monkey patch');
    console.log('Available Snarky properties:', Object.keys(Snarky || {}));
  }
}

debugSparkyField().catch(console.error);