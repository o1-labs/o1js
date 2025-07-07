import { Field, switchBackend } from './dist/node/index.js';

async function debugConstraintGeneration() {
  console.log('Debug constraint generation with public inputs\n');
  
  await switchBackend('sparky');
  
  // Get backend through global routing
  const backend = globalThis.__snarky?.Snarky;
  if (!backend) {
    console.error('Backend not available through global routing');
    return;
  }
  
  console.log('Backend available:', Object.keys(backend));
  
  // Reset state
  console.log('\n1. Resetting compiler state...');
  backend.run.reset();
  
  // Enter constraint system mode
  console.log('\n2. Entering constraint system mode...');
  const exitConstraintMode = backend.run.enterConstraintSystem();
  
  // Check initial constraint count
  const cs1 = backend.run.getConstraintSystem();
  console.log('Initial constraints:', backend.constraintSystem.rows(cs1));
  
  // Create public input variable
  console.log('\n3. Creating public input variable...');
  const publicInput = backend.field.exists(null);
  console.log('Public input variable:', publicInput);
  
  // Check constraint count after creating public input
  const cs2 = backend.run.getConstraintSystem();
  console.log('Constraints after public input:', backend.constraintSystem.rows(cs2));
  
  // Create a simple constraint: publicInput + 1
  console.log('\n4. Creating addition constraint...');
  const one = backend.field.constant(1);
  const result = backend.field.add(publicInput, one);
  console.log('Result variable:', result);
  
  // Check constraint count after addition
  const cs3 = backend.run.getConstraintSystem();
  console.log('Constraints after addition:', backend.constraintSystem.rows(cs3));
  
  // Exit constraint mode
  console.log('\n5. Exiting constraint mode...');
  const finalCs = exitConstraintMode();
  console.log('Final constraint system:', finalCs);
  
  // Get final count
  console.log('\nFinal constraint count:', backend.constraintSystem.rows(finalCs));
  
  // Check constraint system JSON
  console.log('\nConstraint system JSON:');
  const json = backend.constraintSystem.toJson(finalCs);
  console.log('Gates:', json?.gates?.length || 0);
  console.log('Public inputs:', json?.public_input_size || 0);
}

debugConstraintGeneration();