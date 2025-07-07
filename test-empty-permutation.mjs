import { ZkProgram, Void, switchBackend, getCurrentBackend } from './dist/node/index.js';

// Absolutely minimal program - no constraints at all
const EmptyProgram = ZkProgram({
  name: 'EmptyProgram',
  publicInput: Void,
  publicOutput: Void,
  methods: {
    empty: {
      privateInputs: [],
      async method() {
        // No operations, no constraints
      }
    }
  }
});

async function testBackend(backendName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${backendName} backend`);
  console.log('='.repeat(60));
  
  if (backendName === 'sparky') {
    await switchBackend('sparky');
  }
  
  console.log('Current backend:', getCurrentBackend());
  
  try {
    console.log('\n📋 Compiling EmptyProgram...');
    const { verificationKey } = await EmptyProgram.compile();
    console.log('✅ Compilation successful');
    console.log('VK hash:', verificationKey.hash);
    
    console.log('\n🔨 Creating proof...');
    const result = await EmptyProgram.empty();
    console.log('✅ Proof created successfully');
    
    console.log('\n✓ Verifying proof...');
    const isValid = await EmptyProgram.verify(result.proof);
    console.log('✅ Proof verified:', isValid);
    
    return { success: true, vkHash: verificationKey.hash };
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🧪 Empty Program Permutation Test');
  console.log('Testing the absolute minimal case - zero constraints');
  
  // Test Snarky first
  const snarkyResult = await testBackend('snarky');
  
  // Test Sparky
  const sparkyResult = await testBackend('sparky');
  
  // Compare results
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPARISON RESULTS');
  console.log('='.repeat(60));
  console.log('Snarky:', snarkyResult.success ? '✅ PASS' : '❌ FAIL');
  console.log('Sparky:', sparkyResult.success ? '✅ PASS' : '❌ FAIL');
  
  if (snarkyResult.success && sparkyResult.success) {
    console.log('\nVK Hash Comparison:');
    console.log('Snarky:', snarkyResult.vkHash);
    console.log('Sparky:', sparkyResult.vkHash);
    console.log('Match:', snarkyResult.vkHash.toString() === sparkyResult.vkHash.toString() ? '✅' : '❌');
  }
}

main().catch(console.error);