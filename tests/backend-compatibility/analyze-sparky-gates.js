import { Field, initializeBindings, switchBackend, Provable } from '../../dist/node/index.js';

async function analyzeSparkyGates() {
  await initializeBindings();
  
  console.log('=== Analyzing constraint differences between Snarky and Sparky ===\n');
  
  // Define a simple test circuit
  async function testCircuit() {
    const x = Field(5);
    const y = Field(10);
    const z = x.mul(y);
    z.assertEquals(Field(50));
  }
  
  // Test with Snarky
  console.log('1. Snarky constraint system:');
  const snarkyResult = await Provable.constraintSystem(testCircuit);
  console.log('   Gates:', snarkyResult.gates.length);
  console.log('   Public input size:', snarkyResult.publicInputSize);
  console.log('   Summary:', snarkyResult.summary());
  console.log('   First few gates:');
  snarkyResult.gates.slice(0, 3).forEach((gate, i) => {
    console.log(`   Gate ${i}:`, {
      type: gate.type,
      coeffs: gate.coeffs?.slice(0, 3),
      wires: gate.wires
    });
  });
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  // Test with Sparky
  console.log('\n2. Sparky constraint system:');
  const sparkyResult = await Provable.constraintSystem(testCircuit);
  console.log('   Gates:', sparkyResult.gates.length);
  console.log('   Public input size:', sparkyResult.publicInputSize);
  console.log('   Summary:', sparkyResult.summary());
  console.log('   First few gates:');
  sparkyResult.gates.slice(0, 3).forEach((gate, i) => {
    console.log(`   Gate ${i}:`, {
      type: gate.type,
      coeffs: gate.coeffs?.slice(0, 3),
      wires: gate.wires
    });
  });
  
  // Compare the coefficients
  console.log('\n3. Coefficient analysis:');
  console.log('   Sparky coeff[1]:', sparkyResult.gates[0]?.coeffs?.[1]);
  console.log('   This appears to be -1 in the field (p-1)');
  
  // Decode the hex coefficient
  const hexCoeff = '40000000000000000000000000000000224698fc094cf91b992d30ed00000000';
  const bigIntCoeff = BigInt('0x' + hexCoeff);
  console.log('   As BigInt:', bigIntCoeff);
  console.log('   Field modulus - 1:', (2n ** 255n - 19n) - 1n);
  console.log('   Match?', bigIntCoeff === (2n ** 255n - 19n) - 1n);
}

analyzeSparkyGates().catch(console.error);