import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('Testing constraint generation for simple multiplication...\n');

// Test circuit: x * x = 9
const testCircuit = () => {
  const x = Provable.witness(Field, () => Field(3));
  x.mul(x).assertEquals(Field(9));
};

// Test with Snarky
console.log('=== SNARKY BACKEND ===');
await switchBackend('snarky');
console.log('Current backend:', getCurrentBackend());

const snarkyCS = await Provable.constraintSystem(testCircuit);
console.log('Constraint count:', snarkyCS.gates.length);
console.log('Gates:');
snarkyCS.gates.forEach((gate, i) => {
  console.log(`  Gate ${i}: type=${gate.type || gate.typ}, coeffs=${JSON.stringify(gate.coeffs)}`);
});

// Test with Sparky
console.log('\n=== SPARKY BACKEND ===');
await switchBackend('sparky');
console.log('Current backend:', getCurrentBackend());

const sparkyCS = await Provable.constraintSystem(testCircuit);
console.log('Constraint count:', sparkyCS.gates.length);
console.log('Gates:');
sparkyCS.gates.forEach((gate, i) => {
  console.log(`  Gate ${i}: type=${gate.type || gate.typ}, coeffs=${JSON.stringify(gate.coeffs)}`);
});

console.log('\n=== ANALYSIS ===');
console.log(`Snarky generates ${snarkyCS.gates.length} constraint(s)`);
console.log(`Sparky generates ${sparkyCS.gates.length} constraint(s)`);
console.log(`Ratio: ${sparkyCS.gates.length / snarkyCS.gates.length}x`);

// Let's also test a simpler case
console.log('\n\n=== TESTING SIMPLE EQUALITY ===');

const equalityCircuit = () => {
  const x = Provable.witness(Field, () => Field(5));
  x.assertEquals(Field(5));
};

await switchBackend('snarky');
const snarkyEq = await Provable.constraintSystem(equalityCircuit);
console.log('Snarky equality constraints:', snarkyEq.gates.length);

await switchBackend('sparky');
const sparkyEq = await Provable.constraintSystem(equalityCircuit);
console.log('Sparky equality constraints:', sparkyEq.gates.length);

// Let's also check the actual constraint system JSON
console.log('\n\n=== CONSTRAINT SYSTEM JSON ===');

console.log('\nSnarky constraint system JSON:');
console.log(JSON.stringify(snarkyCS, null, 2));

console.log('\nSparky constraint system JSON:');
console.log(JSON.stringify(sparkyCS, null, 2));