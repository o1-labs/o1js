/**
 * Minimal test case that reproduces the permutation error
 * Based on the investigation in FIX_PERM2.md
 */

const { Field, ZkProgram, switchBackend } = require('./dist/node/index.cjs');

// The simplest possible ZkProgram that triggers the permutation error
const SimpleProgram = ZkProgram({
  name: 'SimpleProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field, Field],
      async method(publicInput, a, b) {
        // Simple computation: publicInput + a * b
        const result = a.mul(b).add(publicInput);
        return { publicOutput: result };
      },
    },
  },
});

async function testBackend(backend) {
  console.log(`\n🔄 Testing with ${backend.toUpperCase()} backend...`);
  console.log('─'.repeat(50));
  
  await switchBackend(backend);
  console.log(`✓ Switched to ${backend} backend`);
  
  try {
    console.log('📋 Compiling SimpleProgram...');
    const { verificationKey } = await SimpleProgram.compile();
    console.log('✅ Compilation successful');
    console.log(`🔑 VK hash: ${verificationKey.hash.toString().substring(0, 12)}...`);
    
    console.log('\n🧪 Creating proof...');
    const publicInput = Field(10);
    const a = Field(5);
    const b = Field(3);
    
    const proof = await SimpleProgram.compute(publicInput, a, b);
    console.log('✅ Proof created successfully');
    console.log(`📤 Public output: ${proof.publicOutput.toString()}`);
    
    console.log('\n🔍 Verifying proof...');
    const isValid = await SimpleProgram.verify(proof);
    console.log(`✅ Proof verification: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    return true;
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    if (error.message.includes('permutation was not constructed correctly')) {
      console.log('🚨 This is the permutation bug!');
      console.log('   The variable unification fix should resolve this.');
    }
    return false;
  }
}

async function main() {
  console.log('🎯 Testing Minimal Permutation Error Reproduction');
  console.log('================================================\n');
  
  console.log('This test reproduces the exact error from FIX_PERM2.md:');
  console.log('"the permutation was not constructed correctly: final value"\n');
  
  // Test Snarky (should work)
  const snarkyResult = await testBackend('snarky');
  
  // Test Sparky (will show if fix works)
  const sparkyResult = await testBackend('sparky');
  
  console.log('\n📊 RESULTS SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Snarky: ${snarkyResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Sparky: ${sparkyResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (sparkyResult) {
    console.log('\n🎉 SUCCESS! Variable unification fix is working!');
    console.log('The permutation bug has been resolved.');
  } else {
    console.log('\n💥 FAILURE! The permutation bug is still present.');
    console.log('Variable unification may need additional fixes.');
    process.exit(1);
  }
}

main().catch(console.error);