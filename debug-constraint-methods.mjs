#!/usr/bin/env node

// Debug which methods are available on the constraint system
import { initializeBindings, switchBackend } from './dist/node/index.js';

async function debugConstraintMethods() {
  await initializeBindings();
  await switchBackend('sparky');
  
  const { Snarky } = await import('./dist/node/bindings.js');
  const constraintSystem = Snarky.constraintSystem.constructor === Function 
    ? Snarky.constraintSystem({}) 
    : Snarky.constraintSystem;
    
  console.log('🔍 ConstraintSystem type:', typeof constraintSystem);
  console.log('🔍 ConstraintSystem properties:');
  
  for (const prop in constraintSystem) {
    console.log(`  - ${prop}: ${typeof constraintSystem[prop]}`);
  }
  
  console.log('🔍 ConstraintSystem prototype:');
  const proto = Object.getPrototypeOf(constraintSystem);
  for (const prop of Object.getOwnPropertyNames(proto)) {
    if (prop !== 'constructor') {
      console.log(`  - ${prop}: ${typeof proto[prop]}`);
    }
  }
}

debugConstraintMethods().catch(console.error);