import { Field, Provable, switchBackend } from './dist/node/index.js';

console.log('=== DEBUG CONSTRAINT GENERATION ===\n');

// Test with Snarky first
console.log('--- Testing with Snarky ---');
console.log('Creating witness Field(1) and asserting equals Field(1)');

const constraintsSnarky = await Provable.constraintSystem(() => {
  const x = Provable.witness(Field, () => Field(1));
  console.log('Witness x created');
  x.assertEquals(Field(1));
  console.log('assertEquals called');
});

console.log('Snarky constraints:', JSON.stringify(constraintsSnarky.gates[0], null, 2));

// Switch to Sparky
await switchBackend('sparky');
console.log('\n--- Testing with Sparky ---');
console.log('Creating witness Field(1) and asserting equals Field(1)');

// Enable debug logging in Sparky
if (globalThis.__sparky?.wasm?.enableDebugLogging) {
  globalThis.__sparky.wasm.enableDebugLogging();
}

const constraintsSparky = await Provable.constraintSystem(() => {
  const x = Provable.witness(Field, () => Field(1));
  console.log('Witness x created');
  x.assertEquals(Field(1));
  console.log('assertEquals called');
});

console.log('Sparky constraints:', JSON.stringify(constraintsSparky.gates[0], null, 2));