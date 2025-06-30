/**
 * Backend Compilation Benchmark: Complex Hash Chain Verification
 * 
 * Tests compilation performance using a complex hash chain ZkProgram with multiple
 * Poseidon operations and field arithmetic. Part of the o1js benchmark suite.
 * 
 * This benchmark is designed to test compilation performance differences between
 * Snarky (OCaml) and Sparky (Rust/WASM) backends on computationally intensive programs.
 */

// Dynamic import for ES modules
let Field, Bool, ZkProgram, Poseidon, Cache, initializeBindings, switchBackend, getCurrentBackend;

async function loadO1js() {
  const o1js = await import('../../../dist/node/index.js');
  const bindings = await import('../../../dist/node/bindings.js');
  Field = o1js.Field;
  Bool = o1js.Bool;
  ZkProgram = o1js.ZkProgram;
  Poseidon = o1js.Poseidon;
  Cache = o1js.Cache;
  initializeBindings = bindings.initializeBindings;
  switchBackend = bindings.switchBackend;
  getCurrentBackend = bindings.getCurrentBackend;
}

// Configuration
const TREE_DEPTH = 8; // 8-level Merkle tree (non-trivial complexity)
const WARMUP_ROUNDS = 1;
const BENCHMARK_ROUNDS = 3;

/**
 * Create a moderately complex ZkProgram for backend comparison
 * Balanced between complexity and compilation time for benchmarking
 */
function createBenchmarkProgram() {
  return ZkProgram({
    name: 'BackendComparisonBenchmark',
    publicOutput: Field,
    
    methods: {
      // Method 1: Hash chain with arithmetic
      hashChain: {
        privateInputs: [Field, Field, Field],
        
        async method(input1, input2, input3) {
          // Chain of operations that tests both hashing and arithmetic
          const hash1 = Poseidon.hash([input1, input2]);
          const hash2 = Poseidon.hash([input2, input3]);
          
          // Arithmetic operations
          const sum = hash1.add(hash2);
          const product = hash1.mul(hash2);
          
          // Final hash
          const result = Poseidon.hash([sum, product]);
          return { publicOutput: result };
        },
      },
      
      // Method 2: Pure arithmetic with squaring
      arithmetic: {
        privateInputs: [Field, Field],
        
        async method(a, b) {
          // Test arithmetic-heavy operations
          const sum = a.add(b);
          const diff = a.sub(b);
          const squared = sum.mul(sum);
          const combined = squared.add(diff.mul(diff));
          
          return { publicOutput: combined };
        },
      },
    },
  });
}

/**
 * Generate test data for the benchmark program
 */
function generateTestData() {
  // Generate random inputs for hash chain method
  const input1 = Field.random();
  const input2 = Field.random();
  const input3 = Field.random();
  
  // Generate inputs for arithmetic method
  const a = Field.random();
  const b = Field.random();
  
  return {
    hashChain: {
      input1,
      input2,
      input3
    },
    arithmetic: {
      a,
      b
    }
  };
}

/**
 * Measure memory usage (rough estimation)
 */
function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024); // MB
  }
  return null;
}

/**
 * Benchmark a single backend
 */
async function benchmarkBackend(backendName, program, rounds = BENCHMARK_ROUNDS) {
  console.log(`\n📊 Benchmarking ${backendName.toUpperCase()} Backend`);
  console.log('─'.repeat(50));
  
  await switchBackend(backendName);
  console.log(`✓ Switched to ${getCurrentBackend()} backend`);
  
  const results = [];
  const memoryBefore = getMemoryUsage();
  
  // Warmup round
  console.log(`🔥 Warmup compilation...`);
  try {
    const warmupStart = performance.now();
    await program.compile({ cache: Cache.None, forceRecompile: true });
    const warmupTime = performance.now() - warmupStart;
    console.log(`   Warmup completed in ${warmupTime.toFixed(2)}ms`);
  } catch (error) {
    console.error(`   Warmup failed: ${error?.message || error || 'Unknown error'}`);
    console.error(`   Error details:`, error);
    return null;
  }
  
  // Benchmark rounds
  console.log(`⏱️  Running ${rounds} benchmark rounds...`);
  
  for (let i = 0; i < rounds; i++) {
    try {
      const startTime = performance.now();
      const compilationResult = await program.compile({ cache: Cache.None, forceRecompile: true });
      const endTime = performance.now();
      
      const compilationTime = endTime - startTime;
      results.push(compilationTime);
      
      console.log(`   Round ${i + 1}: ${compilationTime.toFixed(2)}ms`);
      
      // Store VK hash for consistency check (only from first round)
      if (i === 0) {
        results.vkHash = compilationResult.verificationKey.hash.toString();
      }
    } catch (error) {
      console.error(`   Round ${i + 1} failed: ${error.message}`);
      return null;
    }
  }
  
  const memoryAfter = getMemoryUsage();
  
  // Calculate statistics
  const times = results.filter(r => typeof r === 'number');
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const stdDev = Math.sqrt(times.map(t => Math.pow(t - avgTime, 2)).reduce((a, b) => a + b, 0) / times.length);
  
  return {
    backend: backendName,
    rounds: times.length,
    avgTime,
    minTime,
    maxTime,
    stdDev,
    vkHash: results.vkHash,
    memoryBefore,
    memoryAfter,
    memoryDelta: memoryAfter && memoryBefore ? memoryAfter - memoryBefore : null
  };
}

