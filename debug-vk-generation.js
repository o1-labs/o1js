#!/usr/bin/env node

/**
 * Debug VK Generation Process
 * 
 * This script analyzes the exact differences in VK generation between Snarky and Sparky
 * by examining constraint system structures, gate formats, and permutation data.
 */

import { Field, ZkProgram, switchBackend, getCurrentBackend } from './dist/node/index.js';

// Simple multiplication program for focused analysis
const SimpleMultiplication = ZkProgram({
  name: 'SimpleMultiplication',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    multiply: {
      privateInputs: [Field],
      async method(publicIn, privateIn) {
        const result = publicIn.mul(privateIn);
        return result;
      }
    }
  }
});

async function analyzeVKGeneration() {
  console.log('🔬 VK Generation Analysis - Sparky vs Snarky');
  console.log('=================================================');
  
  // Test with both backends
  const backends = ['snarky', 'sparky'];
  const results = {};
  
  for (const backend of backends) {
    console.log(`\n📊 Testing ${backend.toUpperCase()} backend:`);
    
    // Switch to backend
    if (getCurrentBackend() !== backend) {
      await switchBackend(backend);
    }
    
    console.log(`✓ ${backend} backend loaded`);
    
    // Compile the program
    console.log('🔄 Compiling program...');
    const compiledProgram = await SimpleMultiplication.compile();
    
    // Extract constraint system info
    const vk = compiledProgram.verificationKey;
    const gates = compiledProgram.constraintSystem?.gates || [];
    
    results[backend] = {
      vk: vk,
      vkHash: vk.slice(0, 64), // First 64 chars for comparison
      gateCount: gates.length,
      gates: gates,
      constraintSystem: compiledProgram.constraintSystem
    };
    
    console.log(`Gate count: ${gates.length}`);
    console.log(`VK hash: ${vk.slice(0, 64)}`);
    
    // Analyze gate structure
    if (gates.length > 0) {
      console.log('\n🔍 Gate Structure Analysis:');
      for (let i = 0; i < Math.min(gates.length, 3); i++) {
        const gate = gates[i];
        console.log(`  Gate ${i}: ${gate.typ || 'Unknown'} (${gate.coeffs?.length || 0} coeffs, ${gate.wires?.length || 0} wires)`);
        
        // Show first few coefficients
        if (gate.coeffs && gate.coeffs.length > 0) {
          console.log(`    Coeffs: ${gate.coeffs.slice(0, 3).join(', ')}${gate.coeffs.length > 3 ? '...' : ''}`);
        }
        
        // Show wire structure
        if (gate.wires && gate.wires.length > 0) {
          console.log(`    Wires: ${gate.wires.slice(0, 3).map(w => `(${w.row},${w.col})`).join(', ')}${gate.wires.length > 3 ? '...' : ''}`);
        }
      }
    }
    
    // Analyze permutation data if available
    if (compiledProgram.constraintSystem?.shifts) {
      console.log('\n🔗 Permutation Analysis:');
      console.log(`  Shifts: ${compiledProgram.constraintSystem.shifts.length} values`);
      console.log(`  Sigmas: ${compiledProgram.constraintSystem.sigmas?.length || 0} columns`);
      console.log(`  Domain size: ${compiledProgram.constraintSystem.domain_size || 'N/A'}`);
    }
  }
  
  console.log('\n🔍 Cross-Backend Comparison:');
  console.log('============================');
  
  // Compare basic metrics
  console.log(`Gate count: Snarky=${results.snarky.gateCount}, Sparky=${results.sparky.gateCount}`);
  console.log(`VK match: ${results.snarky.vkHash === results.sparky.vkHash ? '✅' : '❌'}`);
  
  // Compare gate structures
  if (results.snarky.gates.length > 0 && results.sparky.gates.length > 0) {
    console.log('\n🔍 Gate Structure Comparison:');
    
    const maxGates = Math.max(results.snarky.gates.length, results.sparky.gates.length);
    for (let i = 0; i < maxGates; i++) {
      const snarkyGate = results.snarky.gates[i];
      const sparkyGate = results.sparky.gates[i];
      
      console.log(`\nGate ${i}:`);
      console.log(`  Snarky: ${snarkyGate ? `${snarkyGate.typ} (${snarkyGate.coeffs?.length || 0} coeffs)` : 'N/A'}`);
      console.log(`  Sparky: ${sparkyGate ? `${sparkyGate.typ} (${sparkyGate.coeffs?.length || 0} coeffs)` : 'N/A'}`);
      
      // Compare coefficients if both exist
      if (snarkyGate?.coeffs && sparkyGate?.coeffs) {
        const maxCoeffs = Math.max(snarkyGate.coeffs.length, sparkyGate.coeffs.length);
        let coeffMatch = true;
        for (let j = 0; j < maxCoeffs; j++) {
          if (snarkyGate.coeffs[j] !== sparkyGate.coeffs[j]) {
            coeffMatch = false;
            console.log(`    Coeff ${j}: Snarky=${snarkyGate.coeffs[j]?.slice(0, 16) || 'N/A'}, Sparky=${sparkyGate.coeffs[j]?.slice(0, 16) || 'N/A'}`);
          }
        }
        console.log(`    Coefficient match: ${coeffMatch ? '✅' : '❌'}`);
      }
    }
  }
  
  // Compare permutation data
  console.log('\n🔗 Permutation Data Comparison:');
  const snarkyCS = results.snarky.constraintSystem;
  const sparkyCS = results.sparky.constraintSystem;
  
  if (snarkyCS?.shifts && sparkyCS?.shifts) {
    const shiftsMatch = JSON.stringify(snarkyCS.shifts) === JSON.stringify(sparkyCS.shifts);
    console.log(`  Shifts match: ${shiftsMatch ? '✅' : '❌'}`);
    
    if (!shiftsMatch) {
      console.log('  Shift differences:');
      for (let i = 0; i < Math.max(snarkyCS.shifts.length, sparkyCS.shifts.length); i++) {
        const snarkyShift = snarkyCS.shifts[i];
        const sparkyShift = sparkyCS.shifts[i];
        if (snarkyShift !== sparkyShift) {
          console.log(`    Shift ${i}: Snarky=${snarkyShift?.slice(0, 16) || 'N/A'}, Sparky=${sparkyShift?.slice(0, 16) || 'N/A'}`);
        }
      }
    }
  }
  
  if (snarkyCS?.sigmas && sparkyCS?.sigmas) {
    const sigmasMatch = JSON.stringify(snarkyCS.sigmas) === JSON.stringify(sparkyCS.sigmas);
    console.log(`  Sigmas match: ${sigmasMatch ? '✅' : '❌'}`);
  }
  
  console.log(`  Domain size: Snarky=${snarkyCS?.domain_size || 'N/A'}, Sparky=${sparkyCS?.domain_size || 'N/A'}`);
  
  // Identify the root cause
  console.log('\n🎯 Root Cause Analysis:');
  console.log('======================');
  
  if (results.snarky.gateCount !== results.sparky.gateCount) {
    console.log('❌ Gate count mismatch - optimization differences');
    console.log(`   Sparky is ${results.sparky.gateCount < results.snarky.gateCount ? 'more' : 'less'} optimized`);
  } else {
    console.log('✅ Gate count matches - optimization parity achieved');
  }
  
  if (results.snarky.vkHash !== results.sparky.vkHash) {
    console.log('❌ VK mismatch despite structural analysis');
    console.log('   Likely causes:');
    console.log('   - Permutation cycle differences');
    console.log('   - Wire assignment variations');
    console.log('   - Coefficient format differences');
    console.log('   - Domain size calculation differences');
  } else {
    console.log('✅ VK parity achieved!');
  }
}

// Run analysis
analyzeVKGeneration().catch(console.error);