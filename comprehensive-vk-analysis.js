/**
 * Comprehensive VK analysis to find the pattern of identical VKs
 * Now that we know constraint systems ARE different, check VK generation
 */

import { Field, ZkProgram } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

async function comprehensiveVKAnalysis() {
  console.log('🔍 Comprehensive VK analysis with proven-different constraint systems...\n');

  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log(`Backend: ${getCurrentBackend()}\n`);

  // Define multiple different circuits
  const circuits = [
    {
      name: 'SimpleAddition',
      program: ZkProgram({
        name: 'SimpleAddition',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(publicInput, privateInput) {
              publicInput.assertEquals(privateInput.add(Field(1)));
            },
          },
        },
      })
    },
    
    {
      name: 'SimpleMultiplication',
      program: ZkProgram({
        name: 'SimpleMultiplication',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(publicInput, privateInput) {
              publicInput.assertEquals(privateInput.mul(Field(2)));
            },
          },
        },
      })
    },
    
    {
      name: 'ConstantAssertion',
      program: ZkProgram({
        name: 'ConstantAssertion',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [],
            async method(publicInput) {
              publicInput.assertEquals(Field(42));
            },
          },
        },
      })
    },
    
    {
      name: 'MultipleOperations',
      program: ZkProgram({
        name: 'MultipleOperations',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field],
            async method(publicInput, a, b) {
              const sum = a.add(b);
              const product = a.mul(b);
              publicInput.assertEquals(sum.add(product));
            },
          },
        },
      })
    },
    
    {
      name: 'SquareOperation',
      program: ZkProgram({
        name: 'SquareOperation',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(publicInput, privateInput) {
              publicInput.assertEquals(privateInput.square());
            },
          },
        },
      })
    }
  ];

  const results = [];
  
  for (const circuit of circuits) {
    console.log(`🧪 Compiling ${circuit.name}...`);
    
    const { verificationKey } = await circuit.program.compile();
    
    // Get constraint system details
    const snarky = globalThis.__snarky?.Snarky;
    const cs = snarky.run.getConstraintSystem();
    
    const vkString = JSON.stringify(verificationKey);
    const vkHash = vkString.substring(0, 100);
    
    results.push({
      name: circuit.name,
      vkString,
      vkHash,
      vkLength: vkString.length,
      gatesCount: cs.gates.length,
      firstCoeff: cs.gates.length > 0 ? cs.gates[0].coeffs[0] : 'none'
    });
    
    console.log(`  ✓ VK length: ${vkString.length}, Gates: ${cs.gates.length}`);
    console.log(`  First coefficient: ${cs.gates.length > 0 ? cs.gates[0].coeffs[0].substring(0, 16) + '...' : 'none'}`);
    console.log(`  VK hash: ${vkHash}...\n`);
  }

  // Analysis
  console.log('📊 COMPREHENSIVE VK ANALYSIS:\n');
  
  // Group by VK
  const vkGroups = new Map();
  results.forEach(result => {
    if (!vkGroups.has(result.vkString)) {
      vkGroups.set(result.vkString, []);
    }
    vkGroups.get(result.vkString).push(result);
  });
  
  console.log(`Total circuits: ${results.length}`);
  console.log(`Unique VKs: ${vkGroups.size}`);
  console.log(`VK collision rate: ${((results.length - vkGroups.size) / results.length * 100).toFixed(1)}%\n`);
  
  // Show groups
  let groupIndex = 1;
  for (const [vk, circuits] of vkGroups) {
    console.log(`VK Group ${groupIndex} (${circuits.length} circuits):`);
    circuits.forEach(circuit => {
      console.log(`  ${circuit.name}: gates=${circuit.gatesCount}, coeff=${circuit.firstCoeff.substring(0, 16)}...`);
    });
    console.log('');
    groupIndex++;
  }
  
  // Detailed comparisons
  console.log('🔍 CONSTRAINT VS VK ANALYSIS:');
  console.log('Checking if different constraint systems produce same VKs...\n');
  
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const r1 = results[i];
      const r2 = results[j];
      
      const sameConstraints = r1.firstCoeff === r2.firstCoeff;
      const sameVK = r1.vkString === r2.vkString;
      
      const status = sameConstraints === sameVK ? '✅ CONSISTENT' : '❌ INCONSISTENT';
      
      console.log(`${r1.name} vs ${r2.name}:`);
      console.log(`  Same constraints: ${sameConstraints ? 'YES' : 'NO'}`);
      console.log(`  Same VK: ${sameVK ? 'YES' : 'NO'}`);
      console.log(`  Status: ${status}`);
      
      if (!sameConstraints && sameVK) {
        console.log(`  ⚠️  PROBLEM: Different constraints but same VK!`);
        console.log(`    ${r1.name} coeff: ${r1.firstCoeff}`);
        console.log(`    ${r2.name} coeff: ${r2.firstCoeff}`);
      }
      console.log('');
    }
  }
  
  // Final diagnosis
  const identicalVKPairs = results.reduce((count, r1, i) => {
    return count + results.slice(i + 1).filter(r2 => r1.vkString === r2.vkString).length;
  }, 0);
  
  console.log('🎯 FINAL DIAGNOSIS:');
  if (vkGroups.size === 1) {
    console.log('❌ CRITICAL ISSUE: ALL VKs are identical despite different constraints!');
  } else if (identicalVKPairs > 0) {
    console.log(`⚠️  PARTIAL ISSUE: ${identicalVKPairs} pairs of circuits produce identical VKs`);
  } else {
    console.log('✅ NO ISSUE: All VKs are unique as expected');
  }
}

// Run the analysis
comprehensiveVKAnalysis().catch(console.error);