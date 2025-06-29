/**
 * Test if Sparky can actually generate and verify proofs
 */

import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testProofGeneration() {
  console.log('🔍 Testing proof generation and verification with Sparky...');
  
  // Create a simple program
  const ProofTestProgram = ZkProgram({
    name: 'proofTest',
    publicInput: Field,
    methods: {
      square: {
        privateInputs: [Field],
        async method(publicInput: Field, x: Field) {
          const result = x.mul(x);
          result.assertEquals(publicInput);
        },
      },
    },
  });
  
  await initializeBindings();
  
  try {
    console.log('\n🔨 Testing with Snarky backend (reference)...');
    console.log('Current backend:', getCurrentBackend());
    
    const { verificationKey: snarkyVK } = await ProofTestProgram.compile();
    console.log('✅ Snarky compilation succeeded');
    
    try {
      console.log('Attempting proof generation with Snarky...');
      const snarkyProof = await ProofTestProgram.square(Field(25), Field(5));
      console.log('✅ Snarky proof generation succeeded');
      console.log('Proof type:', typeof snarkyProof);
      console.log('Proof has verify method:', typeof snarkyProof.verify === 'function');
      
      try {
        const snarkyVerified = await snarkyProof.verify();
        console.log('✅ Snarky proof verification:', snarkyVerified);
      } catch (verifyError) {
        console.log('❌ Snarky proof verification failed:', verifyError.message);
      }
      
    } catch (proofError) {
      console.log('❌ Snarky proof generation failed:', proofError.message);
    }
    
    console.log('\n🔨 Testing with Sparky backend...');
    await switchBackend('sparky');
    console.log('Current backend:', getCurrentBackend());
    
    const { verificationKey: sparkyVK } = await ProofTestProgram.compile();
    console.log('✅ Sparky compilation succeeded');
    
    try {
      console.log('Attempting proof generation with Sparky...');
      const sparkyProof = await ProofTestProgram.square(Field(25), Field(5));
      console.log('✅ Sparky proof generation succeeded');
      console.log('Proof type:', typeof sparkyProof);
      console.log('Proof has verify method:', typeof sparkyProof.verify === 'function');
      
      try {
        const sparkyVerified = await sparkyProof.verify();
        console.log('✅ Sparky proof verification:', sparkyVerified);
        
        console.log('\n🎉 PROOF SYSTEM INTEGRATION WORKS - Problem 5 is FALSE');
        
      } catch (verifyError) {
        console.log('❌ Sparky proof verification failed:', verifyError.message);
        console.log('📋 This confirms partial proof system integration');
      }
      
    } catch (proofError) {
      console.log('❌ Sparky proof generation failed:', proofError.message);
      
      if (proofError.message.includes('not implemented') || 
          proofError.message.includes('Pickles') ||
          proofError.message.includes('proof generation')) {
        console.log('📋 This confirms MISSING PROOF SYSTEM INTEGRATION');
      } else {
        console.log('📋 Error suggests other issues, not necessarily missing integration');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during proof test:', error.message);
  }
}

testProofGeneration().catch(console.error);