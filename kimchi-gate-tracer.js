/**
 * Kimchi Gate Tracer - Ruthless Investigation
 * 
 * Find exactly what kimchi gates OCaml actually sees and compare
 * against what Sparky claims to generate. Try to break Sparky.
 */

import { Field, ZkProgram, Poseidon, switchBackend } from './dist/node/index.js';

// Test program to trace
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

/**
 * Hook into OCaml to intercept actual kimchi gates
 */
function interceptOCamlKimchiGates() {
  console.log('🎯 Intercepting OCaml kimchi gate processing...');
  
  // Find OCaml constraint system
  const snarky = globalThis.__snarky?.Snarky;
  if (!snarky) {
    console.log('❌ OCaml Snarky not available');
    return;
  }
  
  console.log('📋 OCaml Snarky available, methods:', Object.keys(snarky));
  
  // Try to hook constraint system operations
  if (snarky.constraintSystem) {
    console.log('🔧 Found constraintSystem, methods:', Object.keys(snarky.constraintSystem));
    
    // Hook digest calculation - this is where OCaml counts constraints
    if (snarky.constraintSystem.digest) {
      const originalDigest = snarky.constraintSystem.digest;
      snarky.constraintSystem.digest = function(...args) {
        console.log('🎯 OCaml digest() called with args:', args.length);
        const result = originalDigest.apply(this, args);
        console.log('  ↳ digest result:', result);
        return result;
      };
      console.log('✅ Hooked OCaml digest()');
    }
    
    // Hook constraint addition if available
    if (snarky.constraintSystem.add) {
      const originalAdd = snarky.constraintSystem.add;
      let constraintCount = 0;
      snarky.constraintSystem.add = function(...args) {
        constraintCount++;
        console.log(`🎯 OCaml constraint ${constraintCount} added:`, args[0]?.typ || args[0]?.type || 'unknown type');
        return originalAdd.apply(this, args);
      };
      console.log('✅ Hooked OCaml constraint addition');
    }
  }
  
  // Hook the actual pickles constraint processing if available
  if (globalThis.__pickles) {
    console.log('🔧 Found __pickles, attempting to hook...');
    const pickles = globalThis.__pickles;
    console.log('  Pickles methods:', Object.keys(pickles));
  }
}

/**
 * Compare Snarky vs Sparky kimchi gate generation
 */
async function compareKimchiGates() {
  console.log('🔍 Comparing kimchi gate generation between backends...\n');
  
  const results = {};
  
  // Test Snarky first
  console.log('📊 SNARKY BACKEND ANALYSIS');
  console.log('========================');
  await switchBackend('snarky');
  
  try {
    interceptOCamlKimchiGates();
    
    console.log('🔧 Compiling with Snarky...');
    const snarkyResult = await HashProgram.compile();
    
    const snarkyAnalysis = await HashProgram.analyzeMethods();
    console.log('📋 Snarky analyzeMethods:', {
      rows: snarkyAnalysis.hash.rows,
      gates: snarkyAnalysis.hash.gates?.length || 'N/A'
    });
    
    results.snarky = {
      rows: snarkyAnalysis.hash.rows,
      gates: snarkyAnalysis.hash.gates?.length || 0,
      vkHash: snarkyResult.verificationKey?.hash?.value?.[1]?.[1]?.toString().substring(0, 16)
    };
    
  } catch (error) {
    console.log('❌ Snarky failed:', error.message);
    results.snarky = { error: error.message };
  }
  
  console.log('\n📊 SPARKY BACKEND ANALYSIS');
  console.log('========================');
  await switchBackend('sparky');
  
  try {
    interceptOCamlKimchiGates();
    
    console.log('🔧 Compiling with Sparky...');
    const sparkyResult = await HashProgram.compile();
    
    const sparkyAnalysis = await HashProgram.analyzeMethods();
    console.log('📋 Sparky analyzeMethods:', {
      rows: sparkyAnalysis.hash.rows,
      gates: sparkyAnalysis.hash.gates?.length || 'N/A'
    });
    
    // Get what Sparky bridge reports
    const sparkyBridge = globalThis.sparkyConstraintBridge;
    let bridgeReport = null;
    if (sparkyBridge) {
      bridgeReport = sparkyBridge.getFullConstraintSystem();
      console.log('📋 Sparky bridge reports:', {
        gates: bridgeReport?.gates?.length || 0,
        constraintCount: bridgeReport?.constraintCount || 0,
        rowCount: bridgeReport?.rowCount || 0
      });
    }
    
    results.sparky = {
      rows: sparkyAnalysis.hash.rows,
      gates: sparkyAnalysis.hash.gates?.length || 0,
      bridgeGates: bridgeReport?.gates?.length || 0,
      bridgeConstraints: bridgeReport?.constraintCount || 0,
      vkHash: sparkyResult.verificationKey?.hash?.value?.[1]?.[1]?.toString().substring(0, 16)
    };
    
  } catch (error) {
    console.log('❌ Sparky failed:', error.message);
    results.sparky = { error: error.message };
  }
  
  return results;
}

