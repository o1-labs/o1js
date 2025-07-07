import { Field, Bool, Provable, ZkProgram, switchBackend } from './dist/node/index.js';

// Boolean logic test from the correctness suite
const BooleanLogic = ZkProgram({
  name: 'BooleanLogic',
  publicInput: Bool,
  publicOutput: Bool,
  methods: {
    all_true: {
      privateInputs: [Bool, Bool],
      async method(input, a, b) {
        const and1 = input.and(a);
        const and2 = and1.and(b);
        return and2;
      }
    }
  }
});

async function testBackend(backend) {
  console.log(`\n📊 Testing ${backend} backend...`);
  await switchBackend(backend);
  
  try {
    const result = await BooleanLogic.compile();
    console.log(`${backend} compilation succeeded`);
    
    // Try to create a proof
    const proof = await BooleanLogic.all_true(Bool(true), Bool(true), Bool(true));
    console.log(`${backend} proof creation succeeded`);
    
    return { 
      success: true, 
      vkHash: result.verificationKey.hash.toString(),
      proofCreated: true
    };
  } catch (error) {
    console.error(`${backend} failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Testing Boolean Logic Program...\n');
  
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