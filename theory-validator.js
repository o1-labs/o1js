/**
 * Theory Validator - Test the 12→9 gate/constraint hypothesis
 * 
 * Design rigorous tests to validate or break the theory that:
 * 1. Sparky generates predictable gate counts based on operation count
 * 2. OCaml uses different counting methodology (gates vs constraints)
 * 3. Security properties are preserved despite count differences
 */

import { Field, ZkProgram, Poseidon, switchBackend, Bool, Provable } from './dist/node/index.js';

/**
 * Test 1: Varying Poseidon Operation Count
 */
async function testVaryingPoseidonCount() {
  console.log('🧪 TEST 1: Varying Poseidon Operation Count');
  console.log('==========================================\n');
  
  await switchBackend('sparky');
  
  const testCases = [
    {
      name: 'Zero Poseidon',
      generator: () => ZkProgram({
        name: 'ZeroPoseidon',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          compute: {
            privateInputs: [Field, Field],
            async method(publicInput, a, b) {
              const result = a.add(b).mul(publicInput);
              return { publicOutput: result };
            },
          },
        },
      })
    },
    {
      name: 'One Poseidon',
      generator: () => ZkProgram({
        name: 'OnePoseidon',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          compute: {
            privateInputs: [Field, Field],
            async method(publicInput, a, b) {
              const hash = Poseidon.hash([publicInput, a, b]);
              return { publicOutput: hash };
            },
          },
        },
      })
    },
    {
      name: 'Two Poseidon',
      generator: () => ZkProgram({
        name: 'TwoPoseidon',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          compute: {
            privateInputs: [Field, Field],
            async method(publicInput, a, b) {
              const hash1 = Poseidon.hash([publicInput, a]);
              const hash2 = Poseidon.hash([hash1, b]);
              return { publicOutput: hash2 };
            },
          },
        },
      })
    },
    {
      name: 'Three Poseidon',
      generator: () => ZkProgram({
        name: 'ThreePoseidon',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          compute: {
            privateInputs: [Field, Field, Field],
            async method(publicInput, a, b, c) {
              const hash1 = Poseidon.hash([publicInput, a]);
              const hash2 = Poseidon.hash([hash1, b]);
              const hash3 = Poseidon.hash([hash2, c]);
              return { publicOutput: hash3 };
            },
          },
        },
      })
    },
    {
      name: 'Four Poseidon',
      generator: () => ZkProgram({
        name: 'FourPoseidon',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          compute: {
            privateInputs: [Field, Field, Field, Field],
            async method(publicInput, a, b, c, d) {
              const hash1 = Poseidon.hash([publicInput, a]);
              const hash2 = Poseidon.hash([hash1, b]);
              const hash3 = Poseidon.hash([hash2, c]);
              const hash4 = Poseidon.hash([hash3, d]);
              return { publicOutput: hash4 };
            },
          },
        },
      })
    }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`🔍 Testing: ${testCase.name}`);
    try {
      const program = testCase.generator();
      await program.compile();
      const analysis = await program.analyzeMethods();
      
      // Get bridge data
      const sparkyBridge = globalThis.sparkyConstraintBridge;
      let bridgeData = null;
      if (sparkyBridge) {
        bridgeData = sparkyBridge.getFullConstraintSystem();
      }
      
      const result = {
        name: testCase.name,
        ocamlConstraints: analysis.compute.rows,
        bridgeGates: bridgeData?.gates?.length || 0,
        bridgeConstraints: bridgeData?.constraintCount || 0
      };
      
      // Count gate types if available
      if (bridgeData?.gates) {
        const gateTypes = {};
        bridgeData.gates.forEach(gate => {
          const type = gate.typ || gate.type || 'unknown';
          gateTypes[type] = (gateTypes[type] || 0) + 1;
        });
        result.gateTypes = gateTypes;
      }
      
      results.push(result);
      console.log(`  ↳ OCaml: ${result.ocamlConstraints} constraints`);
      console.log(`  ↳ Bridge: ${result.bridgeGates} gates, ${result.bridgeConstraints} constraints`);
      if (result.gateTypes) {
        console.log(`  ↳ Gate types:`, result.gateTypes);
      }
      
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
      results.push({ name: testCase.name, error: error.message });
    }
    console.log('');
  }
  
  // Analyze scaling patterns
  console.log('📊 SCALING ANALYSIS:');
  console.log('===================');
  
  const validResults = results.filter(r => !r.error && r.gateTypes);
  if (validResults.length >= 2) {
    validResults.forEach((result, i) => {
      const poseidonCount = result.gateTypes.Poseidon || 0;
      const genericCount = result.gateTypes.Generic || 0;
      console.log(`${result.name}: ${poseidonCount} Poseidon + ${genericCount} Generic = ${result.bridgeGates} gates → ${result.ocamlConstraints} constraints`);
      
      if (i > 0) {
        const prev = validResults[i-1];
        const poseidonDelta = poseidonCount - (prev.gateTypes.Poseidon || 0);
        const constraintDelta = result.ocamlConstraints - prev.ocamlConstraints;
        if (poseidonDelta > 0) {
          console.log(`  ↳ +${poseidonDelta} Poseidon → +${constraintDelta} constraints (ratio: ${(constraintDelta/poseidonDelta).toFixed(2)})`);
        }
      }
    });
    
    // Test scaling hypothesis
    const zeroCase = validResults.find(r => r.name === 'Zero Poseidon');
    const oneCase = validResults.find(r => r.name === 'One Poseidon');
    const threeCase = validResults.find(r => r.name === 'Three Poseidon');
    
    if (zeroCase && oneCase && threeCase) {
      const baselineConstraints = zeroCase.ocamlConstraints;
      const singlePoseidonCost = oneCase.ocamlConstraints - baselineConstraints;
      const expectedThreeConstraints = baselineConstraints + (3 * singlePoseidonCost);
      
      console.log(`\n🎯 SCALING HYPOTHESIS TEST:`);
      console.log(`  Baseline (0 Poseidon): ${baselineConstraints} constraints`);
      console.log(`  Single Poseidon cost: ${singlePoseidonCost} constraints`);
      console.log(`  Expected 3 Poseidon: ${expectedThreeConstraints} constraints`);
      console.log(`  Actual 3 Poseidon: ${threeCase.ocamlConstraints} constraints`);
      
      if (expectedThreeConstraints === threeCase.ocamlConstraints) {
        console.log(`  ✅ SCALING THEORY CONFIRMED: Linear relationship`);
      } else {
        console.log(`  ❌ SCALING THEORY REJECTED: Non-linear optimization detected`);
      }
    }
  }
  
  return results;
}

