/**
 * ZkProgram Compilation Speed Benchmark
 * 
 * This benchmark compares compilation speeds between Sparky and Snarky backends
 * for various zkProgram configurations.
 */

import { Field, ZkProgram, Struct, Provable, Bool, CircuitString, MerkleWitness, Poseidon, switchBackend, getCurrentBackend } from '../../index.js';

// Helper to measure compilation time and extract metrics
async function measureCompilation(
  name: string,
  compileFn: () => Promise<any>,
  program?: any
): Promise<{ name: string; time: number; backend: string; vkHash?: string; constraintCount?: number }> {
  const backend = getCurrentBackend();
  const start = performance.now();
  try {
    const result = await compileFn();
    const time = performance.now() - start;
    
    // Debug: Log the structure of the result (only for first test)
    if (name === 'Simple Arithmetic' && backend === 'snarky') {
      console.log('🔍 DEBUG Result structure:', Object.keys(result || {}));
      if (result && result.verificationKey) {
        console.log('🔍 DEBUG VK structure:', Object.keys(result.verificationKey));
      }
    }
    
    // Extract verification key hash and constraint count
    let vkHash: string | undefined;
    let constraintCount: number | undefined;
    
    if (result && result.verificationKey) {
      // Handle different VK hash formats - Field objects need special handling
      if (typeof result.verificationKey.hash === 'string') {
        vkHash = result.verificationKey.hash;
      } else if (result.verificationKey.hash && typeof result.verificationKey.hash === 'object') {
        // Handle Field objects by extracting the underlying value
        if (result.verificationKey.hash.value && Array.isArray(result.verificationKey.hash.value) && 
            result.verificationKey.hash.value.length >= 2 && 
            Array.isArray(result.verificationKey.hash.value[1]) &&
            result.verificationKey.hash.value[1].length >= 2) {
          // Extract the bigint value from Field structure: [0, [0, bigint_value]]
          vkHash = result.verificationKey.hash.value[1][1].toString();
        } else {
          // Fallback to JSON stringify for other object formats
          vkHash = JSON.stringify(result.verificationKey.hash);
        }
      } else {
        // Fallback: use the entire VK as hash indicator
        vkHash = 'VK_PRESENT';
      }
    }
    
    // Try to get constraint count using analyzeProgram or similar methods
    try {
      // First try to get it from the compilation result directly
      if (result && result.constraintCount) {
        constraintCount = result.constraintCount;
      } else if (result && result.cs && result.cs.gates) {
        constraintCount = Array.isArray(result.cs.gates) ? result.cs.gates.length : result.cs.gates;
      } else {
        // Try to call analyzeMethods if it exists on the ZkProgram
        if (program && typeof program.analyzeMethods === 'function') {
          try {
            const analysis = await program.analyzeMethods();
            if (name === 'Simple Arithmetic') {
              console.log(`🔍 DEBUG analyzeMethods result for ${name}:`, analysis);
            }
            if (analysis && typeof analysis === 'object') {
              // Look for constraint count in various possible formats
              if (analysis.constraintCount) {
                constraintCount = analysis.constraintCount;
              } else if (analysis.rows) {
                constraintCount = analysis.rows;
              } else if (analysis.gates) {
                constraintCount = Array.isArray(analysis.gates) ? analysis.gates.length : analysis.gates;
              } else {
                // Check method-specific analysis
                const methodNames = Object.keys(analysis);
                if (methodNames.length > 0) {
                  const firstMethod = analysis[methodNames[0]];
                  if (firstMethod && firstMethod.rows) {
                    constraintCount = firstMethod.rows;
                  } else if (firstMethod && firstMethod.constraintCount) {
                    constraintCount = firstMethod.constraintCount;
                  }
                }
              }
            }
          } catch (methodAnalysisError: any) {
            console.log(`⚠️ analyzeMethods failed for ${name}:`, methodAnalysisError.message);
          }
        }
      }
    } catch (analysisError) {
      // Ignore analysis errors, constraint count will remain undefined
    }
    
    return { name, time, backend, vkHash, constraintCount };
  } catch (error) {
    console.error(`❌ Compilation failed for ${name} on ${backend}:`, error);
    return { name, time: -1, backend };
  }
}

// Test Programs

// 1. Simple arithmetic program
const SimpleArithmetic = ZkProgram({
  name: 'SimpleArithmetic',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field, Field],
      async method(publicInput: Field, a: Field, b: Field) {
        const result = a.mul(b).add(publicInput);
        return { publicOutput: result };
      },
    },
  },
});

