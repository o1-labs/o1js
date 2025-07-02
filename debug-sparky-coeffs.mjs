import { Field, Provable, switchBackend } from './dist/node/index.js';

// Switch to Sparky
await switchBackend('sparky');
console.log('Switched to Sparky');

// Generate constraints with debug info
const cs = await Provable.constraintSystem(() => {
  const x = Provable.witness(Field, () => Field(1));
  x.assertEquals(Field(1));
});

console.log('=== DEBUG: Constraint System ===');
console.log('Rows:', cs.rows);
console.log('Gates count:', cs.gates?.length);
console.log('\nGate 0:');
console.log('Type:', cs.gates?.[0]?.typ);
console.log('Coeffs:', cs.gates?.[0]?.coeffs);
console.log('\nRaw CS object:', JSON.stringify(cs, null, 2));