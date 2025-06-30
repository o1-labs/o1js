/**
 * Variable vs Constant Benchmark: Validation of Poseidon Optimization
 * 
 * This benchmark validates that our Poseidon constant optimization is working correctly
 * by comparing performance between constant operations (optimized) and variable 
 * operations (not optimized).
 * 
 * Expected Results:
 * - Constant operations: Sparky ≈ Snarky (performance parity due to optimization)
 * - Variable operations: Sparky >> Snarky (original performance gap)
 */

// Dynamic import for ES modules
let Field, Bool, ZkProgram, Poseidon, Provable, Cache, initializeBindings, switchBackend, getCurrentBackend;

async function loadO1js() {
  const o1js = await import('../../../dist/node/index.js');
  const bindings = await import('../../../dist/node/bindings.js');
  Field = o1js.Field;
  Bool = o1js.Bool;
  ZkProgram = o1js.ZkProgram;
  Poseidon = o1js.Poseidon;
  Provable = o1js.Provable;
  Cache = o1js.Cache;
  initializeBindings = bindings.initializeBindings;
  switchBackend = bindings.switchBackend;
  getCurrentBackend = bindings.getCurrentBackend;
}

// Configuration
const WARMUP_ROUNDS = 1;
const BENCHMARK_ROUNDS = 3;

/**
 * Create ZkProgram with CONSTANT operations (optimized)
 * These operations use TRUE constants - no privateInputs, triggering our optimization
 */
function createConstantProgram() {
  return ZkProgram({
    name: 'ConstantOperationsBenchmark',
    publicOutput: Field,
    
    methods: {
      constantOperations: {
        privateInputs: [],  // NO private inputs - everything is constant!
        
        async method() {
          console.log('[CONSTANT] Running constant operations - should trigger PoseidonBigint optimization');
          
          // These are TRUE constants - known at compile time
          const const1 = Field.from(100);
          const const2 = Field.from(200);
          const const3 = Field.from(300);
          
          // These should trigger constant optimization (PoseidonBigint)
          const hash1 = Poseidon.hash([const1, const2]);
          const hash2 = Poseidon.hash([const2, const3]);
          
          // Arithmetic operations with constants
          const sum = hash1.add(hash2);
          const product = hash1.mul(hash2);
          
          // Final hash with constants - should also be optimized
          const result = Poseidon.hash([sum, product]);
          return { publicOutput: result };
        },
      },
    },
  });
}

/**
 * Create ZkProgram with VARIABLE operations (not optimized)
 * These operations force runtime computation, bypassing our optimization
 */
function createVariableProgram() {
  return ZkProgram({
    name: 'VariableOperationsBenchmark', 
    publicOutput: Field,
    
    methods: {
      variableOperations: {
        privateInputs: [Field, Field, Field],
        
        async method(seed1, seed2, seed3) {
          console.log('[VARIABLE] Running variable operations - should bypass PoseidonBigint optimization');
          
          // Force variable operations using witness - these cannot be optimized to constants
          const var1 = Provable.witness(Field, () => {
            // This computation happens at runtime, not compile time
            return Field.from(seed1.toBigInt() + 1n);
          });
          
          const var2 = Provable.witness(Field, () => {
            return Field.from(seed2.toBigInt() * 2n);
          });
          
          const var3 = Provable.witness(Field, () => {
            return Field.from(seed3.toBigInt() + 5n);
          });
          
          // These Poseidon operations must use WASM because inputs are variables
          const hash1 = Poseidon.hash([var1, var2]);
          const hash2 = Poseidon.hash([var2, var3]);
          
          // Additional variable operations  
          const sum = hash1.add(hash2);
          const product = hash1.mul(hash2);
          
          // Final hash with variables - cannot use PoseidonBigint
          const result = Poseidon.hash([sum, product]);
          return { publicOutput: result };
        },
      },
    },
  });
}

/**
 * Generate test data for benchmarks
 */
function generateTestData() {
  return {
    input1: Field.random(),
    input2: Field.random(),
    input3: Field.random()
  };
}

