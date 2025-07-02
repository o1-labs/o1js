import { Field, Provable, switchBackend } from './dist/node/index.js';

console.log('=== DEBUG FIELD VALUES ===\n');

// Override assertEqual to log values
const originalSnarkyAssertEqual = globalThis.__snarky?.field?.assertEqual;
const originalGetSparky = globalThis.getSparky;

// Test with Snarky
console.log('--- Testing with Snarky ---');
if (originalSnarkyAssertEqual) {
  globalThis.__snarky.field.assertEqual = function(x, y) {
    console.log('Snarky assertEqual called with:', { x, y });
    return originalSnarkyAssertEqual.call(this, x, y);
  };
}

await Provable.constraintSystem(() => {
  const x = Provable.witness(Field, () => Field(1));
  console.log('Created witness x');
  
  const one = Field(1);
  console.log('Created constant Field(1):', one);
  console.log('Field(1) internal representation:', JSON.stringify(one));
  
  x.assertEquals(one);
});

// Switch to Sparky and test
await switchBackend('sparky');
console.log('\n--- Testing with Sparky ---');

// Try to intercept Sparky assertEqual
if (globalThis.getSparky) {
  const sparky = globalThis.getSparky();
  if (sparky?.field?.assertEqual) {
    const originalSparkyAssertEqual = sparky.field.assertEqual;
    sparky.field.assertEqual = function(x, y) {
      console.log('Sparky assertEqual called with:', { x, y });
      return originalSparkyAssertEqual.call(this, x, y);
    };
  }
}

await Provable.constraintSystem(() => {
  const x = Provable.witness(Field, () => Field(1));
  console.log('Created witness x');
  
  const one = Field(1);
  console.log('Created constant Field(1):', one);
  console.log('Field(1) internal representation:', JSON.stringify(one));
  
  x.assertEquals(one);
});