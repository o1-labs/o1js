import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('\n=== Debug Constraint System via Handle ===\n');

// Switch to Sparky
await switchBackend('sparky');
console.log('Backend:', getCurrentBackend());

const bridge = globalThis.sparkyConstraintBridge;
const sparky = globalThis.__snarky;
const Snarky = sparky.Snarky;

console.log('1. Start constraint accumulation:');
bridge.startConstraintAccumulation();

console.log('\n2. Enter constraint system and create constraints:');
const handle = Snarky.run.enterConstraintSystem();

// Create some field operations that should generate constraints
const x = Field(3);
const y = Field(4);
const z = x.mul(y);
z.assertEquals(Field(12));

console.log('   Created constraints: 3 * 4 = 12');

console.log('\n3. Exit and get constraint system from handle:');
const csFromHandle = handle();
console.log('   CS from handle type:', typeof csFromHandle);
console.log('   CS from handle is array:', Array.isArray(csFromHandle));

// Try to use the constraint system module on the handle result
if (Snarky.constraintSystem) {
  console.log('\n4. Try to get info from CS:');
  try {
    const rows = Snarky.constraintSystem.rows(csFromHandle);
    console.log('   Rows from handle CS:', rows);
  } catch (e) {
    console.log('   Error getting rows:', e.message);
  }
  
  try {
    const json = Snarky.constraintSystem.toJson(csFromHandle);
    console.log('   JSON from handle CS:', json);
  } catch (e) {
    console.log('   Error getting JSON:', e.message);
  }
}

console.log('\n5. Check accumulated constraints via bridge:');
const constraints = bridge.getAccumulatedConstraints();
console.log('   Constraints from bridge:', constraints.length);

console.log('\n6. End accumulation:');
bridge.endConstraintAccumulation();

console.log('\n=== Complete ===\n');