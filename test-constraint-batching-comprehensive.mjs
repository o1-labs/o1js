#!/usr/bin/env node
/**
 * Comprehensive Constraint Batching Test
 * 
 * This test measures actual constraint counts to verify that the constraint
 * batching implementation is working correctly.
 */

import { 
  Field, 
  switchBackend, 
  getCurrentBackend,
  Provable 
} from './dist/node/index.js';

console.log('🧪 Comprehensive Constraint Batching Test');
console.log('=========================================\n');

async function measureConstraints(backend, testName, circuitFn) {
  console.log(`\n📊 Testing ${testName} with ${backend} backend:`);
  
  try {
    await switchBackend(backend);
    
    // Measure constraint system
    const cs = await Provable.constraintSystem(() => {
      circuitFn();
    });
    
    console.log(`  Gates: ${cs.gates?.length || 0}`);
    console.log(`  Public inputs: ${cs.publicInputSize}`);
    
    // Log first few gates for inspection
    if (cs.gates && cs.gates.length > 0) {
      console.log(`  First gate type: ${cs.gates[0].typ}`);
      console.log(`  First gate coeffs: ${cs.gates[0].coeffs?.length || 0}`);
      console.log(`  First gate wires: ${cs.gates[0].wires?.length || 0}`);
    }
    
    return {
      gates: cs.gates?.length || 0,
      publicInputSize: cs.publicInputSize,
      backend
    };
    
  } catch (error) {
    console.error(`  ❌ Error with ${backend}:`, error.message);
    return null;
  }
}

// Test circuits with different numbers of constraints
const testCircuits = {
  'Single assertEquals': () => {
    const x = Field(3);
    const y = Field(3);
    x.assertEquals(y);
  },
  
  'Two assertEquals (should batch)': () => {
    const x = Field(3);
    const y = Field(3);
    const z = Field(5);
    const w = Field(5);
    
    x.assertEquals(y);  // Constraint 1
    z.assertEquals(w);  // Constraint 2 - should batch with 1
  },
  
  'Three assertEquals (2 batched + 1 single)': () => {
    const a = Field(1);
    const b = Field(1);
    const c = Field(2);
    const d = Field(2);
    const e = Field(3);
    const f = Field(3);
    
    a.assertEquals(b);  // Constraint 1
    c.assertEquals(d);  // Constraint 2 - should batch with 1
    e.assertEquals(f);  // Constraint 3 - should be single gate
  },
  
  'Four assertEquals (should create 2 batched gates)': () => {
    const x1 = Field(1), y1 = Field(1);
    const x2 = Field(2), y2 = Field(2);
    const x3 = Field(3), y3 = Field(3);
    const x4 = Field(4), y4 = Field(4);
    
    x1.assertEquals(y1);  // Batch 1
    x2.assertEquals(y2);  // Batch 1
    x3.assertEquals(y3);  // Batch 2
    x4.assertEquals(y4);  // Batch 2
  }
};

async function runComprehensiveTest() {
  console.log('🎯 Expected Results with Constraint Batching:');
  console.log('  1 constraint  → 1 gate');
  console.log('  2 constraints → 1 batched gate (50% reduction)');
  console.log('  3 constraints → 2 gates (1 batched + 1 single)');
  console.log('  4 constraints → 2 batched gates (50% reduction)');
  
  for (const [testName, circuitFn] of Object.entries(testCircuits)) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🧪 Testing: ${testName}`);
    console.log(`${'='.repeat(50)}`);
    
    // Test with both backends
    const snarkyResult = await measureConstraints('snarky', testName, circuitFn);
    const sparkyResult = await measureConstraints('sparky', testName, circuitFn);
    
    if (snarkyResult && sparkyResult) {
      console.log(`\n📊 Comparison:`);
      console.log(`  Snarky gates: ${snarkyResult.gates}`);
      console.log(`  Sparky gates: ${sparkyResult.gates}`);
      
      const reduction = snarkyResult.gates - sparkyResult.gates;
      const percentChange = snarkyResult.gates > 0 ? 
        ((sparkyResult.gates - snarkyResult.gates) / snarkyResult.gates * 100).toFixed(1) : 'N/A';
      
      console.log(`  Gate difference: ${reduction > 0 ? '-' : '+'}${Math.abs(reduction)}`);
      console.log(`  Sparky vs Snarky: ${percentChange}%`);
      
      if (sparkyResult.gates <= snarkyResult.gates) {
        console.log(`  ✅ IMPROVEMENT: Sparky has same or fewer gates!`);
      } else {
        console.log(`  ❌ REGRESSION: Sparky has more gates than Snarky`);
      }
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log('🎯 Test Summary');
  console.log(`${'='.repeat(50)}`);
  console.log('If constraint batching is working correctly, we should see:');
  console.log('1. Sparky gate counts equal to or less than Snarky');
  console.log('2. Even numbers of constraints showing 50% reduction');
  console.log('3. Odd numbers showing optimal batching (e.g., 3→2)');
}

runComprehensiveTest().catch(console.error);