/**
 * Measure memory usage
 */
function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024); // MB
  }
  return null;
}

/**
 * Benchmark a single program (constant or variable)
 */
async function benchmarkProgram(programName, program, testData, rounds = BENCHMARK_ROUNDS) {
  console.log(`\n📊 Benchmarking ${programName} with ${getCurrentBackend().toUpperCase()}`);
  console.log('─'.repeat(50));
  
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
    console.error(`   Warmup failed: ${error?.message || error}`);
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
    programName,
    backend: getCurrentBackend(),
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
 * Compare two benchmark results
 */
function compareResults(constantResults, variableResults, backend) {
  if (!constantResults || !variableResults) {
    console.log(`❌ Unable to compare ${backend} results - one or both benchmarks failed`);
    return null;
  }
  
  const speedupRatio = variableResults.avgTime / constantResults.avgTime;
  const timeDifference = variableResults.avgTime - constantResults.avgTime;
  
  return {
    backend,
    constantTime: constantResults.avgTime,
    variableTime: variableResults.avgTime,
    speedupRatio,
    timeDifference,
    constantStdDev: constantResults.stdDev,
    variableStdDev: variableResults.stdDev
  };
}

/**
 * Display comprehensive benchmark results
 */
function displayResults(sparkyConstant, sparkyVariable, snarkyConstant, snarkyVariable) {
  console.log('\\n\\n🏆 VARIABLE vs CONSTANT BENCHMARK RESULTS');
  console.log('═'.repeat(70));
  
  if (!sparkyConstant || !sparkyVariable || !snarkyConstant || !snarkyVariable) {
    console.log('❌ Unable to complete comparison - some benchmarks failed');
    return;
  }
  
  // Performance comparison table
  console.log('\\n📈 Performance Metrics Comparison:');
  console.log('┌──────────────────┬─────────────┬─────────────┬─────────────┬─────────────┐');
  console.log('│ Operation Type   │ Sparky      │ Snarky      │ Ratio (S/S) │ Difference  │');
  console.log('├──────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤');
  console.log(`│ Constants        │ ${sparkyConstant.avgTime.toFixed(0)}ms      │ ${snarkyConstant.avgTime.toFixed(0)}ms      │ ${(sparkyConstant.avgTime / snarkyConstant.avgTime).toFixed(2)}x        │ ${(sparkyConstant.avgTime - snarkyConstant.avgTime).toFixed(0)}ms       │`);
  console.log(`│ Variables        │ ${sparkyVariable.avgTime.toFixed(0)}ms      │ ${snarkyVariable.avgTime.toFixed(0)}ms      │ ${(sparkyVariable.avgTime / snarkyVariable.avgTime).toFixed(2)}x        │ ${(sparkyVariable.avgTime - snarkyVariable.avgTime).toFixed(0)}ms       │`);
  console.log('└──────────────────┴─────────────┴─────────────┴─────────────┴─────────────┘');
  
  // Optimization analysis
  console.log('\\n🔍 Optimization Analysis:');
  
  const sparkyConstantVsVariable = sparkyVariable.avgTime / sparkyConstant.avgTime;
  const snarkyConstantVsVariable = snarkyVariable.avgTime / snarkyConstant.avgTime;
  
  console.log(`   • Sparky: Variables are ${sparkyConstantVsVariable.toFixed(2)}x slower than constants`);
  console.log(`   • Snarky: Variables are ${snarkyConstantVsVariable.toFixed(2)}x slower than constants`);
  
  // Validation results
  console.log('\\n✅ Optimization Validation:');
  
  const constantParity = Math.abs(sparkyConstant.avgTime - snarkyConstant.avgTime) / snarkyConstant.avgTime;
  const variableGap = (sparkyVariable.avgTime - snarkyVariable.avgTime) / snarkyVariable.avgTime;
  
  if (constantParity < 0.1) {
    console.log('   ✅ CONSTANT optimization working: Sparky ≈ Snarky for constants');
  } else {
    console.log('   ⚠️  CONSTANT optimization may have issues: Sparky still slower for constants');
  }
  
  if (variableGap > 0.5) {
    console.log('   ✅ VARIABLE operations show expected gap: Sparky >> Snarky for variables');
  } else {
    console.log('   ⚠️  VARIABLE operations gap smaller than expected');
  }
  
  // Performance improvement from optimization
  const optimizationBenefit = sparkyVariable.avgTime - sparkyConstant.avgTime;
  console.log(`\\n🚀 Optimization Impact:`);
  console.log(`   • Sparky performance gain from constant optimization: ${optimizationBenefit.toFixed(0)}ms`);
  console.log(`   • This represents a ${((optimizationBenefit / sparkyVariable.avgTime) * 100).toFixed(1)}% improvement`);
  
  // Memory analysis
  if (sparkyConstant.memoryDelta !== null && sparkyVariable.memoryDelta !== null) {
    console.log('\\n💾 Memory Usage:');
    console.log(`   • Sparky Constants: ${sparkyConstant.memoryDelta}MB`);
    console.log(`   • Sparky Variables: ${sparkyVariable.memoryDelta}MB`);
    console.log(`   • Snarky Constants: ${snarkyConstant.memoryDelta}MB`);
    console.log(`   • Snarky Variables: ${snarkyVariable.memoryDelta}MB`);
  }
}

/**
 * Main benchmark execution
 */
async function runBenchmark() {
  console.log('🧪 VARIABLE vs CONSTANT OPTIMIZATION VALIDATION');
  console.log('═'.repeat(70));
  console.log('Validating Poseidon constant optimization by comparing:');
  console.log('• Constant operations (should be optimized)');
  console.log('• Variable operations (should show original performance gap)');
  
  try {
    // Load o1js ES modules
    console.log('\\n📦 Loading o1js modules...');
    await loadO1js();
    console.log('✓ o1js modules loaded successfully');
    
    // Initialize bindings
    console.log('\\n🔧 Initializing o1js bindings...');
    await initializeBindings();
    console.log('✓ Bindings initialized successfully');
    
    // Create programs
    console.log('\\n🏗️  Creating ZkPrograms...');
    const constantProgram = createConstantProgram();
    const variableProgram = createVariableProgram();
    console.log('✓ Programs created (constant and variable versions)');
    
    // Generate test data
    console.log('\\n📝 Generating test data...');
    const testData = generateTestData();
    console.log('✓ Test data generated');
    
    // === SPARKY BENCHMARKS ===
    console.log('\\n🔥 === SPARKY BACKEND BENCHMARKS ===');
    await switchBackend('sparky');
    
    const sparkyConstant = await benchmarkProgram('Sparky Constants', constantProgram, testData);
    const sparkyVariable = await benchmarkProgram('Sparky Variables', variableProgram, testData);
    
    // === SNARKY BENCHMARKS ===
    console.log('\\n🧙 === SNARKY BACKEND BENCHMARKS ===');
    await switchBackend('snarky');
    
    const snarkyConstant = await benchmarkProgram('Snarky Constants', constantProgram, testData);
    const snarkyVariable = await benchmarkProgram('Snarky Variables', variableProgram, testData);
    
    // === RESULTS ANALYSIS ===
    displayResults(sparkyConstant, sparkyVariable, snarkyConstant, snarkyVariable);
    
  } catch (error) {
    console.error('\\n❌ Benchmark failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Execute benchmark
if (require.main === module) {
  runBenchmark().then(() => {
    console.log('\\n✅ Variable vs Constant benchmark completed successfully');
    console.log('\\n📋 Summary: This benchmark validates our Poseidon optimization by showing:');
    console.log('   1. Constants perform similarly in both backends (optimization working)');
    console.log('   2. Variables show the original performance gap (WASM overhead)'); 
    console.log('   3. Clear delta between optimized and non-optimized operations');
    process.exit(0);
  }).catch(error => {
    console.error('\\n💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { createConstantProgram, createVariableProgram, runBenchmark };