/**
 * Ruthless security analysis - try to break Sparky
 */
async function ruthlessSecurityAnalysis() {
  console.log('\n🔥 RUTHLESS SECURITY ANALYSIS');
  console.log('============================');
  console.log('🎯 Trying to break Sparky constraint generation...\n');
  
  await switchBackend('sparky');
  
  // Test 1: Zero input attack
  console.log('🔥 Test 1: Zero input Poseidon hash');
  try {
    const HashZero = ZkProgram({
      name: 'HashZero',
      publicInput: Field,
      publicOutput: Field,
      methods: {
        hashZero: {
          privateInputs: [],
          async method(publicInput) {
            const zero = Field(0);
            const hash = Poseidon.hash([zero, zero, zero]);
            return { publicOutput: hash };
          },
        },
      },
    });
    
    await HashZero.compile();
    const analysis = await HashZero.analyzeMethods();
    console.log('  ↳ Zero hash constraints:', analysis.hashZero.rows);
    
    // Compare with manual constraint counting
    const sparkyBridge = globalThis.sparkyConstraintBridge;
    if (sparkyBridge) {
      const bridgeResult = sparkyBridge.getFullConstraintSystem();
      console.log('  ↳ Bridge reports:', bridgeResult?.constraintCount || 0, 'constraints');
      
      if (analysis.hashZero.rows !== bridgeResult?.constraintCount) {
        console.log('  🚨 DISCREPANCY: analyzeMethods vs bridge!');
      }
    }
    
  } catch (error) {
    console.log('  ❌ Zero input test failed:', error.message);
  }
  
  // Test 2: Single Poseidon vs multiple
  console.log('\n🔥 Test 2: Single vs multiple Poseidon constraint counting');
  try {
    const SingleHash = ZkProgram({
      name: 'SingleHash',
      publicInput: Field,
      publicOutput: Field,
      methods: {
        single: {
          privateInputs: [Field],
          async method(publicInput, a) {
            const hash = Poseidon.hash([publicInput, a]);
            return { publicOutput: hash };
          },
        },
      },
    });
    
    await SingleHash.compile();
    const singleAnalysis = await SingleHash.analyzeMethods();
    console.log('  ↳ Single Poseidon constraints:', singleAnalysis.single.rows);
    
    // Now test the 3-hash version
    await HashProgram.compile();
    const tripleAnalysis = await HashProgram.analyzeMethods();
    console.log('  ↳ Triple Poseidon constraints:', tripleAnalysis.hash.rows);
    
    const expectedRatio = tripleAnalysis.hash.rows / singleAnalysis.single.rows;
    console.log('  ↳ Constraint ratio (triple/single):', expectedRatio.toFixed(2));
    
    if (expectedRatio !== 3.0) {
      console.log('  🚨 UNEXPECTED RATIO: Expected 3.0, got', expectedRatio.toFixed(2));
      console.log('  🎯 This suggests constraint optimization or undercounting!');
    }
    
  } catch (error) {
    console.log('  ❌ Single vs multiple test failed:', error.message);
  }
  
  // Test 3: Direct kimchi gate inspection
  console.log('\n🔥 Test 3: Direct kimchi gate inspection');
  try {
    await HashProgram.compile();
    const analysis = await HashProgram.analyzeMethods();
    
    if (analysis.hash.gates && analysis.hash.gates.length > 0) {
      console.log('  📋 Kimchi gates that OCaml actually sees:');
      analysis.hash.gates.forEach((gate, i) => {
        console.log(`    Gate ${i}: ${gate.typ || gate.type || 'unknown'}`);
        if (gate.wires) {
          console.log(`      Wires: ${Object.keys(gate.wires).join(', ')}`);
        }
      });
      
      // Count Poseidon vs Generic gates
      const gateTypes = {};
      analysis.hash.gates.forEach(gate => {
        const type = gate.typ || gate.type || 'unknown';
        gateTypes[type] = (gateTypes[type] || 0) + 1;
      });
      console.log('  📊 Final kimchi gate distribution:', gateTypes);
      
      // Check if we have the expected 3 Poseidon operations
      if (gateTypes.Poseidon !== 3) {
        console.log('  🚨 SECURITY ISSUE: Expected 3 Poseidon gates, found', gateTypes.Poseidon || 0);
        console.log('  🎯 Sparky may be optimizing away Poseidon operations!');
      }
      
    } else {
      console.log('  ❌ No kimchi gates found in analyzeMethods result');
    }
    
  } catch (error) {
    console.log('  ❌ Kimchi gate inspection failed:', error.message);
  }
}

