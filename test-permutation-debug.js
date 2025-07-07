const { Field, Provable, ConstraintSystem, ZkProgram, switchBackend } = require('./dist/node/index.js');

console.log('Testing constraint generation and permutation...\n');

// Test 1: Direct constraint generation
console.log('=== Test 1: Direct Constraint Generation ===');
let cs = new ConstraintSystem(() => {
  const x = Provable.witness(Field, () => Field(1));
  const y = Provable.witness(Field, () => Field(1));
  x.assertEquals(y);
});

console.log('Constraint count:', cs.rows);
console.log('Constraint system:', JSON.stringify(cs.toJSON(), null, 2));

// Test 2: ZkProgram with One Constraint
console.log('\n=== Test 2: ZkProgram with One Constraint ===');
const OneConstraintProgram = ZkProgram({
  name: 'OneConstraint',
  publicInput: Field,
  methods: {
    test: {
      privateInputs: [],
      async method(publicInput) {
        publicInput.assertEquals(publicInput);
      }
    }
  }
});

async function testBackend(backend) {
  console.log(`\n📊 Testing ${backend} backend...`);
  await switchBackend(backend);
  
  try {
    const result = await OneConstraintProgram.compile();
    console.log(`${backend} compilation succeeded`);
    console.log(`VK Hash: ${result.verificationKey.hash.toString()}`);
    return { success: true, vkHash: result.verificationKey.hash.toString() };
  } catch (error) {
    console.error(`${backend} compilation failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  const snarkyResult = await testBackend('snarky');
  const sparkyResult = await testBackend('sparky');
  
  console.log('\n=== Results ===');
  console.log('Snarky:', snarkyResult);
  console.log('Sparky:', sparkyResult);
  
  if (snarkyResult.success && sparkyResult.success) {
    const match = snarkyResult.vkHash === sparkyResult.vkHash;
    console.log(`VK Parity: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
  }
}

main().catch(console.error);