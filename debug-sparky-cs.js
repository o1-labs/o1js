import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('\n=== Debug Sparky Constraint System ===\n');

// Switch to Sparky first
await switchBackend('sparky');
console.log('Backend:', getCurrentBackend());

// Get the global sparky object after switching
const sparky = globalThis.__snarky;
if (!sparky || !sparky.Snarky) {
  console.log('ERROR: Sparky not available');
  process.exit(1);
}

const Snarky = sparky.Snarky;

console.log('\n1. Available methods on Snarky.run:', Object.keys(Snarky.run));

console.log('\n2. Enter constraint system:');
const handle = Snarky.run.enterConstraintSystem();
console.log('   Got handle:', typeof handle);

console.log('\n3. Check run.state:');
console.log('   State:', Snarky.run.state);
if (Snarky.run.state) {
  console.log('   State methods:', Object.keys(Snarky.run.state));
}

console.log('\n4. Create some constraints directly:');
// Create variables and constraints
let x = Snarky.field.fieldExists(0, () => "3");
let y = Snarky.field.fieldExists(0, () => "4");
console.log('   Created x:', x);
console.log('   Created y:', y);

// Multiply
let z = Snarky.field.fieldMul(x, y);
console.log('   Created z = x * y:', z);

console.log('\n5. Exit constraint system and get CS:');
let cs3 = handle();
console.log('   CS from handle:', cs3);

console.log('\n6. Check rows in CS:');
if (cs3 && Snarky.constraintSystem && Snarky.constraintSystem.rows) {
  let rows = Snarky.constraintSystem.rows(cs3);
  console.log('   Rows:', rows);
}

console.log('\n7. Get CS as JSON:');
if (cs3 && Snarky.constraintSystem && Snarky.constraintSystem.toJson) {
  let json = Snarky.constraintSystem.toJson(cs3);
  console.log('   JSON:', JSON.stringify(json, null, 2));
}

console.log('\n=== Test Complete ===\n');