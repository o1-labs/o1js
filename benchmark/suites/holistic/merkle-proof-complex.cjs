/**
 * Benchmark for Complex Merkle Membership Proof Program
 * Tests compilation performance of a sophisticated ZkProgram
 */

async function loadModules() {
  // Use require for CJS modules
  const { Field, Bool, Poseidon, Struct, Provable, Gadgets, ZkProgram, switchBackend, getCurrentBackend } = require('../../../dist/node/index.cjs');
  const { MerkleMembershipProgram } = await import('../../../dist/examples/zkprogram/merkle-membership-proof.js');
  
  return {
    Field,
    Bool,
    Poseidon,
    Struct,
    Provable,
    Gadgets,
    switchBackend,
    getCurrentBackend,
    MerkleMembershipProgram
  };
}

// Disable cache for accurate benchmarking
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
  
  const { switchBackend, getCurrentBackend } = await loadModules();
  
  // Switch to specified backend
  await switchBackend(backend.toLowerCase());
  console.log(`✅ Active backend: ${getCurrentBackend()}`);
  
  // Run compilation 3 times to get average
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
      
      // Clear memory between runs
      if (global.gc) {
        global.gc();
      }
      
      // Wait between runs
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Compilation failed:`, error.message);
      return { backend, success: false, error: error.message };
    }
  }
  
  // Calculate statistics
  const avgTime = runs.reduce((a, b) => a + b, 0) / runs.length;
  const minTime = Math.min(...runs);
  const maxTime = Math.max(...runs);
  
  return {
    backend,
    success: true,
    avgTime,
    minTime,
    maxTime,
    runs,
  };
}

async function main() {
  try {
    console.log('🚀 Complex Merkle Membership Proof - Compilation Benchmark');
    console.log('=========================================================');
    console.log('Program features:');
    console.log('• Merkle tree membership verification with witness');
    console.log('• Recursive proof aggregation');
    console.log('• Cross-tree verification logic');
    console.log('• Extensive range checks and bitwise operations');
    console.log('• Complex hash chains and conditional logic\n');
    
    // Load all modules
    const modules = await loadModules();
    const { MerkleMembershipProgram } = modules;
    
    console.log('✅ Modules loaded successfully');
    
    // Ensure garbage collection is available
    if (!global.gc) {
      console.log('⚠️  Run with --expose-gc for better memory management');
    }
    
    // Test Snarky
    console.log('\n🔵 Phase 1: Snarky Backend (No Cache)');
    const snarkyResults = await runBenchmark('Snarky', MerkleMembershipProgram);
    
    // Clear state between backends
    console.log('\n🧹 Clearing state between backends...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    if (global.gc) global.gc();
    
    // Test Sparky
    console.log('\n⚡ Phase 2: Sparky Backend (No Cache)');
    const sparkyResults = await runBenchmark('Sparky', MerkleMembershipProgram);
    
    // Print results
    console.log('\n' + '='.repeat(80));
    console.log('📊 MERKLE MEMBERSHIP PROOF COMPILATION BENCHMARK RESULTS');
    console.log('='.repeat(80));
    
    if (snarkyResults.success && sparkyResults.success) {
      console.log('\n📈 Average Compilation Times (3 runs each):');
      console.log(`🔵 Snarky: ${(snarkyResults.avgTime/1000).toFixed(2)}s`);
      console.log(`⚡ Sparky: ${(sparkyResults.avgTime/1000).toFixed(2)}s`);
      console.log(`🚀 Speedup: ${(snarkyResults.avgTime/sparkyResults.avgTime).toFixed(2)}x`);
      console.log(`⏰ Time Saved: ${((snarkyResults.avgTime - sparkyResults.avgTime)/1000).toFixed(2)}s`);
      
      console.log('\n📊 Detailed Statistics:');
      console.log('| Backend | Min Time | Avg Time | Max Time | Std Dev |');
      console.log('|---------|----------|----------|----------|---------|');
      
      // Snarky stats
      const snarkyStdDev = Math.sqrt(
        snarkyResults.runs.reduce((sum, time) => sum + Math.pow(time - snarkyResults.avgTime, 2), 0) / snarkyResults.runs.length
      );
      console.log(`| Snarky  | ${(snarkyResults.minTime/1000).toFixed(2)}s | ${(snarkyResults.avgTime/1000).toFixed(2)}s | ${(snarkyResults.maxTime/1000).toFixed(2)}s | ${(snarkyStdDev/1000).toFixed(2)}s |`);
      
      // Sparky stats
      const sparkyStdDev = Math.sqrt(
        sparkyResults.runs.reduce((sum, time) => sum + Math.pow(time - sparkyResults.avgTime, 2), 0) / sparkyResults.runs.length
      );
      console.log(`| Sparky  | ${(sparkyResults.minTime/1000).toFixed(2)}s | ${(sparkyResults.avgTime/1000).toFixed(2)}s | ${(sparkyResults.maxTime/1000).toFixed(2)}s | ${(sparkyStdDev/1000).toFixed(2)}s |`);
      
      console.log('\n🎯 Program Complexity Analysis:');
      console.log('• 3 proof methods with different complexity levels');
      console.log('• ~100+ constraint operations per method');
      console.log('• Recursive proof verification');
      console.log('• Multiple hash computations and range checks');
      console.log('• Extensive bitwise operations');
      
      console.log('\n💡 Key Insights:');
      if (snarkyResults.avgTime / sparkyResults.avgTime > 3) {
        console.log(`🔥 Sparky shows EXCELLENT ${(snarkyResults.avgTime/sparkyResults.avgTime).toFixed(1)}x speedup for this complex program!`);
      } else if (snarkyResults.avgTime / sparkyResults.avgTime > 1.5) {
        console.log(`✅ Sparky provides solid ${(snarkyResults.avgTime/sparkyResults.avgTime).toFixed(1)}x speedup for complex merkle proofs`);
      } else {
        console.log(`⚖️  Performance is comparable between backends for this workload`);
      }
      
    } else {
      console.log('\n❌ Benchmark failed:');
      if (!snarkyResults.success) {
        console.log(`Snarky: ${snarkyResults.error}`);
      }
      if (!sparkyResults.success) {
        console.log(`Sparky: ${sparkyResults.error}`);
      }
    }
    
    console.log('\n✅ Benchmark completed!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();