/**
 * Sparky Constraint Inspector
 * 
 * Created: July 6, 2025 04:15 UTC
 * Last Modified: July 6, 2025 04:15 UTC
 * 
 * Purpose: Extract and analyze the actual constraints Sparky generates
 */

import { Field, ZkProgram, Poseidon, switchBackend, getCurrentBackend, Provable } from './src/index.js';

// Hash Program from benchmark
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

// Simpler programs for comparison
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

async function extractConstraints(program: any, programName: string, backend: string): Promise<any> {
  console.log(`🔍 Extracting constraints for ${programName} on ${backend} backend...`);
  
  try {
    // Compile the program
    console.log(`  ⏱️  Compiling ${programName}...`);
    const start = performance.now();
    const result = await program.compile();
    const compilationTime = performance.now() - start;
    
    console.log(`  ✅ Compilation completed in ${compilationTime.toFixed(2)}ms`);
    
    // Try to analyze methods to get constraint details
    let constraintAnalysis: any = {};
    try {
      if (typeof program.analyzeMethods === 'function') {
        constraintAnalysis = await program.analyzeMethods();
        console.log(`  📊 Constraint analysis:`, constraintAnalysis);
      }
    } catch (error) {
      console.log(`  ⚠️  analyzeMethods failed:`, error);
    }
    
    // Extract constraint system details
    let constraintSystemDetails: any = {};
    try {
      // Access Sparky constraint bridge if available
      const sparkyBridge = (globalThis as any).sparkyConstraintBridge;
      if (backend === 'sparky' && sparkyBridge) {
        console.log(`  🔧 Accessing Sparky constraint bridge...`);
        const fullConstraintSystem = sparkyBridge.getFullConstraintSystem();
        if (fullConstraintSystem) {
          constraintSystemDetails = {
            gates: fullConstraintSystem.gates || [],
            gateCount: (fullConstraintSystem.gates || []).length,
            publicInputSize: fullConstraintSystem.publicInputSize || 0,
            constraintCount: fullConstraintSystem.constraintCount || 0,
            rowCount: fullConstraintSystem.rowCount || 0,
            metadata: fullConstraintSystem.metadata || {}
          };
          
          console.log(`  📋 Constraint system details:`, {
            gateCount: constraintSystemDetails.gateCount,
            constraintCount: constraintSystemDetails.constraintCount,
            rowCount: constraintSystemDetails.rowCount,
            publicInputSize: constraintSystemDetails.publicInputSize
          });
          
          // Log first few gates for inspection
          if (constraintSystemDetails.gates.length > 0) {
            console.log(`  🔍 First few gates:`);
            for (let i = 0; i < Math.min(3, constraintSystemDetails.gates.length); i++) {
              const gate = constraintSystemDetails.gates[i];
              console.log(`    Gate ${i}:`, {
                type: gate.typ || gate.type || 'unknown',
                wires: gate.wires ? 'present' : 'missing',
                coeffs: gate.coeffs ? `${gate.coeffs.length} coefficients` : 'no coeffs'
              });
            }
            
            if (constraintSystemDetails.gates.length > 3) {
              console.log(`    ... and ${constraintSystemDetails.gates.length - 3} more gates`);
            }
          }
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Failed to access constraint system details:`, error);
    }
    
    // Get VK hash for verification
    let vkHash = 'unknown';
    try {
      if (result && result.verificationKey && result.verificationKey.hash) {
        if (typeof result.verificationKey.hash === 'string') {
          vkHash = result.verificationKey.hash;
        } else if (result.verificationKey.hash.value) {
          vkHash = result.verificationKey.hash.value[1][1].toString();
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Failed to extract VK hash:`, error);
    }
    
    return {
      backend,
      programName,
      compilationTime,
      constraintAnalysis,
      constraintSystemDetails,
      vkHash: vkHash.substring(0, 16) + '...',
      success: true
    };
    
  } catch (error) {
    console.error(`  ❌ Failed to extract constraints for ${programName}:`, error);
    return {
      backend,
      programName,
      success: false,
      error: error.message
    };
  }
}

async function runConstraintInspection() {
  console.log('🚀 Sparky Constraint Inspector');
  console.log('=============================\n');
  
  const programs = [
    { program: SimpleArithmetic, name: 'SimpleArithmetic' },
    { program: HashProgram, name: 'HashProgram' }
  ];
  
  const backends = ['snarky', 'sparky'];
  const results: any[] = [];
  
  for (const backend of backends) {
    console.log(`📊 Switching to ${backend} backend...\n`);
    await switchBackend(backend);
    
    for (const { program, name } of programs) {
      const result = await extractConstraints(program, name, backend);
      results.push(result);
      console.log(''); // spacing
    }
  }
  
  // Generate comparison report
  console.log('\n🔍 CONSTRAINT GENERATION COMPARISON');
  console.log('==================================\n');
  
  const programNames = [...new Set(results.map(r => r.programName))];
  
  for (const programName of programNames) {
    console.log(`📋 Program: ${programName}`);
    console.log('─'.repeat(40));
    
    const snarkyResult = results.find(r => r.programName === programName && r.backend === 'snarky');
    const sparkyResult = results.find(r => r.programName === programName && r.backend === 'sparky');
    
    if (snarkyResult && sparkyResult && snarkyResult.success && sparkyResult.success) {
      // Constraint count comparison
      const snarkyConstraints = snarkyResult.constraintAnalysis?.compute?.rows || 
                               snarkyResult.constraintAnalysis?.hash?.rows || 
                               'N/A';
      const sparkyConstraints = sparkyResult.constraintSystemDetails?.constraintCount || 
                               sparkyResult.constraintSystemDetails?.gateCount || 
                               'N/A';
      
      console.log(`  Snarky constraints: ${snarkyConstraints}`);
      console.log(`  Sparky constraints: ${sparkyConstraints}`);
      
      if (typeof snarkyConstraints === 'number' && typeof sparkyConstraints === 'number') {
        const ratio = snarkyConstraints / sparkyConstraints;
        console.log(`  Ratio (Snarky/Sparky): ${ratio.toFixed(2)}x`);
      }
      
      // VK comparison
      console.log(`  Snarky VK: ${snarkyResult.vkHash}`);
      console.log(`  Sparky VK: ${sparkyResult.vkHash}`);
      console.log(`  VK Match: ${snarkyResult.vkHash === sparkyResult.vkHash ? '✅ Yes' : '❌ No'}`);
      
      // Compilation speed comparison
      const speedup = snarkyResult.compilationTime / sparkyResult.compilationTime;
      console.log(`  Speed ratio: ${speedup.toFixed(2)}x ${speedup > 1 ? 'faster' : 'slower'}`);
      
      // Detailed gate analysis for Sparky
      if (sparkyResult.constraintSystemDetails?.gates) {
        console.log(`  Sparky gate breakdown:`);
        const gateTypes: { [key: string]: number } = {};
        sparkyResult.constraintSystemDetails.gates.forEach((gate: any) => {
          const type = gate.typ || gate.type || 'unknown';
          gateTypes[type] = (gateTypes[type] || 0) + 1;
        });
        
        for (const [type, count] of Object.entries(gateTypes)) {
          console.log(`    ${type}: ${count} gates`);
        }
      }
      
    } else {
      if (!snarkyResult || !snarkyResult.success) {
        console.log(`  ❌ Snarky failed: ${snarkyResult?.error || 'unknown error'}`);
      }
      if (!sparkyResult || !sparkyResult.success) {
        console.log(`  ❌ Sparky failed: ${sparkyResult?.error || 'unknown error'}`);
      }
    }
    
    console.log(''); // spacing
  }
}

// Run the inspection
runConstraintInspection().catch(console.error);