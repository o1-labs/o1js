import { switchBackend, initializeBindings } from './dist/node/index.js';

console.log('Testing Sparky handle access...');

// Initialize bindings
await initializeBindings();

// Switch to Sparky
await switchBackend('sparky');

// Access the bindings directly
const bindings = await import('./dist/node/bindings.js');
const Snarky = bindings.Snarky;

console.log('Snarky object:', typeof Snarky);
console.log('Snarky.run:', typeof Snarky.run);

// Get the run module
const runModule = Snarky.run;
console.log('runModule:', runModule);
console.log('runModule type:', typeof runModule);

// Check what methods are available
if (runModule) {
  console.log('runModule properties:', Object.getOwnPropertyNames(runModule));
  console.log('runModule prototype:', Object.getPrototypeOf(runModule));
  
  // Check if methods exist
  console.log('enterConstraintSystem?', typeof runModule.enterConstraintSystem);
  console.log('getConstraintSystem?', typeof runModule.getConstraintSystem);
}

// Try to use enterConstraintSystem
if (runModule.enterConstraintSystem) {
  const handle = runModule.enterConstraintSystem();
  console.log('handle type:', typeof handle);
  console.log('handle:', handle);
  
  // Try to call it
  try {
    const cs = handle();
    console.log('Constraint system:', cs);
  } catch (e) {
    console.error('Error calling handle:', e.message);
  }
}