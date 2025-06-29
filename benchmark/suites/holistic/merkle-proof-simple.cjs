/**
 * Simplified Merkle Membership Proof Benchmark
 * Direct node execution without module resolution issues
 */

const { 
  Field, Bool, Poseidon, Struct, Provable, Gadgets, ZkProgram, SelfProof,
  switchBackend, getCurrentBackend 
} = require('./dist/node/index.cjs');

// Inline the MerkleWitness8 class
class MerkleWitness8 extends Struct({
  isLeft: Provable.Array(Bool, 8),
  siblings: Provable.Array(Field, 8),
}) {
  calculateRoot(leaf) {
    let current = leaf;
    
    for (let i = 0; i < 8; i++) {
      const isLeft = this.isLeft[i];
      const sibling = this.siblings[i];
      
      const left = Provable.if(isLeft, current, sibling);
      const right = Provable.if(isLeft, sibling, current);
      
      current = Poseidon.hash([left, right]);
    }
    
    return current;
  }
}

// Inline the proof structures
class MerkleProofInput extends Struct({
  leaf: Field,
  index: Field,
  root: Field,
  witness: MerkleWitness8,
}) {}

class BatchVerificationOutput extends Struct({
  verifiedRoot: Field,
  leafSum: Field,
  leafCount: Field,
  minLeaf: Field,
  maxLeaf: Field,
}) {}

// Create the ZkProgram
const MerkleMembershipProgram = ZkProgram({
  name: 'merkle-membership-complex-v4', // Changed name to force recompilation
  publicInput: MerkleProofInput,
  publicOutput: BatchVerificationOutput,
  
  methods: {
    verifySingleLeaf: {
      privateInputs: [Field, Field],
      async method(input, salt, expectedChecksum) {
        // Range checks
        Gadgets.rangeCheck32(input.leaf);
        Gadgets.rangeCheck16(input.index);
        
        // Calculate merkle root
        const calculatedRoot = input.witness.calculateRoot(input.leaf);
        calculatedRoot.assertEquals(input.root);
        
        // Additional validation
        const leafChecksum = Poseidon.hash([input.leaf, salt, input.index]);
        leafChecksum.assertEquals(expectedChecksum);
        
        // Complex computation
        const processedLeaf = Gadgets.rotate32(input.leaf, 5, 'left');
        const xorResult = Gadgets.xor(processedLeaf, Field(0xABCDEF), 24);
        
        return {
          publicOutput: {
            verifiedRoot: calculatedRoot,
            leafSum: input.leaf,
            leafCount: Field(1),
            minLeaf: input.leaf,
            maxLeaf: input.leaf,
          }
        };
      },
    },
  },
});

// Disable cache
function createNullCache() {
  return {
    read: () => undefined,
    write: () => {},
    canWrite: false,
    debug: false
  };
}

async function runBenchmark(backend, program) {
  console.log(`\n🔧 Testing ${backend} Backend`);
  console.log('='.repeat(60));
  
  // Switch to specified backend
  await switchBackend(backend.toLowerCase());
  console.log(`✅ Active backend: ${getCurrentBackend()}`);
  
  // Run compilation 3 times
  const runs = [];
  
  for (let i = 1; i <= 3; i++) {
    console.log(`\n📊 Run ${i}/3:`);
    
    const startTime = process.hrtime.bigint();
    
    try {
      console.time(`⏱️  ${backend} compilation`);
      await program.compile({ cache: createNullCache() });
      console.timeEnd(`⏱️  ${backend} compilation`);
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      
      console.log(`✅ Compilation successful: ${(durationMs/1000).toFixed(2)}s`);
      runs.push(durationMs);
      
      if (global.gc) global.gc();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Compilation failed:`, error.message);
      return { backend, success: false, error: error.message };
    }
  }
  
  const avgTime = runs.reduce((a, b) => a + b, 0) / runs.length;
  const minTime = Math.min(...runs);
  const maxTime = Math.max(...runs);
  
  return { backend, success: true, avgTime, minTime, maxTime, runs };
}

async function main() {
  try {
    console.log('🚀 Complex Merkle Membership Proof - Compilation Benchmark');
    console.log('=========================================================');
    console.log('Program features:');
    console.log('• Merkle tree membership verification');
    console.log('• Range checks and bitwise operations');
    console.log('• Complex hash chains\n');
    
    // Test Snarky
    console.log('\n🔵 Phase 1: Snarky Backend (No Cache)');
    const snarkyResults = await runBenchmark('Snarky', MerkleMembershipProgram);
    
    // Clear state
    console.log('\n🧹 Clearing state between backends...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    if (global.gc) global.gc();
    
    // Test Sparky
    console.log('\n⚡ Phase 2: Sparky Backend (No Cache)');
    const sparkyResults = await runBenchmark('Sparky', MerkleMembershipProgram);
    
    // Print results
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTS');
    console.log('='.repeat(80));
    
    if (snarkyResults.success && sparkyResults.success) {
      console.log('\n📈 Average Compilation Times:');
      console.log(`🔵 Snarky: ${(snarkyResults.avgTime/1000).toFixed(2)}s`);
      console.log(`⚡ Sparky: ${(sparkyResults.avgTime/1000).toFixed(2)}s`);
      console.log(`🚀 Speedup: ${(snarkyResults.avgTime/sparkyResults.avgTime).toFixed(2)}x`);
    }
    
    console.log('\n✅ Benchmark completed!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();