/**
 * Test 2: Non-Poseidon Operations
 */
async function testNonPoseidonOperations() {
  console.log('\n🧪 TEST 2: Non-Poseidon Operations');
  console.log('=================================\n');
  
  await switchBackend('sparky');
  
  const testCases = [
    {
      name: 'Pure Arithmetic',
      generator: () => ZkProgram({
        name: 'PureArithmetic',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          compute: {
            privateInputs: [Field, Field, Field],
            async method(publicInput, a, b, c) {
              const result = a.mul(b).add(c).sub(publicInput).square();
              return { publicOutput: result };
            },
          },
        },
      })
    },
    {
      name: 'Boolean Logic',
      generator: () => ZkProgram({
        name: 'BooleanLogic',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          compute: {
            privateInputs: [Bool, Bool, Bool],
            async method(publicInput, a, b, c) {
              const result = a.and(b).or(c).not();
              return { publicOutput: result.toField() };
            },
          },
        },
      })
    },
    {
      name: 'Conditional Logic',
      generator: () => ZkProgram({
        name: 'ConditionalLogic',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          compute: {
            privateInputs: [Field, Field, Field],
            async method(publicInput, a, b, c) {
              const condition = a.greaterThan(b);
              const result = Provable.if(condition, Field, c, publicInput);
              return { publicOutput: result };
            },
          },
        },
      })
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`🔍 Testing: ${testCase.name}`);
    try {
      const program = testCase.generator();
      await program.compile();
      const analysis = await program.analyzeMethods();
      
      // Get bridge data
      const sparkyBridge = globalThis.sparkyConstraintBridge;
      const bridgeData = sparkyBridge?.getFullConstraintSystem();
      
      console.log(`  ↳ OCaml: ${analysis.compute.rows} constraints`);
      console.log(`  ↳ Bridge: ${bridgeData?.gates?.length || 0} gates`);
      
      if (bridgeData?.gates) {
        const gateTypes = {};
        bridgeData.gates.forEach(gate => {
          const type = gate.typ || gate.type || 'unknown';
          gateTypes[type] = (gateTypes[type] || 0) + 1;
        });
        console.log(`  ↳ Gate types:`, gateTypes);
      }
      
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
    }
    console.log('');
  }
}

/**
 * Test 3: Row Mapping Investigation
 */
