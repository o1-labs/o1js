#!/usr/bin/env node
/**
 * Debug Sparky Constraint Accumulation
 * Test if Sparky WASM is actually creating constraints
 */

import { Field, switchBackend } from './dist/node/index.js';

async function debugSparkyConstraints() {
  console.log('=== SPARKY CONSTRAINT ACCUMULATION DEBUG ===\n');
  
  await switchBackend('sparky');
  
  // Access Sparky instance directly
  const { sparkyInstance } = await import('./src/bindings/sparky-adapter.js');
  console.log('Sparky instance available:', !!sparkyInstance);
  
  if (!sparkyInstance) {
    console.log('❌ No Sparky instance available');
    return;
  }
  
  console.log('Available methods:', Object.getOwnPropertyNames(sparkyInstance));
  
  // Check initial state
  if (sparkyInstance.constraintSystemToJson) {
    const initial = sparkyInstance.constraintSystemToJson();
    console.log('\nInitial constraint system:', initial);
  }
  
  if (sparkyInstance.constraintSystemRows) {
    const initialRows = sparkyInstance.constraintSystemRows();
    console.log('Initial rows:', initialRows);
  }
  
  // Try to directly call Sparky field operations
  console.log('\n=== DIRECT SPARKY FIELD OPERATIONS ===');
  
  try {
    // Create some field elements
    const fieldModule = sparkyInstance.field;
    console.log('Field module available:', !!fieldModule);
    
    if (fieldModule) {
      console.log('Field module methods:', Object.getOwnPropertyNames(fieldModule));
      
      // Try to create constants
      const x = fieldModule.constant('2');
      const y = fieldModule.constant('3');
      console.log('Created constants x=2, y=3');
      
      // Try assertEqual
      console.log('Calling assertEqual(x, y)...');
      fieldModule.assertEqual(x, y);
      console.log('assertEqual call completed');
      
      // Check constraint system after
      if (sparkyInstance.constraintSystemToJson) {
        const after = sparkyInstance.constraintSystemToJson();
        console.log('Constraint system after assertEqual:', after);
      }
      
      if (sparkyInstance.constraintSystemRows) {
        const afterRows = sparkyInstance.constraintSystemRows();
        console.log('Rows after assertEqual:', afterRows);
      }
    }
    
  } catch (error) {
    console.error('Error in direct field operations:', error);
  }
  
  // Try through the o1js Field API
  console.log('\n=== O1JS FIELD API ===');
  
  try {
    const a = Field(5);
    const b = Field(7);
    console.log('Created o1js Fields a=5, b=7');
    
    // This should trigger Sparky constraint generation
    console.log('Calling a.assertEquals(b)...');
    a.assertEquals(b);
    console.log('assertEquals call completed');
    
    // Check constraint system 
    if (sparkyInstance.constraintSystemToJson) {
      const afterO1js = sparkyInstance.constraintSystemToJson();
      console.log('Constraint system after o1js assertEquals:', afterO1js);
    }
    
    if (sparkyInstance.constraintSystemRows) {
      const afterO1jsRows = sparkyInstance.constraintSystemRows();
      console.log('Rows after o1js assertEquals:', afterO1jsRows);
    }
    
  } catch (error) {
    console.error('Error in o1js field operations:', error);
  }
  
  // Test if runReset clears constraints
  console.log('\n=== RESET TEST ===');
  
  try {
    if (sparkyInstance.runReset) {
      console.log('Calling runReset()...');
      sparkyInstance.runReset();
      
      const afterReset = sparkyInstance.constraintSystemToJson();
      console.log('Constraint system after reset:', afterReset);
    } else {
      console.log('No runReset method available');
    }
  } catch (error) {
    console.error('Error in reset test:', error);
  }
}

debugSparkyConstraints().catch(console.error);