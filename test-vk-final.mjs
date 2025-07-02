import { Field, ZkProgram, Poseidon, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('=== FINAL VK PARITY TEST ===\n');

// Simple test programs
const TestProgram = ZkProgram({
  name: 'VkParityTest',
  methods: {
    simple: {
      privateInputs: [Field],
      async method(x) {
        x.assertEquals(Field(42));
      }
    },
    complex: {
      privateInputs: [Field, Field],  
      async method(a, b) {
        const sum = a.add(b);
        const hash = Poseidon.hash([sum]);
        hash.assertEquals(Poseidon.hash([Field(5)]));
      }
    }
  }
});

async function testVK(backend) {
  console.log(`Testing with ${backend}...`);
  if (backend === 'sparky') {
    await switchBackend('sparky');
  }
  
  const { verificationKey } = await TestProgram.compile();
  
  // Extract just the hash for comparison
  const hash = verificationKey.hash;
  console.log(`  VK Hash: ${hash.substring(0, 20)}...`);
  
  return hash;
}

try {
  const snarkyVK = await testVK('snarky');
  const sparkyVK = await testVK('sparky');
  
  console.log('\n=== COMPARISON ===');
  console.log(`Snarky VK: ${snarkyVK.substring(0, 20)}...`);
  console.log(`Sparky VK: ${sparkyVK.substring(0, 20)}...`);
  console.log(`Match: ${snarkyVK === sparkyVK ? '✅ YES' : '❌ NO'}`);
  
  if (snarkyVK === sparkyVK) {
    console.log('\n🎉 VK PARITY ACHIEVED! 🎉');
  } else {
    console.log('\n⚠️  VK parity not yet achieved');
  }
  
} catch (error) {
  console.error('Error:', error.message);
}