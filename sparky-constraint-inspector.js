/**
 * Sparky Constraint Inspector
 * 
 * Purpose: Extract and analyze the actual constraints Sparky generates
 */

import { Field, ZkProgram, Poseidon, switchBackend, getCurrentBackend, Provable } from './dist/node/index.js';

// Hash Program from benchmark
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

// Simple arithmetic for comparison
const SimpleArithmetic = ZkProgram({
  name: 'SimpleArithmetic',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field, Field],
      async method(publicInput, a, b) {
        const result = a.mul(b).add(publicInput);
        return { publicOutput: result };
      },
    },
  },
});

async function extractConstraintDetails(program, programName, backend) {
  console.log(`🔍 Extracting constraints for ${programName} on ${backend} backend...`);
  
  try {
    // Compile the program to trigger constraint generation
    const start = performance.now();
    const result = await program.compile();
    const compilationTime = performance.now() - start;
    
    console.log(`  ✅ Compilation completed in ${compilationTime.toFixed(2)}ms`);
    
    // Get constraint count through analyzeMethods
    let constraintCount = 'N/A';
    let methodAnalysis = {};
    try {
      if (typeof program.analyzeMethods === 'function') {
        methodAnalysis = await program.analyzeMethods();
        console.log(`  📊 Method analysis result:`, methodAnalysis);
        
        // Extract constraint count from analysis
        const methodNames = Object.keys(methodAnalysis);
        if (methodNames.length > 0) {
          const firstMethod = methodAnalysis[methodNames[0]];
          if (firstMethod && typeof firstMethod.rows === 'number') {
            constraintCount = firstMethod.rows;
          }
        }
      }
    } catch (error) {
      console.log(`  ⚠️  analyzeMethods failed:`, error.message);
    }
    
    // For Sparky backend, try to access constraint bridge
    let sparkyConstraints = null;
    if (backend === 'sparky') {
      try {
        const sparkyBridge = globalThis.sparkyConstraintBridge;
        if (sparkyBridge && typeof sparkyBridge.getFullConstraintSystem === 'function') {
          console.log(`  🔧 Accessing Sparky constraint bridge...`);
          sparkyConstraints = sparkyBridge.getFullConstraintSystem();
          
          if (sparkyConstraints && sparkyConstraints.gates) {
            console.log(`  📋 Sparky constraint system:`, {
              gateCount: sparkyConstraints.gates.length,
              constraintCount: sparkyConstraints.constraintCount,
              rowCount: sparkyConstraints.rowCount,
              publicInputSize: sparkyConstraints.publicInputSize
            });
            
            // Analyze gate types
            console.log(`  🔍 Gate type breakdown:`);
            const gateTypes = {};
            sparkyConstraints.gates.forEach((gate, index) => {
              const type = gate.typ || gate.type || 'unknown';
              if (!gateTypes[type]) gateTypes[type] = [];
              gateTypes[type].push(index);
            });
            
            for (const [type, indices] of Object.entries(gateTypes)) {
              console.log(`    ${type}: ${indices.length} gates (indices: ${indices.slice(0, 3).join(', ')}${indices.length > 3 ? '...' : ''})`);
            }
            
            // Show first few gates in detail
            console.log(`  🔍 First few gates in detail:`);
            for (let i = 0; i < Math.min(3, sparkyConstraints.gates.length); i++) {
              const gate = sparkyConstraints.gates[i];
              console.log(`    Gate ${i}:`, {
                type: gate.typ || gate.type,
                wires: gate.wires ? Object.keys(gate.wires) : 'no wires',
                coeffs: gate.coeffs ? `${gate.coeffs.length} coeffs` : 'no coeffs',
                // Show first few coefficients if available
                firstCoeffs: gate.coeffs ? gate.coeffs.slice(0, 3) : 'none'
              });
            }
          }
        }
      } catch (error) {
        console.log(`  ⚠️  Failed to access Sparky constraint bridge:`, error.message);
      }
    }
    
    // Get VK hash
    let vkHash = 'unknown';
    try {
      if (result && result.verificationKey && result.verificationKey.hash) {
        if (typeof result.verificationKey.hash === 'string') {
          vkHash = result.verificationKey.hash;
        } else if (result.verificationKey.hash.value && Array.isArray(result.verificationKey.hash.value)) {
          vkHash = result.verificationKey.hash.value[1][1].toString();
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Failed to extract VK hash:`, error.message);
    }
    
    return {
      backend,
      programName,
      constraintCount,
      methodAnalysis,
      sparkyConstraints,
      vkHash: vkHash.substring(0, 16) + '...',
      compilationTime,
      success: true
    };
    
  } catch (error) {
    console.error(`  ❌ Failed to extract constraints for ${programName}:`, error.message);
    return {
      backend,
      programName,
      success: false,
      error: error.message
    };
  }
}

async function runInspection() {
  console.log('🚀 Sparky Constraint Inspector');
  console.log('=============================\n');
  
  const programs = [
    { program: SimpleArithmetic, name: 'SimpleArithmetic' },
    { program: HashProgram, name: 'HashProgram' }
  ];
  
  const results = [];
  
  // Test Snarky first
  console.log('📊 Testing with Snarky backend...\n');
  await switchBackend('snarky');
  
  for (const { program, name } of programs) {
    const result = await extractConstraintDetails(program, name, 'snarky');
    results.push(result);
    console.log(''); 
  }
  
  // Test Sparky 
  console.log('📊 Testing with Sparky backend...\n');
  await switchBackend('sparky');
  
  for (const { program, name } of programs) {
    const result = await extractConstraintDetails(program, name, 'sparky');
    results.push(result);
    console.log('');
  }
  
  // Generate comparison
  console.log('🔍 CONSTRAINT COMPARISON SUMMARY');
  console.log('===============================\n');
  
  const programNames = ['SimpleArithmetic', 'HashProgram'];
  
  for (const programName of programNames) {
    console.log(`📋 ${programName}:`);
    console.log('─'.repeat(40));
    
    const snarkyResult = results.find(r => r.programName === programName && r.backend === 'snarky');
    const sparkyResult = results.find(r => r.programName === programName && r.backend === 'sparky');
    
    if (snarkyResult && sparkyResult && snarkyResult.success && sparkyResult.success) {
      console.log(`  Snarky: ${snarkyResult.constraintCount} constraints`);
      console.log(`  Sparky: ${sparkyResult.constraintCount} constraints`);
      
      if (sparkyResult.sparkyConstraints) {
        console.log(`  Sparky gates: ${sparkyResult.sparkyConstraints.gates.length}`);
      }
      
      if (typeof snarkyResult.constraintCount === 'number' && typeof sparkyResult.constraintCount === 'number') {
        const ratio = snarkyResult.constraintCount / sparkyResult.constraintCount;
        console.log(`  Ratio: ${ratio.toFixed(2)}x (${snarkyResult.constraintCount}/${sparkyResult.constraintCount})`);
      }
      
      console.log(`  VK Match: ${snarkyResult.vkHash === sparkyResult.vkHash ? '✅ Yes' : '❌ No'}`);
      
      const speedup = snarkyResult.compilationTime / sparkyResult.compilationTime;
      console.log(`  Speed: ${speedup.toFixed(2)}x ${speedup > 1 ? 'faster' : 'slower'} on Sparky`);
    } else {
      console.log(`  ❌ One or both backends failed`);
    }
    
    console.log('');
  }
  
  // Show Sparky gate details for Hash Program
  const sparkyHashResult = results.find(r => r.programName === 'HashProgram' && r.backend === 'sparky' && r.success);
  if (sparkyHashResult && sparkyHashResult.sparkyConstraints) {
    console.log('🔍 SPARKY HASH PROGRAM GATE ANALYSIS');
    console.log('==================================\n');
    
    const gates = sparkyHashResult.sparkyConstraints.gates;
    console.log(`Total gates: ${gates.length}\n`);
    
    gates.forEach((gate, i) => {
      console.log(`Gate ${i}:`);
      console.log(`  Type: ${gate.typ || gate.type || 'unknown'}`);
      
      if (gate.wires) {
        console.log(`  Wires: ${Object.keys(gate.wires).join(', ')}`);
      }
      
      if (gate.coeffs && gate.coeffs.length > 0) {
        console.log(`  Coefficients: [${gate.coeffs.slice(0, 5).join(', ')}${gate.coeffs.length > 5 ? '...' : ''}] (${gate.coeffs.length} total)`);
      }
      
      console.log('');
    });
  }
}

// Run the inspection
runInspection().catch(console.error);