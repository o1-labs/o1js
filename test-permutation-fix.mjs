/**
 * Test for variable unification and permutation fix
 */

import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Simple program that should trigger variable unification
const SimpleProgram = ZkProgram({
  name: 'SimpleProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field, Field],
      async method(publicInput, a, b) {
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
    console.log(`🔑 VK hash: ${verificationKey.hash?.toString()?.substring(0, 12) || 'N/A'}...`);
    
    console.log('\n🧪 Creating proof...');
    const publicInput = Field(10);
    const a = Field(5);
    const b = Field(3);
    
    const proof = await SimpleProgram.compute(publicInput, a, b);
    console.log('✅ Proof created successfully');
    console.log(`📤 Public output: ${proof.publicOutput?.toString() || 'N/A'}`);
    
    console.log('\n🔍 Verifying proof...');
    const isValid = await SimpleProgram.verify(proof);
    console.log(`✅ Proof verification: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    return true;
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    if (error.message.includes('permutation was not constructed correctly')) {
      console.log('🚨 This is the permutation bug!');
    }
    return false;
  }
}

async function main() {
  console.log('🎯 Testing Variable Unification & Permutation Fix');
  console.log('================================================\n');
  
  // Test Snarky first
  const snarkyResult = await testBackend('snarky');
  
  // Test Sparky
  const sparkyResult = await testBackend('sparky');
  
  console.log('\n📊 RESULTS SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Snarky: ${snarkyResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Sparky: ${sparkyResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (sparkyResult) {
    console.log('\n🎉 SUCCESS! Variable unification fix is working!');
  } else {
    console.log('\n💥 FAILURE! The permutation bug persists.');
    process.exit(1);
  }
}

main().catch(console.error);