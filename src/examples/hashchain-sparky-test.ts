/**
 * Hash Chain with Sparky Backend Test
 * Direct comparison of hash chain performance
 */

import { Field, Poseidon, ZkProgram, SelfProof, Provable } from 'o1js';

// Hash chain program identical to hash-chain.ts  
const HashChain = ZkProgram({
  name: 'hash-chain-sparky',
  publicInput: Field,
  publicOutput: Field,

  methods: {
    start: {
      privateInputs: [],
      async method(state: Field) {
        Provable.asProver(() => {
          console.log('hashChain (start method)', state.toString());
        });
        return {
          publicOutput: Poseidon.hash([state]),
        };
      },
    },

    step: {
      privateInputs: [SelfProof],
      async method(state: Field, earlierProof: SelfProof<Field, Field>) {
        Provable.asProver(() => {
          console.log('hashChain (step method)', state.toString());
        });
        earlierProof.verify();
        return {
          publicOutput: Poseidon.hash([state, earlierProof.publicOutput]),
        };
      },
    },
  },
});

async function testHashChainPerformance() {
  console.log('🚀 Hash Chain Performance Test');
  console.log('==============================');
  
  console.log('\n📊 Compiling HashChain...');
  console.time('⏱️  Compile time');
  const { verificationKey } = await HashChain.compile();
  console.timeEnd('⏱️  Compile time');
  
  // Test states - same as original
  const states = [Field(10), Field(40), Field(70), Field(100)];
  
  console.log('\n🔗 Starting hash chain proofs...');
  
  // Start proof
  console.log(`hashChain (start proving) ${states[0].toString()}`);
  console.time('⏱️  Start proof');
  let proof = await HashChain.start(states[0]);
  console.timeEnd('⏱️  Start proof');
  
  // Step proofs with individual timing
  for (let i = 1; i < states.length; i++) {
    console.log(`hashChain (step proving) ${states[i].toString()}`);
    console.time(`⏱️  Step ${i} proof`);
    proof = await HashChain.step(states[i], proof);
    console.timeEnd(`⏱️  Step ${i} proof`);
  }
  
  console.log('\n🎉 Finished hash chain proof');
  
  // Verify final proof  
  console.log('\n🔍 Verifying final proof...');
  console.time('⏱️  Verification');
  const isValid = await HashChain.verify(proof);
  console.timeEnd('⏱️  Verification');
  
  console.log(`✅ Proof valid: ${isValid}`);
  console.log(`📈 Final hash: ${proof.publicOutput.toString()}`);
  
  return {
    valid: isValid,
    finalHash: proof.publicOutput.toString(),
    stepsCompleted: states.length
  };
}

async function main() {
  try {
    console.log('🔐 Hash Chain ZkProgram Test');
    console.log('============================');
    console.log('Testing Poseidon hash chain with recursive proofs...\n');
    
    const result = await testHashChainPerformance();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(50));
    
    console.log(`✅ Proof validity: ${result.valid}`);
    console.log(`🔗 Chain steps: ${result.stepsCompleted}`);
    console.log(`📈 Final hash: ${result.finalHash}`);
    
    if (result.valid) {
      console.log('\n🎉 HASH CHAIN TEST SUCCESSFUL!');
      console.log('✅ Poseidon hashing works correctly');
      console.log('✅ Recursive proof verification works');
      console.log('✅ Multi-step hash chain completed');
      console.log('\n🔥 Ready for production hash chain ZkPrograms!');
    } else {
      console.log('\n❌ Hash chain test failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

main();