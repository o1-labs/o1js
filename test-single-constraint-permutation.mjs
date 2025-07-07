import { ZkProgram, Field, switchBackend, getCurrentBackend } from './dist/node/index.js';

// Program with exactly one constraint
const SingleConstraintProgram = ZkProgram({
  name: 'SingleConstraintProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    test: {
      privateInputs: [],
      async method(x) {
        // Single addition creating one constraint
        return x.add(1);
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
    console.log('\n📋 Compiling SingleConstraintProgram...');
    const { verificationKey } = await SingleConstraintProgram.compile();
    console.log('✅ Compilation successful');
    console.log('VK hash:', verificationKey.hash);
    
    console.log('\n🔨 Creating proof...');
    const result = await SingleConstraintProgram.test(Field(5));
    console.log('✅ Proof created successfully');
    console.log('Result:', result.proof.publicOutput.toString());
    
    console.log('\n✓ Verifying proof...');
    const isValid = await SingleConstraintProgram.verify(result.proof);
    console.log('✅ Proof verified:', isValid);
    
    return { success: true, vkHash: verificationKey.hash };
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack && error.message.includes('permutation')) {
      // Only show relevant stack trace for permutation errors
      const relevantStack = error.stack.split('\n').slice(0, 10).join('\n');
      console.error('\nStack trace (first 10 lines):');
      console.error(relevantStack);
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🧪 Single Constraint Permutation Test');
  console.log('Testing with exactly one constraint (addition)');
  
  // Test Snarky first
  const snarkyResult = await testBackend('snarky');
  
  // Reset to snarky before switching to sparky
  await switchBackend('snarky');
  
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
  } else {
    if (!snarkyResult.success) {
      console.log('\nSnarky error:', snarkyResult.error);
    }
    if (!sparkyResult.success) {
      console.log('\nSparky error:', sparkyResult.error);
    }
  }
}

main().catch(console.error);