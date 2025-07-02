import { Field, Poseidon, ZkProgram, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('Testing Poseidon VK generation...\n');

// Create a ZkProgram that uses Poseidon
const PoseidonProgram = ZkProgram({
  name: 'PoseidonTest',
  publicInput: Field,
  methods: {
    hash: {
      privateInputs: [Field],
      async method(pub, priv) {
        const hash = Poseidon.hash([pub, priv]);
        return hash;
      }
    }
  }
});

async function testPoseidonVK() {
  console.log('=== Testing Poseidon VK Generation ===\n');
  
  // Test with Snarky
  await switchBackend('snarky');
  console.log('Compiling with Snarky backend...');
  const snarkyCompile = await PoseidonProgram.compile();
  const snarkyVK = snarkyCompile.verificationKey;
  console.log('Snarky VK hash:', snarkyVK.hash.toString());
  
  // Test with Sparky
  await switchBackend('sparky');
  console.log('\nCompiling with Sparky backend...');
  const sparkyCompile = await PoseidonProgram.compile();
  const sparkyVK = sparkyCompile.verificationKey;
  console.log('Sparky VK hash:', sparkyVK.hash.toString());
  
  // Compare
  console.log('\n=== VK Comparison ===');
  console.log('VK hashes match:', snarkyVK.hash.toString() === sparkyVK.hash.toString() ? '✅' : '❌');
  
  // Analyze constraint counts
  console.log('\n=== Constraint Analysis ===');
  await switchBackend('snarky');
  const snarkyAnalysis = await PoseidonProgram.analyzeMethods();
  console.log('Snarky constraint count:', snarkyAnalysis.hash.rows);
  
  await switchBackend('sparky');
  const sparkyAnalysis = await PoseidonProgram.analyzeMethods();
  console.log('Sparky constraint count:', sparkyAnalysis.hash.rows);
  
  // Test actual Poseidon computation
  console.log('\n=== Poseidon Computation Test ===');
  const input1 = Field(100);
  const input2 = Field(200);
  
  await switchBackend('snarky');
  const snarkyHash = Poseidon.hash([input1, input2]);
  console.log('Snarky Poseidon result:', snarkyHash.toString());
  
  await switchBackend('sparky');
  const sparkyHash = Poseidon.hash([input1, input2]);
  console.log('Sparky Poseidon result:', sparkyHash.toString());
  console.log('Poseidon results match:', snarkyHash.toString() === sparkyHash.toString() ? '✅' : '❌');
}

// Test raw constraint generation for Poseidon
async function testPoseidonConstraints() {
  console.log('\n\n=== Raw Poseidon Constraint Generation ===\n');
  
  const poseidonCircuit = () => {
    const a = Provable.witness(Field, () => Field(100));
    const b = Provable.witness(Field, () => Field(200));
    const hash = Poseidon.hash([a, b]);
    // Don't add assertEquals to see pure Poseidon constraints
  };
  
  await switchBackend('snarky');
  const snarkyCS = await Provable.constraintSystem(poseidonCircuit);
  console.log('Snarky Poseidon constraints:', snarkyCS.gates.length);
  console.log('Gate types:', [...new Set(snarkyCS.gates.map(g => g.type))].join(', '));
  
  await switchBackend('sparky');
  const sparkyCS = await Provable.constraintSystem(poseidonCircuit);
  console.log('\nSparky Poseidon constraints:', sparkyCS.gates.length);
  console.log('Gate types:', [...new Set(sparkyCS.gates.map(g => g.type))].join(', '));
  
  console.log('\nConstraint count ratio:', (sparkyCS.gates.length / snarkyCS.gates.length).toFixed(2) + 'x');
}

testPoseidonVK()
  .then(() => testPoseidonConstraints())
  .catch(console.error);