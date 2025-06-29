/**
 * Comprehensive ZkProgram Compilation Benchmark
 * Tests compilation times for various complexity levels with both Snarky and Sparky backends
 */

async function loadModules() {
  const o1js = await import('./dist/node/index.js');
  const bindings = await import('./dist/node/bindings.js');
  return {
    Field: o1js.Field,
    Poseidon: o1js.Poseidon,
    ZkProgram: o1js.ZkProgram,
    Gadgets: o1js.Gadgets,
    Provable: o1js.Provable,
    MerkleTree: o1js.MerkleTree,
    MerkleWitness: o1js.MerkleWitness,
    SelfProof: o1js.SelfProof,
    DynamicProof: o1js.DynamicProof,
    VerificationKey: o1js.VerificationKey,
    Undefined: o1js.Undefined,
    switchBackend: bindings.switchBackend,
    getCurrentBackend: bindings.getCurrentBackend
  };
}

let Field, Poseidon, ZkProgram, Gadgets, Provable, MerkleTree, MerkleWitness, SelfProof, DynamicProof, VerificationKey, Undefined, switchBackend, getCurrentBackend;

// Test 1: Simple ZkProgram (baseline)
function createSimpleProgram() {
  return ZkProgram({
    name: 'simple-test',
    publicOutput: Field,
    methods: {
      square: {
        privateInputs: [Field],
        async method(x) {
          return { publicOutput: x.mul(x) };
        },
      },
    },
  });
}

// Test 2: Gadgets Program (complex bitwise operations)
function createGadgetsProgram() {
  return ZkProgram({
    name: 'gadgets-test',
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
  });
}

// Test 3: Poseidon Heavy Program (many hash operations)
function createPoseidonProgram() {
  return ZkProgram({
    name: 'poseidon-heavy',
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
  });
}

// Test 4: Recursive Program (self-referential proofs)
function createRecursiveProgram() {
  return ZkProgram({
    name: 'recursive-test',
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
  });
}

// Test 5: Complex Mixed Program (combination of operations)
function createComplexProgram() {
  return ZkProgram({
    name: 'complex-mixed',
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
  });
}

const testPrograms = [
  { name: 'Simple', create: createSimpleProgram, complexity: 'Low' },
  { name: 'Gadgets', create: createGadgetsProgram, complexity: 'Medium' },
  { name: 'Poseidon', create: createPoseidonProgram, complexity: 'Medium-High' },
  { name: 'Recursive', create: createRecursiveProgram, complexity: 'High' },
  { name: 'Complex', create: createComplexProgram, complexity: 'Very High' },
];

async function benchmarkProgram(name, program, backend) {
  console.log(`\n📊 Testing ${name} Program with ${backend}`);
  console.log('-'.repeat(50));
  
  const startTime = process.hrtime.bigint();
  
  try {
    console.time(`⏱️  ${backend} ${name} compile`);
    await program.compile();
    console.timeEnd(`⏱️  ${backend} ${name} compile`);
    
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    
    console.log(`✅ ${name} compilation successful`);
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

async function runBackendComparison(backend) {
  console.log(`\n🔧 Testing ${backend} Backend`);
  console.log('='.repeat(60));
  
  // Switch backend
  await switchBackend(backend.toLowerCase());
  console.log(`✅ Active backend: ${getCurrentBackend()}`);
  
  const results = [];
  
  for (const { name, create, complexity } of testPrograms) {
    console.log(`\n🎯 Creating ${name} Program (${complexity} complexity)`);
    
    try {
      const program = create();
      const result = await benchmarkProgram(name, program, backend);
      results.push(result);
      
      // Add delay between tests to prevent memory issues
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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

function printComparisonResults(snarkyResults, sparkyResults) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPILATION BENCHMARK RESULTS');
  console.log('='.repeat(80));
  
  console.log('\n| Program | Complexity | Snarky Time | Sparky Time | Speedup |');
  console.log('|---------|------------|-------------|-------------|---------|');
  
  const speedups = [];
  
  for (let i = 0; i < testPrograms.length; i++) {
    const snarky = snarkyResults[i];
    const sparky = sparkyResults[i];
    const program = testPrograms[i];
    
    if (snarky.success && sparky.success) {
      const speedup = (snarky.duration / sparky.duration).toFixed(2);
      speedups.push(parseFloat(speedup));
      
      console.log(`| ${program.name.padEnd(7)} | ${program.complexity.padEnd(10)} | ${(snarky.duration/1000).toFixed(2)}s | ${(sparky.duration/1000).toFixed(2)}s | ${speedup}x |`);
    } else {
      const snarkyStatus = snarky.success ? `${(snarky.duration/1000).toFixed(2)}s` : 'FAILED';
      const sparkyStatus = sparky.success ? `${(sparky.duration/1000).toFixed(2)}s` : 'FAILED';
      console.log(`| ${program.name.padEnd(7)} | ${program.complexity.padEnd(10)} | ${snarkyStatus.padEnd(11)} | ${sparkyStatus.padEnd(11)} | N/A |`);
    }
  }
  
  if (speedups.length > 0) {
    const avgSpeedup = (speedups.reduce((a, b) => a + b, 0) / speedups.length).toFixed(2);
    const maxSpeedup = Math.max(...speedups).toFixed(2);
    const minSpeedup = Math.min(...speedups).toFixed(2);
    
    console.log('\n📈 Summary Statistics:');
    console.log(`   • Average Speedup: ${avgSpeedup}x`);
    console.log(`   • Maximum Speedup: ${maxSpeedup}x`);
    console.log(`   • Minimum Speedup: ${minSpeedup}x`);
    console.log(`   • Tests Completed: ${speedups.length}/${testPrograms.length}`);
  }
}

async function main() {
  try {
    console.log('🚀 ZkProgram Compilation Benchmark Suite');
    console.log('=========================================');
    console.log('Testing compilation times for various complexity levels\n');
    
    // Load modules
    const modules = await loadModules();
    ({ Field, Poseidon, ZkProgram, Gadgets, Provable, MerkleTree, MerkleWitness, SelfProof, DynamicProof, VerificationKey, Undefined, switchBackend, getCurrentBackend } = modules);
    
    console.log('✅ Modules loaded successfully');
    
    // Run Snarky tests
    const snarkyResults = await runBackendComparison('Snarky');
    
    // Run Sparky tests  
    const sparkyResults = await runBackendComparison('Sparky');
    
    // Print comparison
    printComparisonResults(snarkyResults, sparkyResults);
    
    console.log('\n🎉 Benchmark completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

main();