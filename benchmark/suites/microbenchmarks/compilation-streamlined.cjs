/**
 * Final ZkProgram Compilation Benchmark - NO CACHE
 * Streamlined version focusing on key program types
 */

async function loadModules() {
  const o1js = await import('../../../dist/node/index.js');
  const bindings = await import('../../../dist/node/bindings.js');
  return {
    Field: o1js.Field,
    Poseidon: o1js.Poseidon,
    ZkProgram: o1js.ZkProgram,
    Gadgets: o1js.Gadgets,
    Provable: o1js.Provable,
    SelfProof: o1js.SelfProof,
    Cache: o1js.Cache,
    switchBackend: bindings.switchBackend,
    getCurrentBackend: bindings.getCurrentBackend
  };
}

let Field, Poseidon, ZkProgram, Gadgets, Provable, SelfProof, Cache, switchBackend, getCurrentBackend;

function createNullCache() {
  return {
    read: () => undefined,
    write: () => {},
    canWrite: false,
    debug: false
  };
}

function createTestPrograms(suffix) {
  return {
    simple: ZkProgram({
      name: `simple-${suffix}`,
      publicOutput: Field,
      methods: {
        square: {
          privateInputs: [Field],
          async method(x) {
            return { publicOutput: x.mul(x) };
          },
        },
      },
    }),

    gadgets: ZkProgram({
      name: `gadgets-${suffix}`,
      methods: {
        bitwise: {
          privateInputs: [],
          async method() {
            let a = Provable.witness(Field, () => 48);
            let actualLeft = Gadgets.rotate64(a, 2, 'left');
            let actualRight = Gadgets.rotate64(a, 2, 'right');
            
            actualLeft.assertEquals(Field(192));
            actualRight.assertEquals(Field(12));
          },
        },
        xorAndGates: {
          privateInputs: [],
          async method() {
            let a = Provable.witness(Field, () => 5);
            let b = Provable.witness(Field, () => 2);
            let xorResult = Gadgets.xor(a, b, 4);
            let andResult = Gadgets.and(a, b, 4);
            
            xorResult.assertEquals(Field(7));
            andResult.assertEquals(Field(0));
          },
        },
      },
    }),

    poseidon: ZkProgram({
      name: `poseidon-${suffix}`,
      publicInput: Field,
      publicOutput: Field,
      methods: {
        hashChain: {
          privateInputs: [Field],
          async method(input, salt) {
            let result = input;
            for (let i = 0; i < 8; i++) {
              result = Poseidon.hash([result, salt, Field(i)]);
            }
            return { publicOutput: result };
          },
        },
      },
    }),

    complex: ZkProgram({
      name: `complex-${suffix}`,
      publicInput: Field,
      publicOutput: Field,
      methods: {
        complexOperation: {
          privateInputs: [Field, Field],
          async method(input, a, b) {
            // Range checks
            Gadgets.rangeCheck64(a);
            Gadgets.rangeCheck64(b);
            
            // Bitwise operations
            let xorResult = Gadgets.xor(a, b, 32);
            
            // Hash operations
            let hash1 = Poseidon.hash([input, a]);
            let hash2 = Poseidon.hash([hash1, b]);
            let hash3 = Poseidon.hash([hash2, xorResult]);
            
            return { publicOutput: hash3 };
          },
        },
      },
    }),
  };
}

async function benchmarkProgram(name, program, backend) {
  console.log(`\n📊 ${name} with ${backend} (NO CACHE)`);
  
  const startTime = process.hrtime.bigint();
  
  try {
    console.time(`${backend} ${name}`);
    await program.compile({ cache: Cache.None, forceRecompile: true });
    console.timeEnd(`${backend} ${name}`);
    
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    
    console.log(`✅ ${name}: ${(durationMs/1000).toFixed(2)}s`);
    return { backend, program: name, duration: durationMs, success: true };
    
  } catch (error) {
    console.error(`❌ ${name} failed:`, error.message);
    return { backend, program: name, duration: 0, success: false, error: error.message };
  }
}

async function runSingleBackendTest(backendName) {
  console.log(`\n🔧 ${backendName} Backend (NO CACHE)`);
  console.log('='.repeat(50));
  
  await switchBackend(backendName.toLowerCase());
  console.log(`✅ Active: ${getCurrentBackend()}`);
  
  const timestamp = Date.now();
  const programs = createTestPrograms(`${backendName.toLowerCase()}-${timestamp}`);
  
  const tests = [
    { name: 'Simple', program: programs.simple },
    { name: 'Gadgets', program: programs.gadgets },
    { name: 'Poseidon', program: programs.poseidon },
    { name: 'Complex', program: programs.complex },
  ];
  
  const results = [];
  
  for (const { name, program } of tests) {
    const result = await benchmarkProgram(name, program, backendName);
    results.push(result);
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (global.gc) global.gc();
  }
  
  return results;
}