// 2. Complex arithmetic with many operations
const ComplexArithmetic = ZkProgram({
  name: 'ComplexArithmetic',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field, Field, Field, Field],
      async method(publicInput: Field, a: Field, b: Field, c: Field, d: Field) {
        let result = publicInput;
        for (let i = 0; i < 10; i++) {
          result = result.mul(a).add(b).mul(c).add(d);
          result = result.square().add(Field(i));
        }
        return { publicOutput: result };
      },
    },
  },
});

// 3. Boolean logic heavy program
const BooleanLogic = ZkProgram({
  name: 'BooleanLogic',
  publicInput: Bool,
  publicOutput: Bool,
  methods: {
    compute: {
      privateInputs: [Bool, Bool, Bool, Bool],
      async method(publicInput: Bool, a: Bool, b: Bool, c: Bool, d: Bool) {
        const and1 = a.and(b);
        const or1 = c.or(d);
        const xor1 = and1.not().and(or1).or(and1.and(or1.not()));
        const result = publicInput.and(xor1);
        return { publicOutput: result };
      },
    },
  },
});

// 4. Poseidon hash program
const HashProgram = ZkProgram({
  name: 'HashProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    hash: {
      privateInputs: [Field, Field, Field],
      async method(publicInput: Field, a: Field, b: Field, c: Field) {
        const hash1 = Poseidon.hash([publicInput, a]);
        const hash2 = Poseidon.hash([hash1, b]);
        const hash3 = Poseidon.hash([hash2, c]);
        return { publicOutput: hash3 };
      },
    },
  },
});

// 5. Struct-based program
class Point extends Struct({
  x: Field,
  y: Field,
}) {}

const StructProgram = ZkProgram({
  name: 'StructProgram',
  publicInput: Point,
  publicOutput: Point,
  methods: {
    transform: {
      privateInputs: [Field, Field],
      async method(point: Point, scalar: Field, offset: Field) {
        const newX = point.x.mul(scalar).add(offset);
        const newY = point.y.mul(scalar).sub(offset);
        return { publicOutput: new Point({ x: newX, y: newY }) };
      },
    },
  },
});

// 6. Merkle proof program
class MerkleWitness8 extends MerkleWitness(8) {}

const MerkleProgram = ZkProgram({
  name: 'MerkleProgram',
  publicInput: Field,
  publicOutput: Bool,
  methods: {
    verifyInclusion: {
      privateInputs: [Field, MerkleWitness8],
      async method(root: Field, leaf: Field, witness: MerkleWitness8) {
        const calculatedRoot = witness.calculateRoot(leaf);
        return { publicOutput: root.equals(calculatedRoot) };
      },
    },
  },
});

// 7. Recursive program (simple)
const RecursiveBase = ZkProgram({
  name: 'RecursiveBase',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    base: {
      privateInputs: [Field],
      async method(publicInput: Field, privateInput: Field) {
        return { publicOutput: publicInput.add(privateInput) };
      },
    },
  },
});

// 8. Multi-method program
const MultiMethod = ZkProgram({
  name: 'MultiMethod',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    add: {
      privateInputs: [Field],
      async method(a: Field, b: Field) {
        return { publicOutput: a.add(b) };
      },
    },
    multiply: {
      privateInputs: [Field],
      async method(a: Field, b: Field) {
        return { publicOutput: a.mul(b) };
      },
    },
    hash: {
      privateInputs: [Field],
      async method(a: Field, b: Field) {
        return { publicOutput: Poseidon.hash([a, b]) };
      },
    },
  },
});

// 9. Conditionals program
const ConditionalProgram = ZkProgram({
  name: 'ConditionalProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Bool, Field, Field],
      async method(publicInput: Field, condition: Bool, ifTrue: Field, ifFalse: Field) {
        const selected = Provable.if(condition, ifTrue, ifFalse);
        const result = publicInput.add(selected);
        return { publicOutput: result };
      },
    },
  },
});

// 10. Heavy constraint program
const HeavyConstraints = ZkProgram({
  name: 'HeavyConstraints',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Provable.Array(Field, 10)],
      async method(publicInput: Field, values: Field[]) {
        let result = publicInput;
        for (let i = 0; i < values.length; i++) {
          result = result.mul(values[i]).add(Field(i));
          // Add range checks
          values[i].assertGreaterThanOrEqual(Field(0));
          values[i].assertLessThanOrEqual(Field(1000));
        }
        return { publicOutput: result };
      },
    },
  },
});

