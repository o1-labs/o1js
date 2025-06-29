/**
 * Simple test of proof integration
 */

import { Field, ZkProgram, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testSimpleProof() {
  console.log('🔍 Simple proof integration test...');
  
  const SimpleProgram = ZkProgram({
    name: 'simple',
    methods: {
      test: {
        privateInputs: [Field],
        async method(x: Field) {
          x.assertEquals(Field(5));
        },
      },
    },
  });
  
  await initializeBindings();
  console.log('\n🔨 Testing Snarky proof...');
  const { verificationKey } = await SimpleProgram.compile();
  console.log('✅ Snarky compilation done');
  
  try {
    const proof = await SimpleProgram.test(Field(5));
    console.log('✅ Snarky proof generation works');
    console.log('Proof object:', Object.keys(proof));
    
    // Try to verify
    if (typeof proof.verify === 'function') {
      const verified = await proof.verify();
      console.log('✅ Snarky verification:', verified);
    } else {
      console.log('❌ No verify method on proof');
    }
  } catch (error) {
    console.log('❌ Snarky proof failed:', error.message);
  }
  
  console.log('\n🔨 Testing Sparky proof...');
  await switchBackend('sparky');
  
  try {
    const { verificationKey: sparkyVK } = await SimpleProgram.compile();
    console.log('✅ Sparky compilation done');
    
    const sparkyProof = await SimpleProgram.test(Field(5));
    console.log('✅ Sparky proof generation works');
    console.log('Sparky proof object:', Object.keys(sparkyProof));
    
    if (typeof sparkyProof.verify === 'function') {
      const verified = await sparkyProof.verify();
      console.log('✅ Sparky verification:', verified);
    } else {
      console.log('❌ No verify method on Sparky proof');
    }
    
    console.log('\n🎉 PROOF SYSTEM INTEGRATION APPEARS TO WORK');
    
  } catch (error) {
    console.log('❌ Sparky proof failed:', error.message);
    
    if (error.message.includes('not implemented') || 
        error.message.includes('proof generation')) {
      console.log('📋 Confirms MISSING PROOF SYSTEM INTEGRATION');
    }
  }
}

testSimpleProof().catch(console.error);