async function testRowMappingInvestigation() {
  console.log('\n🧪 TEST 3: Row Mapping Investigation');
  console.log('===================================\n');
  
  await switchBackend('sparky');
  
  // Use the original 3-Poseidon case
  const HashProgram = ZkProgram({
    name: 'HashProgram',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      hash: {
        privateInputs: [Field, Field, Field],
        async method(publicInput, a, b, c) {
          const hash1 = Poseidon.hash([publicInput, a]);
          const hash2 = Poseidon.hash([hash1, b]);
          const hash3 = Poseidon.hash([hash2, c]);
          return { publicOutput: hash3 };
        },
      },
    },
  });
  
  console.log('🔍 Analyzing row mapping vs constraint count...');
  
  await HashProgram.compile();
  const analysis = await HashProgram.analyzeMethods();
  
  console.log(`📊 OCaml constraint count: ${analysis.hash.rows}`);
  console.log(`📊 OCaml gate count: ${analysis.hash.gates?.length || 'N/A'}`);
  
  if (analysis.hash.gates) {
    console.log('\n📋 OCaml gates in detail:');
    analysis.hash.gates.forEach((gate, i) => {
      console.log(`  Gate ${i}: ${gate.typ || gate.type || 'unknown'}`);
      if (gate.wires) {
        const wireCount = Object.keys(gate.wires).length;
        console.log(`    Wires: ${wireCount} (${Object.keys(gate.wires).slice(0, 3).join(', ')}${wireCount > 3 ? '...' : ''})`);
      }
    });
    
    // Count unique gate types
    const gateTypes = {};
    analysis.hash.gates.forEach(gate => {
      const type = gate.typ || gate.type || 'unknown';
      gateTypes[type] = (gateTypes[type] || 0) + 1;
    });
    
    console.log('\n📊 OCaml gate type distribution:');
    Object.entries(gateTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // Compare with bridge
    const sparkyBridge = globalThis.sparkyConstraintBridge;
    const bridgeData = sparkyBridge?.getFullConstraintSystem();
    
    if (bridgeData?.gates) {
      console.log(`\n🔄 COMPARISON:`);
      console.log(`  OCaml sees: ${analysis.hash.gates.length} gates → ${analysis.hash.rows} constraints`);
      console.log(`  Bridge reports: ${bridgeData.gates.length} gates → ${bridgeData.constraintCount} constraints`);
      
      if (analysis.hash.gates.length !== bridgeData.gates.length) {
        console.log(`  🚨 GATE COUNT MISMATCH: ${analysis.hash.gates.length} vs ${bridgeData.gates.length}`);
      }
      
      if (analysis.hash.rows !== bridgeData.constraintCount) {
        console.log(`  🚨 CONSTRAINT COUNT MISMATCH: ${analysis.hash.rows} vs ${bridgeData.constraintCount}`);
      }
    }
  }
}

/**
 * Test 4: Direct Constraint Satisfiability
 */
async function testConstraintSatisfiability() {
  console.log('\n🧪 TEST 4: Constraint Satisfiability Validation');
  console.log('===============================================\n');
  
  const testInputs = [
    { publicInput: Field(1), a: Field(2), b: Field(3), c: Field(4) },
    { publicInput: Field(0), a: Field(0), b: Field(0), c: Field(0) },
    { publicInput: Field(123456), a: Field(789012), b: Field(345678), c: Field(901234) }
  ];
  
  for (const inputs of testInputs) {
    console.log(`🔍 Testing inputs: publicInput=${inputs.publicInput}, a=${inputs.a}, b=${inputs.b}, c=${inputs.c}`);
    
    // Test Snarky
    await switchBackend('snarky');
    const SnarkyProgram = ZkProgram({
      name: 'SnarkyProgram',
      publicInput: Field,
      publicOutput: Field,
      methods: {
        hash: {
          privateInputs: [Field, Field, Field],
          async method(publicInput, a, b, c) {
            const hash1 = Poseidon.hash([publicInput, a]);
            const hash2 = Poseidon.hash([hash1, b]);
            const hash3 = Poseidon.hash([hash2, c]);
            return { publicOutput: hash3 };
          },
        },
      },
    });
    
    await SnarkyProgram.compile();
    const snarkyProof = await SnarkyProgram.hash(inputs.publicInput, inputs.a, inputs.b, inputs.c);
    
    // Test Sparky
    await switchBackend('sparky');
    const SparkyProgram = ZkProgram({
      name: 'SparkyProgram', 
      publicInput: Field,
      publicOutput: Field,
      methods: {
        hash: {
          privateInputs: [Field, Field, Field],
          async method(publicInput, a, b, c) {
            const hash1 = Poseidon.hash([publicInput, a]);
            const hash2 = Poseidon.hash([hash1, b]);
            const hash3 = Poseidon.hash([hash2, c]);
            return { publicOutput: hash3 };
          },
        },
      },
    });
    
    await SparkyProgram.compile();
    const sparkyProof = await SparkyProgram.hash(inputs.publicInput, inputs.a, inputs.b, inputs.c);
    
    console.log(`  Snarky output: ${snarkyProof.publicOutput}`);
    console.log(`  Sparky output: ${sparkyProof.publicOutput}`);
    
    if (snarkyProof.publicOutput.toString() === sparkyProof.publicOutput.toString()) {
      console.log(`  ✅ OUTPUTS MATCH`);
    } else {
      console.log(`  ❌ OUTPUTS DIFFER - CRITICAL SECURITY ISSUE!`);
    }
    console.log('');
  }
}

async function runTheoryValidation() {
  console.log('🧪 THEORY VALIDATOR - COMPREHENSIVE TESTING');
  console.log('===========================================\n');
  
  // Run all tests
  const poseidonResults = await testVaryingPoseidonCount();
  await testNonPoseidonOperations();
  await testRowMappingInvestigation();
  await testConstraintSatisfiability();
  
  console.log('\n🏁 Theory validation complete');
  
  return {
    poseidonScaling: poseidonResults
  };
}

// Run the validation
runTheoryValidation().catch(console.error);