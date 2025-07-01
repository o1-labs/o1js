import { initializeSparky, Snarky } from './dist/node/bindings/sparky-adapter.js';

// Initialize Sparky and check available field methods
try {
  await initializeSparky();
  // Snarky is already imported
  
  console.log('Available Snarky.field methods:', Object.keys(Snarky.field).sort());
  
  // Try to use field operations
  console.log('\nTesting field operations:');
  
  // Test if methods exist
  console.log('field.add exists:', typeof Snarky.field.add);
  console.log('field.mul exists:', typeof Snarky.field.mul);
  console.log('field.sub exists:', typeof Snarky.field.sub);
  console.log('field.square exists:', typeof Snarky.field.square);
  
  // Try to create some field elements
  const x = Snarky.field.constant(5);
  const y = Snarky.field.constant(7);
  
  console.log('\nCreated constants x=5, y=7');
  
  // Try arithmetic operations
  try {
    const sum = Snarky.field.add(x, y);
    console.log('add(5, 7) succeeded');
  } catch (e) {
    console.log('add(5, 7) error:', e.message);
  }
  
  try {
    const product = Snarky.field.mul(x, y);
    console.log('mul(5, 7) succeeded');
  } catch (e) {
    console.log('mul(5, 7) error:', e.message);
  }
  
} catch (error) {
  console.error('Initialization error:', error.message);
  console.error(error.stack);
}