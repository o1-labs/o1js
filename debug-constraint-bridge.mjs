#!/usr/bin/env node
/**
 * Debug the Constraint Bridge
 * Find out exactly where the constraint bridge is failing
 */

import { Field, switchBackend } from './dist/node/index.js';

async function debugConstraintBridge() {
  console.log('=== CONSTRAINT BRIDGE DEBUG ===\n');
  
  await switchBackend('sparky');
  
  // Check if the global bridge exists
  console.log('Global sparkyConstraintBridge exists:', !!globalThis.sparkyConstraintBridge);
  if (globalThis.sparkyConstraintBridge) {
    console.log('Bridge methods:', Object.keys(globalThis.sparkyConstraintBridge));
    
    // Test the bridge directly
    console.log('\n=== TESTING BRIDGE FUNCTIONS ===');
    
    const bridge = globalThis.sparkyConstraintBridge;
    
    console.log('isActiveSparkyBackend():', bridge.isActiveSparkyBackend());
    
    console.log('Starting constraint accumulation...');
    bridge.startConstraintAccumulation();
    
    console.log('Initial constraints:', bridge.getAccumulatedConstraints());
    
    // Now try to create a Field operation that should generate constraints
    console.log('\n=== FIELD OPERATION TEST ===');
    
    try {
      const a = Field(5);
      const b = Field(7);
      
      console.log('Field objects created, checking constraints...');
      console.log('Constraints after Field creation:', bridge.getAccumulatedConstraints());
      
      // Call assertEquals - this SHOULD generate constraints
      console.log('Calling a.assertEquals(b)...');
      a.assertEquals(b);
      
      console.log('Constraints after assertEquals:', bridge.getAccumulatedConstraints());
      
      // Try direct field operations
      console.log('\nTrying direct field operations...');
      const c = a.add(b);
      console.log('Constraints after a.add(b):', bridge.getAccumulatedConstraints());
      
      const d = a.mul(b);
      console.log('Constraints after a.mul(b):', bridge.getAccumulatedConstraints());
      
    } catch (error) {
      console.error('Error in field operations:', error);
    }
    
    bridge.endConstraintAccumulation();
  }
  
  // Let's also check if we can access the Sparky instance state directly
  console.log('\n=== SPARKY STATE INSPECTION ===');
  
  try {
    // Import the adapter to check internal state
    const { sparkyInstance } = await import('./src/bindings/sparky-adapter.js');
    
    if (sparkyInstance) {
      console.log('Sparky instance found');
      console.log('Instance properties:', Object.getOwnPropertyNames(sparkyInstance).slice(0, 10));
      
      if (sparkyInstance.constraintSystemToJson) {
        const constraints = sparkyInstance.constraintSystemToJson();
        console.log('Direct constraint system query:', constraints);
      }
      
      if (sparkyInstance.constraintSystemRows) {
        const rows = sparkyInstance.constraintSystemRows();
        console.log('Direct constraint rows query:', rows);
      }
    } else {
      console.log('No Sparky instance found');
    }
    
  } catch (error) {
    console.log('Could not access Sparky adapter:', error.message);
  }
  
  // Test if o1js operations are actually calling Sparky
  console.log('\n=== O1JS OPERATION TRACING ===');
  
  // Monkey patch the bridge to see if it's being called
  if (globalThis.sparkyConstraintBridge) {
    const originalStart = globalThis.sparkyConstraintBridge.startConstraintAccumulation;
    const originalGet = globalThis.sparkyConstraintBridge.getAccumulatedConstraints;
    const originalEnd = globalThis.sparkyConstraintBridge.endConstraintAccumulation;
    
    let callCount = 0;
    
    globalThis.sparkyConstraintBridge.startConstraintAccumulation = function() {
      console.log('[TRACE] startConstraintAccumulation called');
      callCount++;
      return originalStart.call(this);
    };
    
    globalThis.sparkyConstraintBridge.getAccumulatedConstraints = function() {
      console.log('[TRACE] getAccumulatedConstraints called');
      const result = originalGet.call(this);
      console.log('[TRACE] Returning', Array.isArray(result) ? result.length : 'non-array', 'constraints');
      return result;
    };
    
    globalThis.sparkyConstraintBridge.endConstraintAccumulation = function() {
      console.log('[TRACE] endConstraintAccumulation called');
      return originalEnd.call(this);
    };
    
    // Now perform an operation that should trigger VK compilation
    console.log('Performing a ZkProgram compilation to trace bridge calls...');
    
    const { ZkProgram } = await import('./dist/node/index.js');
    
    const testProgram = ZkProgram({
      name: 'TraceTest',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [Field],
          async method(pub, x) {
            x.assertEquals(pub);
          }
        }
      }
    });
    
    console.log('Starting compilation...');
    const result = await testProgram.compile();
    console.log('Compilation complete. Bridge was called', callCount, 'times');
    console.log('VK hash:', result.verificationKey.hash.toString());
  }
}

debugConstraintBridge().catch(console.error);