/**
 * Final verification against ground truth
 */
async function finalVerification(comparisonResults) {
  console.log('\n📋 FINAL VERIFICATION AGAINST GROUND TRUTH');
  console.log('==========================================');
  
  console.log('🔍 Constraint count comparison:');
  if (comparisonResults.snarky && comparisonResults.sparky) {
    console.log(`  Snarky: ${comparisonResults.snarky.rows} constraints`);
    console.log(`  Sparky: ${comparisonResults.sparky.rows} constraints`);
    console.log(`  Reduction: ${(comparisonResults.snarky.rows / comparisonResults.sparky.rows).toFixed(2)}x`);
    
    if (comparisonResults.sparky.bridgeGates !== comparisonResults.sparky.rows) {
      console.log('🚨 CRITICAL DISCREPANCY:');
      console.log(`    Bridge reports: ${comparisonResults.sparky.bridgeGates} gates`);
      console.log(`    OCaml sees: ${comparisonResults.sparky.rows} constraints`);
      console.log('    This suggests bridge reports wrong level of constraints!');
    }
    
    if (comparisonResults.snarky.vkHash !== comparisonResults.sparky.vkHash) {
      console.log('🚨 VK HASH MISMATCH:');
      console.log(`    Snarky VK: ${comparisonResults.snarky.vkHash}...`);
      console.log(`    Sparky VK: ${comparisonResults.sparky.vkHash}...`);
      console.log('    Different constraint systems confirmed!');
    }
  }
  
  console.log('\n🎯 INVESTIGATION CONCLUSION:');
  console.log('============================');
  
  if (comparisonResults.sparky?.rows < comparisonResults.snarky?.rows) {
    const reduction = comparisonResults.snarky.rows / comparisonResults.sparky.rows;
    if (reduction > 3.0) {
      console.log(`🚨 SUSPICIOUS: ${reduction.toFixed(1)}x constraint reduction seems too aggressive`);
      console.log('    Possible explanations:');
      console.log('    1. Legitimate optimization in MIR→LIR transformation');
      console.log('    2. Undercounting of actual security constraints'); 
      console.log('    3. Bridge reporting wrong constraint level');
    } else {
      console.log(`✅ PLAUSIBLE: ${reduction.toFixed(1)}x reduction could be legitimate optimization`);
    }
  }
}

async function runRuthlessInvestigation() {
  console.log('🔥 KIMCHI GATE TRACER - RUTHLESS INVESTIGATION');
  console.log('===============================================\n');
  
  // Step 1: Compare kimchi gates between backends
  const comparisonResults = await compareKimchiGates();
  
  // Step 2: Ruthless security analysis
  await ruthlessSecurityAnalysis();
  
  // Step 3: Final verification
  await finalVerification(comparisonResults);
  
  console.log('\n🏁 Ruthless investigation complete');
}

// Run the investigation
runRuthlessInvestigation().catch(console.error);