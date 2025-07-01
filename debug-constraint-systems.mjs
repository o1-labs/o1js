#!/usr/bin/env node
/**
 * Debug constraint systems between Snarky and Sparky
 */

import { Field, ZkProgram, switchBackend, Circuit, Provable } from './dist/node/index.js';
import fs from 'fs';

console.log('=== DEBUG CONSTRAINT SYSTEMS ===\n');

// Test different programs
const programs = {
  empty: {
    name: 'Empty',
    program: ZkProgram({
      name: 'Empty',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [],
          async method(pub) {
            // No constraints
          }
        }
      }
    })
  },
  
  single: {
    name: 'Single',
    program: ZkProgram({
      name: 'Single',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [Field],
          async method(pub, x) {
            x.assertEquals(pub);
          }
        }
      }
    })
  },
  
  double: {
    name: 'Double',
    program: ZkProgram({
      name: 'Double',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [Field],
          async method(pub, x) {
            x.mul(2).assertEquals(pub);
          }
        }
      }
    })
  }
};

async function debugConstraintSystems() {
  const results = {};
  
  for (const [key, { name, program }] of Object.entries(programs)) {
    console.log(`\n========== ${name} Program ==========`);
    results[key] = {};
    
    // Analyze with Snarky
    await switchBackend('snarky');
    console.log('\nSnarky:');
    
    // Get constraint system using analyzeMethods
    const snarkyAnalysis = await program.analyzeMethods();
    console.log('  analyzeMethods:', JSON.stringify(snarkyAnalysis, null, 2));
    
    // Also try to get raw constraint system
    try {
      const snarkyCs = await Circuit.constraintSystem(() => {
        const pub = Provable.witness(Field, () => Field(1));
        if (key === 'single' || key === 'double') {
          const x = Provable.witness(Field, () => Field(2));
          if (key === 'single') {
            x.assertEquals(pub);
          } else {
            x.mul(2).assertEquals(pub);
          }
        }
      });
      console.log('  Raw constraint system:');
      console.log('    gates:', snarkyCs.gates.length);
      console.log('    publicInputSize:', snarkyCs.publicInputSize);
      console.log('    first gate:', JSON.stringify(snarkyCs.gates[0], null, 2));
      results[key].snarkyCs = snarkyCs;
    } catch (e) {
      console.log('  Error getting raw constraint system:', e.message);
    }
    
    // Compile and get VK
    const { verificationKey: snarkyVK } = await program.compile();
    console.log('  VK hash:', snarkyVK.hash.toString());
    results[key].snarkyVK = snarkyVK.hash.toString();
    
    // Analyze with Sparky
    await switchBackend('sparky');
    console.log('\nSparky:');
    
    // Get constraint system using analyzeMethods
    const sparkyAnalysis = await program.analyzeMethods();
    console.log('  analyzeMethods:', JSON.stringify(sparkyAnalysis, null, 2));
    
    // Also try to get raw constraint system
    try {
      const sparkyCs = await Circuit.constraintSystem(() => {
        const pub = Provable.witness(Field, () => Field(1));
        if (key === 'single' || key === 'double') {
          const x = Provable.witness(Field, () => Field(2));
          if (key === 'single') {
            x.assertEquals(pub);
          } else {
            x.mul(2).assertEquals(pub);
          }
        }
      });
      console.log('  Raw constraint system:');
      console.log('    gates:', sparkyCs.gates.length);
      console.log('    publicInputSize:', sparkyCs.publicInputSize);
      console.log('    first gate:', JSON.stringify(sparkyCs.gates[0], null, 2));
      results[key].sparkyCs = sparkyCs;
    } catch (e) {
      console.log('  Error getting raw constraint system:', e.message);
    }
    
    // Compile and get VK
    const { verificationKey: sparkyVK } = await program.compile();
    console.log('  VK hash:', sparkyVK.hash.toString());
    results[key].sparkyVK = sparkyVK.hash.toString();
    
    // Compare
    console.log('\nComparison:');
    console.log('  VK match:', results[key].snarkyVK === results[key].sparkyVK ? '✅' : '❌');
    if (results[key].snarkyCs && results[key].sparkyCs) {
      console.log('  Gates match:', 
        results[key].snarkyCs.gates.length === results[key].sparkyCs.gates.length ? '✅' : '❌');
    }
  }
  
  // Analysis
  console.log('\n\n========== ANALYSIS ==========');
  
  // Check if all Sparky VKs are the same
  const sparkyVKs = Object.values(results).map(r => r.sparkyVK);
  const uniqueSparkyVKs = new Set(sparkyVKs);
  
  if (uniqueSparkyVKs.size === 1) {
    console.log('\n🚨 CRITICAL: All Sparky VKs are identical!');
    console.log(`   The VK is: ${sparkyVKs[0]}`);
  }
  
  // Check constraint systems
  console.log('\nConstraint system differences:');
  for (const [key, result] of Object.entries(results)) {
    if (result.snarkyCs && result.sparkyCs) {
      const snarkyGates = result.snarkyCs.gates;
      const sparkyGates = result.sparkyCs.gates;
      
      console.log(`\n${key}:`);
      console.log(`  Snarky gates: ${snarkyGates.length}`);
      console.log(`  Sparky gates: ${sparkyGates.length}`);
      
      // Check if gates are identical
      const gatesMatch = JSON.stringify(snarkyGates) === JSON.stringify(sparkyGates);
      console.log(`  Gates identical: ${gatesMatch ? '✅' : '❌'}`);
      
      if (!gatesMatch && snarkyGates.length > 0 && sparkyGates.length > 0) {
        console.log('  First gate comparison:');
        console.log('    Snarky:', JSON.stringify(snarkyGates[0]).substring(0, 100) + '...');
        console.log('    Sparky:', JSON.stringify(sparkyGates[0]).substring(0, 100) + '...');
      }
    }
  }
  
  // Save detailed results
  fs.writeFileSync('debug-constraint-systems.json', JSON.stringify(results, null, 2));
  console.log('\n\nDetailed results saved to debug-constraint-systems.json');
}

debugConstraintSystems().catch(console.error);