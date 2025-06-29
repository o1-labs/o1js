/**
 * ZkProgram Compilation Benchmark - NO CACHE VERSION
 * Tests true compilation performance without caching interference
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

// Disable cache by creating null cache implementation
function createNullCache() {
  return {
    read: () => undefined,
    write: () => {},
    canWrite: false,
    debug: false
  };
}

// Test programs with unique names to avoid any cache hits
function createUniquePrograms(suffix) {
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
            
            let expectedLeft = Field(192);
            actualLeft.assertEquals(expectedLeft);
            
            let expectedRight = Field(12);
            actualRight.assertEquals(expectedRight);
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
        multiRange: {
          privateInputs: [],
          async method() {
            let x = Provable.witness(Field, () => 100);
            let y = Provable.witness(Field, () => 200);
            
            // Multiple range checks
            Gadgets.rangeCheck64(x);
            Gadgets.rangeCheck64(y);
            
            let sum = x.add(y);
            Gadgets.rangeCheck64(sum);
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
            
            // Chain 10 Poseidon hashes
            for (let i = 0; i < 10; i++) {
              result = Poseidon.hash([result, salt, Field(i)]);
            }
            
            return { publicOutput: result };
          },
        },
        merklePath: {
          privateInputs: [Field, Field, Field, Field],
          async method(leaf, path1, path2, path3) {
            // Simulate merkle path verification with multiple hashes
            let current = leaf;
            current = Poseidon.hash([current, path1]);
            current = Poseidon.hash([current, path2]);
            current = Poseidon.hash([current, path3]);
            
            return { publicOutput: current };
          },
        },
      },
    }),

    recursive: ZkProgram({
      name: `recursive-${suffix}`,
      publicInput: Field,
      publicOutput: Field,
      methods: {
        base: {
          privateInputs: [],
          async method(input) {
            return { publicOutput: input.add(1) };
          },
        },
        step: {
          privateInputs: [SelfProof],
          async method(input, proof) {
            proof.verify();
            let previousOutput = proof.publicOutput;
            return { publicOutput: previousOutput.add(input) };
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
          privateInputs: [Field, Field, Field],
          async method(input, a, b) {
            // Range checks
            Gadgets.rangeCheck64(a);
            Gadgets.rangeCheck64(b);
            
            // Bitwise operations
            let xorResult = Gadgets.xor(a, b, 32);
            let andResult = Gadgets.and(a, b, 32);
            
            // Hash operations
            let hash1 = Poseidon.hash([input, a]);
            let hash2 = Poseidon.hash([hash1, b]);
            let hash3 = Poseidon.hash([hash2, xorResult]);
            
            // Arithmetic
            let sum = a.add(b).add(andResult);
            let product = sum.mul(Field(2));
            
            // Final hash combining everything
            return { 
              publicOutput: Poseidon.hash([hash3, product, input]) 
            };
          },
        },
        megaComplex: {
          privateInputs: [Field, Field, Field, Field, Field],
          async method(input, x1, x2, x3, x4) {
            // Multiple range checks
            Gadgets.rangeCheck32(x1);
            Gadgets.rangeCheck32(x2);
            Gadgets.rangeCheck64(x3);
            Gadgets.rangeCheck64(x4);
            
            // Complex bitwise chain
            let bit1 = Gadgets.xor(x1, x2, 32);
            let bit2 = Gadgets.and(x3, x4, 64);
            let bit3 = Gadgets.xor(bit1, Field(0xFFFF), 16);
            
            // Hash cascade
            let h1 = Poseidon.hash([input, x1, x2]);
            let h2 = Poseidon.hash([h1, x3, x4]);
            let h3 = Poseidon.hash([h2, bit1, bit2]);
            let h4 = Poseidon.hash([h3, bit3]);
            
            // Rotation operations
            let rot1 = Gadgets.rotate64(x3, 8, 'left');
            let rot2 = Gadgets.rotate64(x4, 16, 'right');
            
            // Final complex computation
            let result = h4.add(rot1).mul(rot2);
            
            return { publicOutput: result };
          },
        },
      },
    }),
  };
}

const testPrograms = [
  { name: 'Simple', key: 'simple', complexity: 'Low' },
  { name: 'Gadgets', key: 'gadgets', complexity: 'Medium' },
  { name: 'Poseidon', key: 'poseidon', complexity: 'Medium-High' },
  { name: 'Recursive', key: 'recursive', complexity: 'High' },
  { name: 'Complex', key: 'complex', complexity: 'Very High' },
];

async function benchmarkProgram(name, program, backend) {
  console.log(`\n📊 Testing ${name} Program with ${backend} (NO CACHE)`);
  console.log('-'.repeat(60));
  
  const startTime = process.hrtime.bigint();
  
  try {
    console.log(`⏰ Starting ${backend} ${name} compilation...`);
    console.time(`⏱️  ${backend} ${name} compile`);
    
    // Force compilation with null cache
    await program.compile({ cache: createNullCache() });
    
    console.timeEnd(`⏱️  ${backend} ${name} compile`);
    
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    
    console.log(`✅ ${name} compilation successful (${(durationMs/1000).toFixed(2)}s)`);
    return {
      backend,
      program: name,
      duration: durationMs,
      success: true
    };
    
  } catch (error) {
    console.error(`❌ ${name} compilation failed:`, error.message);
    return {
      backend,
      program: name,
      duration: 0,
      success: false,
      error: error.message
    };
  }
}

async function runBackendTest(backend) {
  console.log(`\n🔧 Testing ${backend} Backend (NO CACHE)`);
  console.log('='.repeat(70));
  
  // Switch backend
  await switchBackend(backend.toLowerCase());
  console.log(`✅ Active backend: ${getCurrentBackend()}`);
  
  // Create unique programs for this backend to avoid any cache pollution
  const timestamp = Date.now();
  const programs = createUniquePrograms(`${backend.toLowerCase()}-${timestamp}`);
  
  const results = [];
  
  for (const { name, key, complexity } of testPrograms) {
    console.log(`\n🎯 Creating ${name} Program (${complexity} complexity) - Fresh Instance`);
    
    try {
      const program = programs[key];
      const result = await benchmarkProgram(name, program, backend);
      results.push(result);
      
      // Clear any potential memory/state between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force garbage collection if available
      if (global.gc) {
        console.log('🧹 Running garbage collection...');
        global.gc();
      }
      
    } catch (error) {
      console.error(`❌ Failed to create ${name} program:`, error.message);
      results.push({
        backend,
        program: name,
        duration: 0,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

function printDetailedResults(snarkyResults, sparkyResults) {
  console.log('\n' + '='.repeat(90));
  console.log('📊 NO-CACHE COMPILATION BENCHMARK RESULTS');
  console.log('='.repeat(90));
  
  console.log('\n🔍 Detailed Results:');
  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ Program   │ Complexity │ Snarky Time │ Sparky Time │ Speedup │ Time Saved │');
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  
  const speedups = [];
  const timeSavings = [];
  
  for (let i = 0; i < testPrograms.length; i++) {
    const snarky = snarkyResults[i];
    const sparky = sparkyResults[i];
    const program = testPrograms[i];
    
    if (snarky.success && sparky.success) {
      const snarkyTime = snarky.duration / 1000;
      const sparkyTime = sparky.duration / 1000;
      const speedup = snarkyTime / sparkyTime;
      const timeSaved = snarkyTime - sparkyTime;
      
      speedups.push(speedup);
      timeSavings.push(timeSaved);
      
      const row = `│ ${program.name.padEnd(9)} │ ${program.complexity.padEnd(10)} │ ${snarkyTime.toFixed(2).padStart(11)}s │ ${sparkyTime.toFixed(2).padStart(11)}s │ ${speedup.toFixed(2).padStart(7)}x │ ${timeSaved.toFixed(2).padStart(10)}s │`;
      console.log(row);
    } else {
      const snarkyStatus = snarky.success ? `${(snarky.duration/1000).toFixed(2)}s` : 'FAILED';
      const sparkyStatus = sparky.success ? `${(sparky.duration/1000).toFixed(2)}s` : 'FAILED';
      const row = `│ ${program.name.padEnd(9)} │ ${program.complexity.padEnd(10)} │ ${snarkyStatus.padStart(11)} │ ${sparkyStatus.padStart(11)} │     N/A │      N/A │`;
      console.log(row);
    }
  }
  
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');
  
  if (speedups.length > 0) {
    const avgSpeedup = speedups.reduce((a, b) => a + b, 0) / speedups.length;
    const maxSpeedup = Math.max(...speedups);
    const minSpeedup = Math.min(...speedups);
    const totalTimeSaved = timeSavings.reduce((a, b) => a + b, 0);
    
    console.log('\n📈 Performance Summary:');
    console.log(`   🚀 Average Speedup: ${avgSpeedup.toFixed(2)}x`);
    console.log(`   ⚡ Maximum Speedup: ${maxSpeedup.toFixed(2)}x (${testPrograms[speedups.indexOf(maxSpeedup)].name})`);
    console.log(`   🐌 Minimum Speedup: ${minSpeedup.toFixed(2)}x (${testPrograms[speedups.indexOf(minSpeedup)].name})`);
    console.log(`   ⏰ Total Time Saved: ${totalTimeSaved.toFixed(2)}s per full test cycle`);
    console.log(`   ✅ Success Rate: ${speedups.length}/${testPrograms.length} programs`);
    
    console.log('\n🎯 Development Impact:');
    console.log(`   • For ${avgSpeedup.toFixed(1)}x faster iteration cycles`);
    console.log(`   • Save ${(totalTimeSaved/60).toFixed(1)} minutes per complete rebuild`);
    console.log(`   • Particularly effective for ${testPrograms[speedups.indexOf(maxSpeedup)].name.toLowerCase()} circuits`);
    
    if (maxSpeedup > 10) {
      console.log(`   🔥 DRAMATIC ${maxSpeedup.toFixed(1)}x speedup for some program types!`);
    }
  }
  
  console.log('\n⚠️  Note: This benchmark disables ALL caching for true compilation performance comparison');
}

async function main() {
  try {
    console.log('🚀 ZkProgram Compilation Benchmark Suite (NO CACHE)');
    console.log('===================================================');
    console.log('Testing TRUE compilation performance without caching interference');
    console.log('⚠️  This will take significantly longer but provides accurate results\n');
    
    // Load modules
    const modules = await loadModules();
    ({ Field, Poseidon, ZkProgram, Gadgets, Provable, SelfProof, switchBackend, getCurrentBackend } = modules);
    
    console.log('✅ Modules loaded successfully');
    
    // Enable garbage collection
    if (typeof global !== 'undefined' && !global.gc) {
      console.log('💡 Consider running with --expose-gc for better memory management');
    }
    
    // Run Snarky tests (no cache)
    console.log('\n🔵 Phase 1: Testing Snarky Backend (Fresh Compilation)');
    const snarkyResults = await runBackendTest('Snarky');
    
    // Clear any state between backend tests
    console.log('\n🧹 Clearing state between backend tests...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    if (global.gc) global.gc();
    
    // Run Sparky tests (no cache)
    console.log('\n⚡ Phase 2: Testing Sparky Backend (Fresh Compilation)');
    const sparkyResults = await runBackendTest('Sparky');
    
    // Print detailed comparison
    printDetailedResults(snarkyResults, sparkyResults);
    
    console.log('\n🎉 No-cache benchmark completed successfully!');
    console.log('🔬 These results show TRUE compilation performance differences');
    
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();