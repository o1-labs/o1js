/**
 * Hash Chain with Sparky Backend
 * Direct test to get Sparky working with hash chains
 */

import { Field, Poseidon, ZkProgram, SelfProof, Provable } from 'o1js';
import { switchBackend, getCurrentBackend } from '../bindings.js';

// Simple hash chain program
const HashChainSparky = ZkProgram({
  name: 'hash-chain-sparky-test',
  publicInput: Field,
  publicOutput: Field,

  methods: {
    start: {
      privateInputs: [],
      async method(state: Field) {
        // Use Provable.log instead of console.log in provable code
        Provable.log('hashChain start:', state);
        return {
          publicOutput: Poseidon.hash([state]),
        };
      },
    },

    step: {
      privateInputs: [SelfProof],
      async method(state: Field, earlierProof: SelfProof<Field, Field>) {
        Provable.log('hashChain step:', state);
        earlierProof.verify();
        return {
          publicOutput: Poseidon.hash([state, earlierProof.publicOutput]),
        };
      },
    },
  },
});

async function testWithSnarky() {
  console.log('\n🔗 Testing Hash Chain with Snarky (Baseline)');
  console.log('='.repeat(50));
  
  // Ensure we're using Snarky
  await switchBackend('snarky');
  console.log(`✅ Backend: ${getCurrentBackend()}`);
  
  console.log('\n📊 Compiling with Snarky...');
  console.time('⏱️  Snarky compile');
  const { verificationKey } = await HashChainSparky.compile();
  console.timeEnd('⏱️  Snarky compile');
  
  console.log('\n🚀 Proving with Snarky...');
  console.time('⏱️  Snarky start proof');
  let proof = await HashChainSparky.start(Field(10));
  console.timeEnd('⏱️  Snarky start proof');
  
  console.time('⏱️  Snarky step proof');
  proof = await HashChainSparky.step(Field(20), proof);
  console.timeEnd('⏱️  Snarky step proof');
  
  console.log('✅ Snarky hash chain completed');
  
  const isValid = await HashChainSparky.verify(proof);
  console.log(`✅ Snarky proof valid: ${isValid}`);
  
  return {
    backend: 'Snarky',
    valid: isValid,
    finalOutput: proof.publicOutput.toString()
  };
}

async function testWithSparky() {
  console.log('\n⚡ Testing Hash Chain with Sparky');
  console.log('='.repeat(50));
  
  try {
    // Switch to Sparky
    await switchBackend('sparky');
    console.log(`✅ Backend: ${getCurrentBackend()}`);
    
    console.log('\n📊 Compiling with Sparky...');
    console.time('⏱️  Sparky compile');
    const { verificationKey } = await HashChainSparky.compile();
    console.timeEnd('⏱️  Sparky compile');
    
    console.log('\n🚀 Proving with Sparky...');
    console.time('⏱️  Sparky start proof');
    let proof = await HashChainSparky.start(Field(10));
    console.timeEnd('⏱️  Sparky start proof');
    
    console.time('⏱️  Sparky step proof');
    proof = await HashChainSparky.step(Field(20), proof);
    console.timeEnd('⏱️  Sparky step proof');
    
    console.log('✅ Sparky hash chain completed');
    
    const isValid = await HashChainSparky.verify(proof);
    console.log(`✅ Sparky proof valid: ${isValid}`);
    
    return {
      backend: 'Sparky',
      valid: isValid,
      finalOutput: proof.publicOutput.toString()
    };
    
  } catch (error) {
    console.error('❌ Sparky test failed:', error.message);
    return {
      backend: 'Sparky',
      valid: false,
      error: error.message
    };
  }
}

async function main() {
  try {
    console.log('🎯 Hash Chain Backend Comparison');
    console.log('================================');
    
    // Test Snarky first (baseline)
    const snarkyResult = await testWithSnarky();
    
    // Test Sparky
    const sparkyResult = await testWithSparky();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL COMPARISON RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\n🔵 Snarky Results:`);
    console.log(`   • Valid: ${snarkyResult.valid}`);
    console.log(`   • Output: ${snarkyResult.finalOutput}`);
    
    console.log(`\n⚡ Sparky Results:`);
    console.log(`   • Valid: ${sparkyResult.valid}`);
    if (sparkyResult.error) {
      console.log(`   • Error: ${sparkyResult.error}`);
    } else {
      console.log(`   • Output: ${sparkyResult.finalOutput}`);
    }
    
    if (snarkyResult.valid && sparkyResult.valid) {
      const outputMatch = snarkyResult.finalOutput === sparkyResult.finalOutput;
      console.log(`\n🔍 Output Match: ${outputMatch ? '✅ YES' : '❌ NO'}`);
      
      if (outputMatch) {
        console.log('\n🎉 SUCCESS! Sparky produces identical results to Snarky!');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

main();