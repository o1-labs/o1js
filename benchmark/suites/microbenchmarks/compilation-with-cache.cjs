/**
 * ZkProgram Compilation Benchmark - WITH CACHE
 * Tests compilation performance with caching enabled to see cache benefits
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
    switchBackend: bindings.switchBackend,
    getCurrentBackend: bindings.getCurrentBackend
  };
}

let Field, Poseidon, ZkProgram, Gadgets, Provable, SelfProof, switchBackend, getCurrentBackend;

// Use consistent program names to benefit from cache
function createTestPrograms() {
  return {
    simple: ZkProgram({
      name: 'simple-cached-test',
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
      name: 'gadgets-cached-test',
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
      name: 'poseidon-cached-test',
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
      name: 'complex-cached-test',
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

async function benchmarkProgram(name, program, backend, runNumber) {
  console.log(`\n📊 ${name} with ${backend} (Run ${runNumber}, ${runNumber === 1 ? 'COLD CACHE' : 'WARM CACHE'})`);
  
  const startTime = process.hrtime.bigint();
  
  try {
    console.time(`${backend} ${name} Run${runNumber}`);
    // Use default cache behavior (enabled)
    await program.compile();
    console.timeEnd(`${backend} ${name} Run${runNumber}`);
    
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    
    console.log(`✅ ${name}: ${(durationMs/1000).toFixed(2)}s`);
    return { backend, program: name, duration: durationMs, success: true, runNumber };
    
  } catch (error) {
    console.error(`❌ ${name} failed:`, error.message);
    return { backend, program: name, duration: 0, success: false, error: error.message, runNumber };
  }
}

async function runBackendTestWithCache(backendName) {
  console.log(`\n🔧 ${backendName} Backend (WITH CACHE)`);
  console.log('='.repeat(50));
  
  await switchBackend(backendName.toLowerCase());
  console.log(`✅ Active: ${getCurrentBackend()}`);
  
  const programs = createTestPrograms();
  
  const tests = [
    { name: 'Simple', program: programs.simple },
    { name: 'Gadgets', program: programs.gadgets },
    { name: 'Poseidon', program: programs.poseidon },
    { name: 'Complex', program: programs.complex },
  ];
  
  const results = { run1: [], run2: [] };
  
  // Run 1: Cold cache
  console.log('\n🥶 Run 1: Cold Cache');
  for (const { name, program } of tests) {
    const result = await benchmarkProgram(name, program, backendName, 1);
    results.run1.push(result);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Brief pause
  console.log('\n⏸️  Pausing before warm cache run...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run 2: Warm cache
  console.log('\n🔥 Run 2: Warm Cache');
  for (const { name, program } of tests) {
    const result = await benchmarkProgram(name, program, backendName, 2);
    results.run2.push(result);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

function printCacheComparison(snarkyResults, sparkyResults) {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 COMPILATION BENCHMARK WITH CACHE RESULTS');
  console.log('='.repeat(80));
  
  console.log('\n📊 COLD CACHE (First Run):');
  console.log('| Program  | Snarky | Sparky | Speedup |');
  console.log('|----------|--------|--------|---------|');
  
  for (let i = 0; i < snarkyResults.run1.length; i++) {
    const snarky = snarkyResults.run1[i];
    const sparky = sparkyResults.run1[i];
    
    if (snarky.success && sparky.success) {
      const snarkyTime = snarky.duration / 1000;
      const sparkyTime = sparky.duration / 1000;
      const speedup = snarkyTime / sparkyTime;
      
      console.log(`| ${snarky.program.padEnd(8)} | ${snarkyTime.toFixed(2).padStart(6)}s | ${sparkyTime.toFixed(2).padStart(6)}s | ${speedup.toFixed(2).padStart(7)}x |`);
    }
  }
  
  console.log('\n🔥 WARM CACHE (Second Run):');
  console.log('| Program  | Snarky | Sparky | Speedup |');
  console.log('|----------|--------|--------|---------|');
  
  const cacheSpeedups = [];
  
  for (let i = 0; i < snarkyResults.run2.length; i++) {
    const snarky = snarkyResults.run2[i];
    const sparky = sparkyResults.run2[i];
    
    if (snarky.success && sparky.success) {
      const snarkyTime = snarky.duration / 1000;
      const sparkyTime = sparky.duration / 1000;
      const speedup = snarkyTime / sparkyTime;
      
      cacheSpeedups.push(speedup);
      console.log(`| ${snarky.program.padEnd(8)} | ${snarkyTime.toFixed(2).padStart(6)}s | ${sparkyTime.toFixed(2).padStart(6)}s | ${speedup.toFixed(2).padStart(7)}x |`);
    }
  }
  
  console.log('\n💾 CACHE EFFECTIVENESS:');
  console.log('| Program  | Snarky Improvement | Sparky Improvement |');
  console.log('|----------|-------------------|-------------------|');
  
  for (let i = 0; i < snarkyResults.run1.length; i++) {
    const snarkyRun1 = snarkyResults.run1[i];
    const snarkyRun2 = snarkyResults.run2[i];
    const sparkyRun1 = sparkyResults.run1[i];
    const sparkyRun2 = sparkyResults.run2[i];
    
    if (snarkyRun1.success && snarkyRun2.success && sparkyRun1.success && sparkyRun2.success) {
      const snarkyImprovement = snarkyRun1.duration / snarkyRun2.duration;
      const sparkyImprovement = sparkyRun1.duration / sparkyRun2.duration;
      
      console.log(`| ${snarkyRun1.program.padEnd(8)} | ${snarkyImprovement.toFixed(1).padStart(17)}x | ${sparkyImprovement.toFixed(1).padStart(17)}x |`);
    }
  }
  
  if (cacheSpeedups.length > 0) {
    const avgSpeedup = cacheSpeedups.reduce((a, b) => a + b, 0) / cacheSpeedups.length;
    console.log(`\n📈 Average Speedup with Warm Cache: ${avgSpeedup.toFixed(2)}x`);
  }
  
  console.log('\n🔍 KEY INSIGHTS:');
  console.log('• Cold cache: Shows performance with cache misses');
  console.log('• Warm cache: Shows performance with cache hits');
  console.log('• Cache effectiveness: How much each backend benefits from caching');
}

async function main() {
  try {
    console.log('🚀 ZkProgram Compilation Benchmark WITH CACHE');
    console.log('=============================================');
    console.log('Testing compilation performance with caching enabled');
    
    const modules = await loadModules();
    ({ Field, Poseidon, ZkProgram, Gadgets, Provable, SelfProof, switchBackend, getCurrentBackend } = modules);
    
    console.log('✅ Modules loaded');
    
    console.log('\n🔵 Phase 1: Snarky Backend');
    const snarkyResults = await runBackendTestWithCache('Snarky');
    
    console.log('\n🧹 Clearing state...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (global.gc) global.gc();
    
    console.log('\n⚡ Phase 2: Sparky Backend');
    const sparkyResults = await runBackendTestWithCache('Sparky');
    
    printCacheComparison(snarkyResults, sparkyResults);
    
    console.log('\n🎉 Cache benchmark completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

main();