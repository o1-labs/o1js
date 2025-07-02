import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('\n=== Debug Constraint System Timing ===\n');

// Switch to Sparky
await switchBackend('sparky');
console.log('Backend:', getCurrentBackend());

const bridge = globalThis.sparkyConstraintBridge;

console.log('1. Start constraint accumulation:');
bridge.startConstraintAccumulation();

console.log('\n2. Check constraints BEFORE circuit:');
let constraints1 = bridge.getAccumulatedConstraints();
console.log('   Constraints before:', constraints1.length);

console.log('\n3. Execute circuit in constraint system context:');
// Use the Snarky API directly
const sparky = globalThis.__snarky;
const Snarky = sparky.Snarky;

// Enter constraint system
const handle = Snarky.run.enterConstraintSystem();
console.log('   Entered constraint system');

// Create witness variables
let x = Snarky.run.exists(0, () => "3");
let y = Snarky.run.exists(0, () => "4");
console.log('   Created witnesses x:', x, 'y:', y);

// Check constraints after witnesses
let constraints2 = bridge.getAccumulatedConstraints();
console.log('\n4. Constraints after witnesses:', constraints2.length);

// Create a multiplication through Field API
const fieldX = Field(3);
const fieldY = Field(4);
const fieldZ = fieldX.mul(fieldY);
console.log('\n5. Created Field multiplication');

// Check constraints after Field mul
let constraints3 = bridge.getAccumulatedConstraints();
console.log('   Constraints after Field.mul:', constraints3.length);

// Exit constraint system
console.log('\n6. Exit constraint system:');
let cs = handle();
console.log('   Got CS from handle:', cs);

// Check constraints after exit
let constraints4 = bridge.getAccumulatedConstraints();
console.log('   Constraints after exit:', constraints4.length);

// End accumulation
console.log('\n7. End accumulation:');
bridge.endConstraintAccumulation();

console.log('\n=== Analysis ===');
console.log('Constraints at each stage:');
console.log('  Before circuit:', constraints1.length);
console.log('  After witnesses:', constraints2.length);
console.log('  After Field.mul:', constraints3.length);
console.log('  After CS exit:', constraints4.length);

console.log('\n=== Complete ===\n');