// Benchmark runner
async function runBenchmarks() {
  console.log('🚀 ZkProgram Compilation Speed Benchmark');
  console.log('=======================================\n');
  
  const programs = [
    { name: 'Simple Arithmetic', compile: () => SimpleArithmetic.compile(), program: SimpleArithmetic },
    { name: 'Complex Arithmetic', compile: () => ComplexArithmetic.compile(), program: ComplexArithmetic },
    { name: 'Boolean Logic', compile: () => BooleanLogic.compile(), program: BooleanLogic },
    { name: 'Hash Program', compile: () => HashProgram.compile(), program: HashProgram },
    { name: 'Struct Program', compile: () => StructProgram.compile(), program: StructProgram },
    { name: 'Merkle Program', compile: () => MerkleProgram.compile(), program: MerkleProgram },
    { name: 'Recursive Base', compile: () => RecursiveBase.compile(), program: RecursiveBase },
    { name: 'Multi-Method', compile: () => MultiMethod.compile(), program: MultiMethod },
    { name: 'Conditional Program', compile: () => ConditionalProgram.compile(), program: ConditionalProgram },
    { name: 'Heavy Constraints', compile: () => HeavyConstraints.compile(), program: HeavyConstraints },
  ];

  const results: { [key: string]: { 
    snarky?: { time: number; vkHash?: string; constraintCount?: number }; 
    sparky?: { time: number; vkHash?: string; constraintCount?: number }; 
  } } = {};
  
  // Test with Snarky backend first
  console.log('📊 Testing with Snarky backend...\n');
  await switchBackend('snarky');
  
  for (const program of programs) {
    console.log(`  ⏱️  Compiling ${program.name}...`);
    const result = await measureCompilation(program.name, program.compile, program.program);
    if (!results[program.name]) results[program.name] = {};
    results[program.name].snarky = { 
      time: result.time, 
      vkHash: result.vkHash, 
      constraintCount: result.constraintCount 
    };
    if (result.time >= 0) {
      const vkPreview = result.vkHash ? (typeof result.vkHash === 'string' ? result.vkHash.substring(0, 8) : 'Object') : 'N/A';
      console.log(`  ✅ ${program.name}: ${result.time.toFixed(2)}ms (VK: ${vkPreview}..., Constraints: ${result.constraintCount || 'N/A'})`);
    }
  }
  
  // Test with Sparky
  console.log('📊 Testing with Sparky backend...\n');
  await switchBackend('sparky');
  
  for (const program of programs) {
    console.log(`  ⏱️  Compiling ${program.name}...`);
    const result = await measureCompilation(program.name, program.compile, program.program);
    if (!results[program.name]) results[program.name] = {};
    results[program.name].sparky = { 
      time: result.time, 
      vkHash: result.vkHash, 
      constraintCount: result.constraintCount 
    };
    if (result.time >= 0) {
      const vkPreview = result.vkHash ? (typeof result.vkHash === 'string' ? result.vkHash.substring(0, 8) : 'Object') : 'N/A';
      console.log(`  ✅ ${program.name}: ${result.time.toFixed(2)}ms (VK: ${vkPreview}..., Constraints: ${result.constraintCount || 'N/A'})`);
    }
  }
  
  // Generate comparative report
  console.log('\n📈 SPARKY vs SNARKY COMPILATION PERFORMANCE');
  console.log('=============================================\n');
  console.log('Program                    | Snarky (ms) | Sparky (ms) | Speedup    | VK Match | Constraint Match | Status');
  console.log('---------------------------|-------------|-------------|------------|----------|------------------|--------');
  
  let totalSnarky = 0;
  let totalSparky = 0;
  let successfulComparisons = 0;
  let vkMatches = 0;
  let constraintMatches = 0;
  
  for (const [name, times] of Object.entries(results)) {
    const snarkyResult = times.snarky;
    const sparkyResult = times.sparky;
    
    if (snarkyResult && sparkyResult && snarkyResult.time > 0 && sparkyResult.time > 0) {
      totalSnarky += snarkyResult.time;
      totalSparky += sparkyResult.time;
      successfulComparisons++;
      
      const speedup = snarkyResult.time / sparkyResult.time;
      const speedupStr = speedup > 1 ? `${speedup.toFixed(2)}x` : `${(1/speedup).toFixed(2)}x slower`;
      
      // Compare VK hashes
      const vkMatch = snarkyResult.vkHash === sparkyResult.vkHash;
      if (vkMatch) vkMatches++;
      const vkStatus = vkMatch ? '✅ Match' : '❌ Diff';
      
      // Compare constraint counts
      const constraintMatch = snarkyResult.constraintCount === sparkyResult.constraintCount;
      if (constraintMatch) constraintMatches++;
      const constraintStatus = constraintMatch ? '✅ Match' : 
        `❌ ${snarkyResult.constraintCount || 'N/A'} vs ${sparkyResult.constraintCount || 'N/A'}`;
      
      console.log(
        `${name.padEnd(26)} | ${snarkyResult.time.toFixed(2).padStart(11)} | ${sparkyResult.time.toFixed(2).padStart(11)} | ${speedupStr.padStart(10)} | ${vkStatus.padStart(8)} | ${constraintStatus.padStart(16)} | ✅ Success`
      );
    } else if (snarkyResult && snarkyResult.time > 0 && (!sparkyResult || sparkyResult.time < 0)) {
      console.log(
        `${name.padEnd(26)} | ${snarkyResult.time.toFixed(2).padStart(11)} | ${'FAILED'.padStart(11)} | ${'N/A'.padStart(10)} | ${'N/A'.padStart(8)} | ${'N/A'.padStart(16)} | ❌ Sparky Failed`
      );
    } else if ((!snarkyResult || snarkyResult.time < 0) && sparkyResult && sparkyResult.time > 0) {
      console.log(
        `${name.padEnd(26)} | ${'FAILED'.padStart(11)} | ${sparkyResult.time.toFixed(2).padStart(11)} | ${'N/A'.padStart(10)} | ${'N/A'.padStart(8)} | ${'N/A'.padStart(16)} | ❌ Snarky Failed`
      );
    } else {
      console.log(
        `${name.padEnd(26)} | ${'FAILED'.padStart(11)} | ${'FAILED'.padStart(11)} | ${'N/A'.padStart(10)} | ${'N/A'.padStart(8)} | ${'N/A'.padStart(16)} | ❌ Both Failed`
      );
    }
  }
  
  if (successfulComparisons > 0) {
    console.log('---------------------------|-------------|-------------|------------|----------|------------------|--------');
    const totalSpeedup = totalSnarky / totalSparky;
    const speedupStr = totalSpeedup > 1 ? `${totalSpeedup.toFixed(2)}x` : `${(1/totalSpeedup).toFixed(2)}x slower`;
    const vkMatchRate = ((vkMatches / successfulComparisons) * 100).toFixed(1);
    const constraintMatchRate = ((constraintMatches / successfulComparisons) * 100).toFixed(1);
    
    console.log(
      `${'TOTAL'.padEnd(26)} | ${totalSnarky.toFixed(2).padStart(11)} | ${totalSparky.toFixed(2).padStart(11)} | ${speedupStr.padStart(10)} | ${vkMatchRate}% | ${constraintMatchRate}% | ${successfulComparisons}/${programs.length}`
    );
    
    console.log('\n📊 Performance Summary:');
    console.log(`  • Successful comparisons: ${successfulComparisons}/${programs.length}`);
    console.log(`  • Average Snarky compilation: ${(totalSnarky / successfulComparisons).toFixed(2)}ms`);
    console.log(`  • Average Sparky compilation: ${(totalSparky / successfulComparisons).toFixed(2)}ms`);
    console.log(`  • Overall speedup: ${speedupStr}`);
    console.log(`  • Time difference: ${((totalSnarky - totalSparky) / 1000).toFixed(2)}s ${totalSnarky > totalSparky ? 'saved' : 'added'}`);
    console.log(`  • Success rate: ${((successfulComparisons / programs.length) * 100).toFixed(1)}%`);
    
    console.log('\n🔍 Compatibility Analysis:');
    console.log(`  • VK Hash Matches: ${vkMatches}/${successfulComparisons} (${vkMatchRate}%)`);
    console.log(`  • Constraint Count Matches: ${constraintMatches}/${successfulComparisons} (${constraintMatchRate}%)`);
    
    if (vkMatches === successfulComparisons) {
      console.log(`  🎉 Perfect VK compatibility! All verification keys match.`);
    } else if (vkMatches > 0) {
      console.log(`  ⚠️  Partial VK compatibility. ${successfulComparisons - vkMatches} programs have different verification keys.`);
    } else {
      console.log(`  ❌ No VK compatibility. All verification keys differ between backends.`);
    }
    
    if (constraintMatches === successfulComparisons) {
      console.log(`  🎉 Perfect constraint compatibility! All constraint counts match.`);
    } else if (constraintMatches > 0) {
      console.log(`  ⚠️  Partial constraint compatibility. ${successfulComparisons - constraintMatches} programs have different constraint counts.`);
    } else {
      console.log(`  ❌ No constraint compatibility. All constraint counts differ between backends.`);
    }
  }
}

// Run the benchmark
runBenchmarks().catch(console.error);