function printComparison(snarkyResults, sparkyResults) {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 FINAL NO-CACHE COMPILATION BENCHMARK RESULTS');
  console.log('='.repeat(80));
  
  console.log('\n| Program  | Snarky (no cache) | Sparky (no cache) | Speedup | Time Saved |');
  console.log('|----------|-------------------|-------------------|---------|------------|');
  
  const speedups = [];
  const savings = [];
  
  for (let i = 0; i < snarkyResults.length; i++) {
    const snarky = snarkyResults[i];
    const sparky = sparkyResults[i];
    
    if (snarky.success && sparky.success) {
      const snarkyTime = snarky.duration / 1000;
      const sparkyTime = sparky.duration / 1000;
      const speedup = snarkyTime / sparkyTime;
      const timeSaved = snarkyTime - sparkyTime;
      
      speedups.push(speedup);
      savings.push(timeSaved);
      
      console.log(`| ${snarky.program.padEnd(8)} | ${snarkyTime.toFixed(2).padStart(17)}s | ${sparkyTime.toFixed(2).padStart(17)}s | ${speedup.toFixed(2).padStart(7)}x | ${timeSaved.toFixed(2).padStart(10)}s |`);
    } else {
      const snarkyStatus = snarky.success ? `${(snarky.duration/1000).toFixed(2)}s` : 'FAILED';
      const sparkyStatus = sparky.success ? `${(sparky.duration/1000).toFixed(2)}s` : 'FAILED';
      console.log(`| ${snarky.program.padEnd(8)} | ${snarkyStatus.padStart(17)} | ${sparkyStatus.padStart(17)} |     N/A |      N/A |`);
    }
  }
  
  if (speedups.length > 0) {
    const avgSpeedup = speedups.reduce((a, b) => a + b, 0) / speedups.length;
    const totalSaved = savings.reduce((a, b) => a + b, 0);
    
    console.log('\n📈 PERFORMANCE SUMMARY:');
    console.log(`🚀 Average Speedup: ${avgSpeedup.toFixed(2)}x`);
    console.log(`⚡ Max Speedup: ${Math.max(...speedups).toFixed(2)}x`);
    console.log(`💰 Total Time Saved: ${totalSaved.toFixed(1)}s per full compilation cycle`);
    console.log(`⏰ Time Saved Per Day: ${(totalSaved * 10 / 60).toFixed(1)} minutes (assuming 10 rebuilds)`);
    
    console.log('\n🎯 DEVELOPMENT IMPACT:');
    if (avgSpeedup > 15) {
      console.log(`🔥 MASSIVE ${avgSpeedup.toFixed(0)}x speedup for development!`);
    } else if (avgSpeedup > 5) {
      console.log(`🚀 Significant ${avgSpeedup.toFixed(0)}x speedup for development!`);
    } else {
      console.log(`✅ Solid ${avgSpeedup.toFixed(1)}x speedup for development!`);
    }
    
    console.log(`📊 Success Rate: ${speedups.length}/${snarkyResults.length} programs tested`);
  }
  
  console.log('\n⚠️  NOTE: All caching disabled for accurate performance comparison');
  console.log('🔬 These are TRUE compilation performance differences');
}

async function main() {
  try {
    console.log('🚀 Final ZkProgram No-Cache Compilation Benchmark');
    console.log('=================================================');
    console.log('Testing TRUE compilation performance (no cache interference)');
    
    const modules = await loadModules();
    ({ Field, Poseidon, ZkProgram, Gadgets, Provable, SelfProof, switchBackend, getCurrentBackend } = modules);
    
    console.log('✅ Modules loaded');
    
    console.log('\n🔵 Phase 1: Snarky Backend (Fresh Compilation)');
    const snarkyResults = await runSingleBackendTest('Snarky');
    
    console.log('\n🧹 Clearing state...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (global.gc) global.gc();
    
    console.log('\n⚡ Phase 2: Sparky Backend (Fresh Compilation)');
    const sparkyResults = await runSingleBackendTest('Sparky');
    
    printComparison(snarkyResults, sparkyResults);
    
    console.log('\n🎉 Benchmark completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

main();