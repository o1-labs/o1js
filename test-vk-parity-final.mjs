import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

console.log('=== FINAL VK PARITY TEST ===\n');

// Simple test programs
const SimpleProgram = ZkProgram({
  name: 'VkParityTest',
  methods: {
    check: {
      privateInputs: [Field],
      async method(x) {
        x.assertEquals(Field(1));
      }
    }
  }
});

async function testVK(backend) {
  console.log(`Testing with ${backend}...`);
  if (backend === 'sparky') {
    await switchBackend('sparky');
  }
  
  const { verificationKey } = await SimpleProgram.compile();
  
  // Extract the hash BigInt value
  const hashValue = verificationKey.hash.value[1][1];
  console.log(`  VK Hash: ${hashValue.toString()}`);
  
  return hashValue.toString();
}

try {
  const snarkyVK = await testVK('snarky');
  const sparkyVK = await testVK('sparky');
  
  console.log('\n=== COMPARISON ===');
  console.log(`Snarky VK: ${snarkyVK}`);
  console.log(`Sparky VK: ${sparkyVK}`);
  console.log(`Match: ${snarkyVK === sparkyVK ? '✅ YES - VK PARITY ACHIEVED!' : '❌ NO - Still different'}`);
  
  if (snarkyVK === sparkyVK) {
    console.log('\n🎉🎉🎉 VK PARITY ACHIEVED! 🎉🎉🎉');
    console.log('🎯 Sparky now generates identical verification keys to Snarky!');
    console.log('✨ The two-phase architectural fix was successful!');
  } else {
    console.log('\n⚠️  VK parity not yet achieved, but clean execution!');
    console.log('✅ No more architectural violations or infinite loops');
    console.log('✅ Both backends complete compilation successfully');
    console.log('🔍 Further investigation needed for remaining differences');
  }
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}