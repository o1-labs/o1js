import { Field, Provable, initializeBindings, switchBackend } from './dist/node/index.js';

console.log('=== Detailed Constraint Comparison ===\n');

// Initialize bindings
await initializeBindings();

// Simple test circuit: x * x = 9
const testCircuit = () => {
  const x = Provable.witness(Field, () => Field(3));
  x.mul(x).assertEquals(Field(9));
};

// Get constraint system with Snarky
console.log('Compiling with Snarky...');
const snarkyCS = await Provable.constraintSystem(testCircuit);
console.log('Snarky constraint count:', snarkyCS.gates.length);
console.log('Snarky constraint details:');
snarkyCS.gates.forEach((gate, i) => {
  console.log(`\nGate ${i}:`);
  console.log('  Type:', gate.typ);
  console.log('  Coefficients:', gate.coeffs);
  console.log('  Wires:', JSON.stringify(gate.wires));
});

// Switch to Sparky
await switchBackend('sparky');
console.log('\nSwitching to Sparky backend...\n');

// Get constraint system with Sparky
console.log('Compiling with Sparky...');
const sparkyCS = await Provable.constraintSystem(testCircuit);
console.log('Sparky constraint count:', sparkyCS.gates.length);
console.log('Sparky constraint details:');
sparkyCS.gates.forEach((gate, i) => {
  console.log(`\nGate ${i}:`);
  console.log('  Type:', gate.typ);
  console.log('  Coefficients:', gate.coeffs);
  console.log('  Wires:', JSON.stringify(gate.wires));
});

// Compare the constraints
console.log('\n=== Constraint Comparison ===');
console.log('Gate count match:', snarkyCS.gates.length === sparkyCS.gates.length ? '✅' : '❌');

if (snarkyCS.gates.length === sparkyCS.gates.length) {
  for (let i = 0; i < snarkyCS.gates.length; i++) {
    const snarkyGate = snarkyCS.gates[i];
    const sparkyGate = sparkyCS.gates[i];
    
    console.log(`\nGate ${i} comparison:`);
    console.log('  Type match:', snarkyGate.typ === sparkyGate.typ ? '✅' : '❌', 
                `(Snarky: ${snarkyGate.typ}, Sparky: ${sparkyGate.typ})`);
    
    // Compare coefficients
    const coeffsMatch = JSON.stringify(snarkyGate.coeffs) === JSON.stringify(sparkyGate.coeffs);
    console.log('  Coefficients match:', coeffsMatch ? '✅' : '❌');
    if (!coeffsMatch) {
      console.log('    Snarky coeffs:', snarkyGate.coeffs);
      console.log('    Sparky coeffs:', sparkyGate.coeffs);
    }
    
    // Compare wires
    const wiresMatch = JSON.stringify(snarkyGate.wires) === JSON.stringify(sparkyGate.wires);
    console.log('  Wires match:', wiresMatch ? '✅' : '❌');
    if (!wiresMatch) {
      console.log('    Snarky wires:', JSON.stringify(snarkyGate.wires));
      console.log('    Sparky wires:', JSON.stringify(sparkyGate.wires));
    }
  }
}

// Test more complex constraints
console.log('\n\n=== Testing Addition Constraint ===');

const additionCircuit = () => {
  const x = Provable.witness(Field, () => Field(3));
  const y = Provable.witness(Field, () => Field(5));
  x.add(y).assertEquals(Field(8));
};

// Switch back to Snarky
await switchBackend('snarky');
const snarkyAddCS = await Provable.constraintSystem(additionCircuit);
console.log('Snarky (addition):', snarkyAddCS.gates.length, 'gates');

// Switch to Sparky
await switchBackend('sparky');
const sparkyAddCS = await Provable.constraintSystem(additionCircuit);
console.log('Sparky (addition):', sparkyAddCS.gates.length, 'gates');

// Test pure equality constraint
console.log('\n\n=== Testing Pure Equality Constraint ===');

const equalityCircuit = () => {
  const x = Provable.witness(Field, () => Field(5));
  x.assertEquals(Field(5));
};

// Switch back to Snarky
await switchBackend('snarky');
const snarkyEqCS = await Provable.constraintSystem(equalityCircuit);
console.log('Snarky (equality):', snarkyEqCS.gates.length, 'gates');
if (snarkyEqCS.gates.length > 0) {
  console.log('  First gate type:', snarkyEqCS.gates[0].typ);
  console.log('  First gate coeffs:', snarkyEqCS.gates[0].coeffs);
}

// Switch to Sparky
await switchBackend('sparky');  
const sparkyEqCS = await Provable.constraintSystem(equalityCircuit);
console.log('Sparky (equality):', sparkyEqCS.gates.length, 'gates');
if (sparkyEqCS.gates.length > 0) {
  console.log('  First gate type:', sparkyEqCS.gates[0].typ);
  console.log('  First gate coeffs:', sparkyEqCS.gates[0].coeffs);
}

process.exit(0);