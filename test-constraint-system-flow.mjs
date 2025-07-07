import { Field, switchBackend } from './dist/node/index.js';

async function testConstraintSystemFlow() {
  console.log('Testing constraint system flow\n');
  
  await switchBackend('sparky');
  
  // Get backend through global routing
  const backend = globalThis.__snarky?.Snarky;
  if (!backend) {
    console.error('Backend not available through global routing');
    return;
  }
  
  console.log('Backend run methods:', Object.keys(backend.run));
  console.log('Backend constraintSystem methods:', Object.keys(backend.constraintSystem));
  
  // Check if we're getting the fresh snapshot
  console.log('\nCreating a simple constraint flow:');
  
  // Enter constraint mode
  console.log('1. Entering constraint system...');
  const exitHandle = backend.run.enterConstraintSystem();
  
  // Create variables and constraints
  console.log('2. Creating variables...');
  const a = backend.field.constant('5');
  const b = backend.field.constant('10');
  console.log('Created constants:', a, b);
  
  // Add them
  console.log('3. Adding constraints...');
  const sum = backend.field.add(a, b);
  console.log('Sum variable:', sum);
  
  // Get constraint system multiple times to see if it updates
  console.log('\n4. Getting constraint system snapshots:');
  const cs1 = backend.run.getConstraintSystem();
  console.log('Snapshot 1 constraints:', backend.constraintSystem.rows(cs1));
  
  // Add more constraints
  const c = backend.field.constant('20');
  const product = backend.field.mul(sum, c);
  console.log('Added multiplication, product:', product);
  
  const cs2 = backend.run.getConstraintSystem();
  console.log('Snapshot 2 constraints:', backend.constraintSystem.rows(cs2));
  
  // Exit and get final
  console.log('\n5. Exiting constraint mode...');
  const finalCs = exitHandle();
  console.log('Final constraint system:', finalCs);
  console.log('Final constraints:', backend.constraintSystem.rows(finalCs));
  
  // Check the constraint system JSON
  const json = backend.constraintSystem.toJson(finalCs);
  console.log('\nConstraint system JSON:');
  console.log('Public input size:', json?.public_input_size);
  console.log('Gates:', json?.gates?.length);
  
  // Let's also check what happens when we analyze a method
  console.log('\n\n=== Testing through Field class ===');
  
  // Use Field.runAndCheck which should handle constraint accumulation
  let constraintCount = 0;
  Field.runAndCheck(() => {
    const x = new Field(5);
    const y = new Field(10);
    const z = x.add(y);
    
    // Check constraint count during execution
    const currentCs = backend.run.getConstraintSystem();
    constraintCount = backend.constraintSystem.rows(currentCs);
  });
  
  console.log('Constraints from Field.runAndCheck:', constraintCount);
}

testConstraintSystemFlow();