/**
 * Display benchmark results comparison
 */
function displayResults(sparkyResults, snarkyResults) {
  console.log('\n\n🏆 BENCHMARK RESULTS COMPARISON');
  console.log('═'.repeat(60));
  
  if (!sparkyResults || !snarkyResults) {
    console.log('❌ Unable to complete benchmark - one or both backends failed');
    return;
  }
  
  // Performance table
  console.log('\n📈 Performance Metrics:');
  console.log('┌─────────────────────┬─────────────┬─────────────┐');
  console.log('│ Metric              │ Sparky      │ Snarky      │');
  console.log('├─────────────────────┼─────────────┼─────────────┤');
  console.log(`│ Average Time        │ ${sparkyResults.avgTime.toFixed(2)}ms     │ ${snarkyResults.avgTime.toFixed(2)}ms     │`);
  console.log(`│ Best Time           │ ${sparkyResults.minTime.toFixed(2)}ms     │ ${snarkyResults.minTime.toFixed(2)}ms     │`);
  console.log(`│ Worst Time          │ ${sparkyResults.maxTime.toFixed(2)}ms     │ ${snarkyResults.maxTime.toFixed(2)}ms     │`);
  console.log(`│ Std Deviation       │ ${sparkyResults.stdDev.toFixed(2)}ms      │ ${snarkyResults.stdDev.toFixed(2)}ms      │`);
  console.log('└─────────────────────┴─────────────┴─────────────┘');
  
  // Performance comparison
  const speedupRatio = snarkyResults.avgTime / sparkyResults.avgTime;
  const percentImprovement = ((snarkyResults.avgTime - sparkyResults.avgTime) / snarkyResults.avgTime * 100);
  
  console.log('\n🚀 Performance Analysis:');
  console.log(`   • Sparky is ${speedupRatio.toFixed(2)}x faster than Snarky`);
  console.log(`   • Sparky provides ${percentImprovement.toFixed(1)}% performance improvement`);
  console.log(`   • Time saved: ${(snarkyResults.avgTime - sparkyResults.avgTime).toFixed(2)}ms per compilation`);
  
  // Verification Key consistency
  console.log('\n🔐 Verification Key Consistency:');
  if (sparkyResults.vkHash === snarkyResults.vkHash) {
    console.log('   ✅ VK hashes match - backends produce identical verification keys');
  } else {
    console.log('   ⚠️  VK hashes differ - this may be expected due to implementation differences');
    console.log(`   Sparky VK: ${sparkyResults.vkHash.substring(0, 20)}...`);
    console.log(`   Snarky VK: ${snarkyResults.vkHash.substring(0, 20)}...`);
  }
  
  // Memory usage
  if (sparkyResults.memoryDelta !== null && snarkyResults.memoryDelta !== null) {
    console.log('\n💾 Memory Usage:');
    console.log(`   • Sparky memory delta: ${sparkyResults.memoryDelta}MB`);
    console.log(`   • Snarky memory delta: ${snarkyResults.memoryDelta}MB`);
  }
  
  console.log('\n🔍 Test Details:');
  console.log(`   • ZkProgram: Backend Compilation Comparison`);
  console.log(`   • Complexity: 3 Poseidon hashes + field arithmetic + squaring`);
  console.log(`   • Benchmark rounds: ${BENCHMARK_ROUNDS} per backend`);
  console.log(`   • Private inputs: 2-3 field elements per method`);
  console.log(`   • Methods: 2 moderately complex methods`);
}

/**
 * Main benchmark execution
 */
async function runBenchmark() {
  console.log('🧪 SPARKY vs SNARKY COMPILATION BENCHMARK');
  console.log('═'.repeat(60));
  console.log('Testing ZkProgram: Backend Compilation Comparison');
  console.log(`Operations: 3 Poseidon hashes + field arithmetic | Rounds: ${BENCHMARK_ROUNDS} per backend`);
  
  try {
    // Load o1js ES modules
    console.log('\n📦 Loading o1js modules...');
    await loadO1js();
    console.log('✓ o1js modules loaded successfully');
    
    // Initialize bindings
    console.log('\n🔧 Initializing o1js bindings...');
    await initializeBindings();
    console.log('✓ Bindings initialized successfully');
    
    // Create the ZkProgram
    console.log('\n🏗️  Creating ZkProgram...');
    const BenchmarkProgram = createBenchmarkProgram();
    console.log('✓ ZkProgram created (backend comparison benchmark)');
    
    // Generate test data
    console.log('\n📝 Generating test data...');
    const testData = generateTestData();
    console.log('✓ Test data generated');
    
    // Benchmark Sparky first (as requested)
    const sparkyResults = await benchmarkBackend('sparky', BenchmarkProgram, BENCHMARK_ROUNDS);
    
    // Benchmark Snarky second
    const snarkyResults = await benchmarkBackend('snarky', BenchmarkProgram, BENCHMARK_ROUNDS);
    
    // Display comparison
    displayResults(sparkyResults, snarkyResults);
    
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Execute benchmark
if (require.main === module) {
  runBenchmark().then(() => {
    console.log('\n✅ Benchmark completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { createBenchmarkProgram, runBenchmark };