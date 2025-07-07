import { Field, Provable, ZkProgram, switchBackend } from './dist/node/index.js';

console.log('Testing complex constraint generation...\n');

// Test ZkProgram with actual constraints
const ComplexProgram = ZkProgram({
  name: 'ComplexConstraints', 
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field, Field],
      async method(publicInput, x, y) {
        // This should generate real constraints
        const sum = x.add(y);
        const product = sum.mul(publicInput);
        product.assertEquals(Field(42));
        return product;
      }
    }
  }
});

async function testBackend(backend) {
  console.log(`\n📊 Testing ${backend} backend...`);
  await switchBackend(backend);
  
  try {
    const result = await ComplexProgram.compile();
    console.log(`${backend} compilation succeeded`);
    console.log(`VK Hash: ${result.verificationKey.hash.toString()}`);
    return { success: true, vkHash: result.verificationKey.hash.toString() };
  } catch (error) {
    console.error(`${backend} compilation failed:`, error.message);
    console.error('Stack trace:', error.stack);
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