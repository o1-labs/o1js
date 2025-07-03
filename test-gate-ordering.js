import { Field, ZkProgram, switchBackend, initializeBindings, Provable } from './dist/node/index.js';

async function analyzeGateOrdering() {
  console.log('=== GATE ORDERING ANALYSIS ===\n');
  
  await initializeBindings();
  
  // Simple test program with multiple constraints
  const TestProgram = ZkProgram({
    name: 'TestProgram',
    publicInput: Field,
    methods: {
      multipleConstraints: {
        privateInputs: [Field, Field],
        async method(sum, a, b) {
          // Create 5 generic constraints
          a.add(b).assertEquals(sum);          // Constraint 1
          a.mul(Field(2)).assertEquals(Field(10)); // Constraint 2  
          b.sub(Field(3)).assertEquals(Field(4));  // Constraint 3
          a.add(Field(1)).assertEquals(Field(6));  // Constraint 4
          b.mul(Field(3)).assertEquals(Field(21)); // Constraint 5
        },
      },
    },
  });
  
  // Compile with Snarky
  console.log('Compiling with Snarky...');
  await switchBackend('snarky');
  const snarkyResult = await TestProgram.compile();
  
  // Compile with Sparky
  console.log('Compiling with Sparky...');
  await switchBackend('sparky');
  const sparkyResult = await TestProgram.compile();
  
  // Analyze results
  console.log('\n=== RESULTS ===');
  console.log(`Snarky gates: ${snarkyResult.constraintSystem.gates.length}`);
  console.log(`Sparky gates: ${sparkyResult.constraintSystem.gates.length}`);
  
  // Count generic gates and their coefficients
  let snarkyGenericStats = { total: 0, batched: 0, single: 0 };
  let sparkyGenericStats = { total: 0, batched: 0, single: 0 };
  
  snarkyResult.constraintSystem.gates.forEach(gate => {
    if (gate.typ === 'Generic') {
      snarkyGenericStats.total++;
      if (gate.coeffs.length === 10) {
        snarkyGenericStats.batched++;
      } else {
        snarkyGenericStats.single++;
      }
    }
  });
  
  sparkyResult.constraintSystem.gates.forEach(gate => {
    if (gate.typ === 'Generic') {
      sparkyGenericStats.total++;
      if (gate.coeffs.length === 10) {
        sparkyGenericStats.batched++;
      } else {
        sparkyGenericStats.single++;
      }
    }
  });
  
  console.log('\nGeneric Gate Analysis:');
  console.log('Snarky:', snarkyGenericStats);
  console.log('Sparky:', sparkyGenericStats);
  
  console.log('\nExpected for 5 constraints:');
  console.log('With batching: 3 gates (2 batched + 1 single)');
  console.log('Without batching: 5 gates (all single)');
  
  console.log('\nBatching Status:');
  console.log(`Snarky: ${snarkyGenericStats.batched > 0 ? 'WORKING ✓' : 'NOT WORKING ✗'}`);
  console.log(`Sparky: ${sparkyGenericStats.batched > 0 ? 'WORKING ✓' : 'NOT WORKING ✗'}`);
  
  console.log('\nVK Comparison:');
  console.log(`Snarky VK: ${snarkyResult.verificationKey.hash}`);
  console.log(`Sparky VK: ${sparkyResult.verificationKey.hash}`);
  console.log(`Match: ${snarkyResult.verificationKey.hash === sparkyResult.verificationKey.hash ? '✓' : '✗'}`);
  
  // Show first few gates
  console.log('\nFirst 5 gates of each:');
  console.log('Snarky:');
  snarkyResult.constraintSystem.gates.slice(0, 5).forEach((gate, i) => {
    console.log(`  ${i}: ${gate.typ} (${gate.coeffs.length} coeffs)`);
  });
  
  console.log('Sparky:');
  sparkyResult.constraintSystem.gates.slice(0, 5).forEach((gate, i) => {
    console.log(`  ${i}: ${gate.typ} (${gate.coeffs.length} coeffs)`);
  });
}

analyzeGateOrdering().catch(console.error);