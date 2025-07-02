import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('\n=== Debug Gates Direct ===\n');

// Switch to Sparky
await switchBackend('sparky');
console.log('Backend:', getCurrentBackend());

const bridge = globalThis.sparkyConstraintBridge;
const sparky = globalThis.__snarky;
const Snarky = sparky.Snarky;

console.log('1. Start constraint accumulation:');
bridge.startConstraintAccumulation();

console.log('\n2. Enter constraint system:');
const handle = Snarky.run.enterConstraintSystem();

console.log('\n3. Create witness variables:');
// Create witness variables for x=3, y=4, z=12
// existsOne returns variables in the correct format [1, varId]
const x = Snarky.run.existsOne(() => "3");
const y = Snarky.run.existsOne(() => "4");
const z = Snarky.run.existsOne(() => "12");
console.log('   x:', x, 'y:', y, 'z:', z);

console.log('\n4. Call gates.generic directly for x*y=z:');
// Create a generic gate for multiplication: x * y - z = 0
// coefficients: mul=1, out=-1, others=0
// This represents: 1*x*y + 0*x + 0*y + (-1)*z + 0 = 0
try {
  Snarky.gates.generic(
    0, x,      // left coefficient and variable
    0, y,      // right coefficient and variable
    -1, z,     // out coefficient and variable
    1,         // mul coefficient
    0          // const coefficient
  );
  console.log('   Generic gate added successfully');
} catch (e) {
  console.log('   Error adding generic gate:', e.message);
  console.log('   Error stack:', e.stack);
}

console.log('\n5. Exit constraint system:');
const cs = handle();
console.log('   CS from handle:', typeof cs);

console.log('\n6. Check constraint system:');
if (Snarky.constraintSystem) {
  const rows = Snarky.constraintSystem.rows(cs);
  console.log('   Rows:', rows);
  
  const json = Snarky.constraintSystem.toJson(cs);
  console.log('   JSON:', JSON.stringify(json, null, 2));
}

console.log('\n7. Check accumulated constraints:');
const constraints = bridge.getAccumulatedConstraints();
console.log('   Constraints from bridge:', constraints.length);
if (constraints.length > 0) {
  console.log('   First constraint:', JSON.stringify(constraints[0], null, 2));
}

console.log('\n8. End accumulation:');
bridge.endConstraintAccumulation();

console.log('\n=== Complete ===\n');