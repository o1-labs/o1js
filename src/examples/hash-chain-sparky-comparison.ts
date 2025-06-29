/**
 * Hash Chain ZkProgram comparison between Snarky and Sparky backends
 * Tests runtime performance differences
 */

import { Field, Poseidon, ZkProgram, SelfProof, verify } from 'o1js';
import { switchBackend, getCurrentBackend } from '../bindings.js';

// Same hash chain program as in hash-chain.ts
const HashChain = ZkProgram({
  name: 'hash-chain-comparison',
  publicInput: Field,
  publicOutput: Field,

  methods: {
    start: {
      privateInputs: [],
      async method(state: Field) {
        console.log('hashChain (start method)', state.toString());
        return {
          publicOutput: Poseidon.hash([state]),
        };
      },
    },

    step: {
      privateInputs: [SelfProof],
      async method(state: Field, earlierProof: SelfProof<Field, Field>) {
        console.log('hashChain (step method)', state.toString());
        earlierProof.verify();
        return {
          publicOutput: Poseidon.hash([state, earlierProof.publicOutput]),
        };
      },
    },
  },
});

async function testHashChainWithBackend(backendName: string) {
  console.log(`\n🔗 Testing Hash Chain with ${backendName} Backend`);
  console.log('='.repeat(50));
  
  // Switch to specified backend
  console.log(`📋 Current backend: ${getCurrentBackend()}`);
  if (backendName.toLowerCase() === 'sparky') {
    console.log('🔄 Switching to Sparky backend...');
    await switchBackend('sparky');
  } else {
    console.log('🔄 Using default Snarky backend...');
    await switchBackend('snarky');
  }
  console.log(`✅ Active backend: ${getCurrentBackend()}`);

  console.log('\n📊 Compiling HashChain program...');
  console.time(`⏱️  ${backendName} compile`);
  const { verificationKey } = await HashChain.compile();
  console.timeEnd(`⏱️  ${backendName} compile`);

  // Test the hash chain with multiple steps
  const states = [Field(10), Field(40), Field(70), Field(100)];
  
  console.log('\n🚀 Starting hash chain proofs...');
  
  // Start proof
  console.log(`hashChain (start proving) ${states[0].toString()}`);
  console.time(`⏱️  ${backendName} start proof`);
  let proof = await HashChain.start(states[0]);
  console.timeEnd(`⏱️  ${backendName} start proof`);

  // Step proofs
  for (let i = 1; i < states.length; i++) {
    console.log(`hashChain (step proving) ${states[i].toString()}`);
    console.time(`⏱️  ${backendName} step ${i} proof`);
    proof = await HashChain.step(states[i], proof);
    console.timeEnd(`⏱️  ${backendName} step ${i} proof`);
  }

  console.log(`\n✅ Finished ${backendName} hash chain proof`);
  
  // Verify the final proof
  console.log('🔍 Verifying final proof...');
  console.time(`⏱️  ${backendName} verify`);
  const isValid = await HashChain.verify(proof);
  console.timeEnd(`⏱️  ${backendName} verify`);
  
  console.log(`✅ ${backendName} proof valid: ${isValid}`);
  console.log(`📈 Final output: ${proof.publicOutput.toString()}`);
  
  return {
    backend: backendName,
    valid: isValid,
    finalOutput: proof.publicOutput.toString()
  };
}

async function main() {
  try {
    console.log('🚀 Hash Chain Backend Comparison Test');
    console.log('=====================================');
    
    // Test with Snarky first
    const snarkyResult = await testHashChainWithBackend('Snarky');
    
    console.log('\n' + '='.repeat(70));
    console.log('🔄 SWITCHING TO SPARKY BACKEND');
    console.log('='.repeat(70));
    
    // Test with Sparky
    const sparkyResult = await testHashChainWithBackend('Sparky');
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 PERFORMANCE COMPARISON RESULTS');
    console.log('='.repeat(70));
    
    console.log('\n✅ Snarky Results:');
    console.log(`   • Proof valid: ${snarkyResult.valid}`);
    console.log(`   • Final output: ${snarkyResult.finalOutput}`);
    
    console.log('\n✅ Sparky Results:');
    console.log(`   • Proof valid: ${sparkyResult.valid}`);
    console.log(`   • Final output: ${sparkyResult.finalOutput}`);
    
    // Compare outputs
    const outputsMatch = snarkyResult.finalOutput === sparkyResult.finalOutput;
    console.log(`\n🔍 Output consistency: ${outputsMatch ? 'MATCH ✅' : 'MISMATCH ❌'}`);
    
    if (outputsMatch && snarkyResult.valid && sparkyResult.valid) {
      console.log('\n🎉 BOTH BACKENDS SUCCESSFUL!');
      console.log('✅ Sparky backend produces identical results to Snarky');
      console.log('🚀 Hash chain ZkPrograms work with both backends');
    } else {
      console.log('\n⚠️  Results differ between backends');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

main();