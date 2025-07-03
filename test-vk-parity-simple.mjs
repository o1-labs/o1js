#!/usr/bin/env node

/**
 * Simple VK Parity Test Runner
 * 
 * Quick test to check current VK parity status between Sparky and Snarky.
 * Run this to get immediate feedback on compatibility issues.
 */

import { Field, Provable, switchBackend, ZkProgram } from './dist/node/index.js';

console.log('🔍 QUICK VK PARITY CHECK');
console.log('========================\n');

let passing = 0;
let total = 0;

async function quickTest(name, testFn) {
  total++;
  console.log(`Testing: ${name}`);
  
  try {
    // Test with Snarky
    await switchBackend('snarky');
    const snarkyCS = await Provable.constraintSystem(testFn);
    
    // Test with Sparky
    await switchBackend('sparky');
    const sparkyCS = await Provable.constraintSystem(testFn);
    
    // Quick comparison
    const gateCountMatch = snarkyCS.gates.length === sparkyCS.gates.length;
    const rowCountMatch = snarkyCS.rows === sparkyCS.rows;
    
    // Check for coefficient corruption
    let hasCorruption = false;
    if (sparkyCS.gates.length > 0) {
      hasCorruption = sparkyCS.gates.some(gate => 
        gate.coeffs.some(coeff => BigInt(coeff) > 10n ** 50n)
      );
    }
    
    const passed = gateCountMatch && rowCountMatch && !hasCorruption;
    
    if (passed) {
      console.log(`  ✅ PASS - ${snarkyCS.gates.length} gates`);
      passing++;
    } else {
      console.log(`  ❌ FAIL - Snarky: ${snarkyCS.gates.length} gates, Sparky: ${sparkyCS.gates.length} gates${hasCorruption ? ' (coefficient corruption)' : ''}`);
    }
    
  } catch (error) {
    console.log(`  ❌ ERROR - ${error.message}`);
  }
  
  console.log('');
}

// Run quick tests
async function runQuickTests() {
  // Test 1: Simple equality
  await quickTest('Simple Equality', () => {
    const x = Provable.witness(Field, () => Field(1));
    x.assertEquals(Field(1));
  });
  
  // Test 2: Variable equality
  await quickTest('Variable Equality', () => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(5));
    x.assertEquals(y);
  });
  
  // Test 3: Addition
  await quickTest('Addition', () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    const z = x.add(y);
    z.assertEquals(Field(7));
  });
  
  // Test 4: Multiplication
  await quickTest('Multiplication', () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(7));
    const z = x.mul(y);
    z.assertEquals(Field(21));
  });
  
  // Summary
  const successRate = ((passing / total) * 100).toFixed(1);
  console.log('SUMMARY');
  console.log('=======');
  console.log(`Passing: ${passing}/${total} (${successRate}%)`);
  console.log(`Status: ${passing === total ? '🎉 ALL PASSING' : '❌ ISSUES DETECTED'}`);
  
  if (passing < total) {
    console.log('\n🚨 CRITICAL ISSUES DETECTED:');
    console.log('  - Constraint generation incompatibilities');
    console.log('  - Potential coefficient corruption');
    console.log('  - VK parity will be 0% until fixed');
    console.log('\n  See VK_PARITY_INVESTIGATION_REPORT.md for details');
  }
}

runQuickTests().catch(console.error);