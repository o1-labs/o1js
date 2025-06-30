/**
 * Hash Chain with Sparky Backend - Native Node.js version
 */

async function loadModules() {
  const o1js = await import('../../../dist/node/index.js');
  const bindings = await import('../../../dist/node/bindings.js');
  return {
    Field: o1js.Field,
    Poseidon: o1js.Poseidon,
    ZkProgram: o1js.ZkProgram,
    SelfProof: o1js.SelfProof,
    Provable: o1js.Provable,
    Cache: o1js.Cache,
    switchBackend: bindings.switchBackend,
    getCurrentBackend: bindings.getCurrentBackend
  };
}

let Field, Poseidon, ZkProgram, SelfProof, Provable, Cache, switchBackend, getCurrentBackend;
let HashChainSparky;

async function createHashChainProgram() {
  // Simple hash chain program
  HashChainSparky = ZkProgram({
    name: 'hash-chain-sparky-test',
    publicInput: Field,
    publicOutput: Field,

    methods: {
      start: {
        privateInputs: [],
        async method(state) {
          return {
            publicOutput: Poseidon.hash([state]),
          };
        },
      },

      step: {
        privateInputs: [SelfProof],
        async method(state, earlierProof) {
          earlierProof.verify();
          return {
            publicOutput: Poseidon.hash([state, earlierProof.publicOutput]),
          };
        },
      },
    },
  });
}

async function testWithSnarky() {
  console.log('\n🔗 Testing Hash Chain with Snarky (Baseline)');
  console.log('='.repeat(50));
  
  // Ensure we're using Snarky
  await switchBackend('snarky');
  console.log(`✅ Backend: ${getCurrentBackend()}`);
  
  console.log('\n📊 Compiling with Snarky...');
  console.time('⏱️  Snarky compile');
  const { verificationKey } = await HashChainSparky.compile({ cache: Cache.None, forceRecompile: true });
  console.timeEnd('⏱️  Snarky compile');
  
  console.log('\n🚀 Proving with Snarky...');
  console.time('⏱️  Snarky start proof');
  let result = await HashChainSparky.start(Field(10));
  console.timeEnd('⏱️  Snarky start proof');
  
  console.time('⏱️  Snarky step proof');
  result = await HashChainSparky.step(Field(20), result.proof);
  console.timeEnd('⏱️  Snarky step proof');
  
  let proof = result.proof;
  
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
    const { verificationKey } = await HashChainSparky.compile({ cache: Cache.None, forceRecompile: true });
    console.timeEnd('⏱️  Sparky compile');
    
    console.log('\n🚀 Proving with Sparky...');
    console.time('⏱️  Sparky start proof');
    let result = await HashChainSparky.start(Field(10));
    console.timeEnd('⏱️  Sparky start proof');
    
    console.time('⏱️  Sparky step proof');
    result = await HashChainSparky.step(Field(20), result.proof);
    console.timeEnd('⏱️  Sparky step proof');
    
    let proof = result.proof;
    
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
    
    // Load modules first
    const modules = await loadModules();
    Object.assign(global, modules);
    ({ Field, Poseidon, ZkProgram, SelfProof, Provable, Cache, switchBackend, getCurrentBackend } = modules);
    
    // Create the program
    await createHashChainProgram();
    
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