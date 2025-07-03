#!/usr/bin/env node
/**
 * Real Constraint Batching Test
 * 
 * This test uses actual constraint-generating operations to measure
 * the effectiveness of the constraint batching implementation.
 */

import { 
  Field, 
  switchBackend, 
  getCurrentBackend,
  Provable 
} from './dist/node/index.js';

console.log('🧪 Real Constraint Batching Test');
console.log('================================\n');

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
      console.log(`  First gate: ${JSON.stringify(cs.gates[0], null, 2).substring(0, 100)}...`);
    }
    
    return {
      gates: cs.gates?.length || 0,
      publicInputSize: cs.publicInputSize,
      backend,
      gateTypes: cs.gates?.map(g => g.typ) || []
    };
    
  } catch (error) {
    console.error(`  ❌ Error with ${backend}:`, error.message);
    return null;
  }
}

// Test circuits that force constraint generation
const testCircuits = {
  'Single field multiplication': () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    const z = x.mul(y);
    // Assert result equals expected value
    z.assertEquals(Field(12));
  },
  
  'Two field multiplications (should batch)': () => {
    const x1 = Provable.witness(Field, () => Field(3));
    const y1 = Provable.witness(Field, () => Field(4));
    const z1 = x1.mul(y1);
    z1.assertEquals(Field(12));  // Constraint 1
    
    const x2 = Provable.witness(Field, () => Field(5));
    const y2 = Provable.witness(Field, () => Field(6));
    const z2 = x2.mul(y2);
    z2.assertEquals(Field(30));  // Constraint 2 - should batch with 1
  },
  
  'Three field multiplications (2 batched + 1 single)': () => {
    const x1 = Provable.witness(Field, () => Field(2));
    const y1 = Provable.witness(Field, () => Field(3));
    const z1 = x1.mul(y1);
    z1.assertEquals(Field(6));   // Constraint 1

    const x2 = Provable.witness(Field, () => Field(4));
    const y2 = Provable.witness(Field, () => Field(5));
    const z2 = x2.mul(y2);
    z2.assertEquals(Field(20));  // Constraint 2 - should batch with 1
    
    const x3 = Provable.witness(Field, () => Field(7));
    const y3 = Provable.witness(Field, () => Field(8));
    const z3 = x3.mul(y3);
    z3.assertEquals(Field(56));  // Constraint 3 - should be single gate
  },
  
  'Four field multiplications (should create 2 batched gates)': () => {
    const operations = [
      [Field(1), Field(2), Field(2)],
      [Field(3), Field(4), Field(12)],
      [Field(5), Field(6), Field(30)],
      [Field(7), Field(8), Field(56)]
    ];
    
    for (const [x, y, expected] of operations) {
      const wx = Provable.witness(Field, () => x);
      const wy = Provable.witness(Field, () => y);
      const result = wx.mul(wy);
      result.assertEquals(expected);
    }
  }
};

async function runRealTest() {
  console.log('🎯 Expected Results with Constraint Batching:');
  console.log('  1 constraint  → Should see constraint reduction vs without batching');
  console.log('  2 constraints → Should see ~50% reduction in constraint count');
  console.log('  3 constraints → Should see optimal batching (2 batched + 1 single)');
  console.log('  4 constraints → Should see ~50% reduction (2 batched gates)');
  
  for (const [testName, circuitFn] of Object.entries(testCircuits)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Testing: ${testName}`);
    console.log(`${'='.repeat(60)}`);
    
    // Test with both backends
    const snarkyResult = await measureConstraints('snarky', testName, circuitFn);
    const sparkyResult = await measureConstraints('sparky', testName, circuitFn);
    
    if (snarkyResult && sparkyResult) {
      console.log(`\n📊 Constraint Comparison:`);
      console.log(`  Snarky gates: ${snarkyResult.gates}`);
      console.log(`  Sparky gates: ${sparkyResult.gates}`);
      
      const reduction = snarkyResult.gates - sparkyResult.gates;
      const percentChange = snarkyResult.gates > 0 ? 
        ((sparkyResult.gates - snarkyResult.gates) / snarkyResult.gates * 100).toFixed(1) : 'N/A';
      
      console.log(`  Gate difference: ${reduction > 0 ? '-' : '+'}${Math.abs(reduction)}`);
      console.log(`  Sparky vs Snarky: ${percentChange}%`);
      
      console.log(`\n🔍 Gate Type Analysis:`);
      console.log(`  Snarky gate types: [${snarkyResult.gateTypes.join(', ')}]`);
      console.log(`  Sparky gate types: [${sparkyResult.gateTypes.join(', ')}]`);
      
      if (sparkyResult.gates <= snarkyResult.gates) {
        console.log(`  ✅ IMPROVEMENT: Sparky has same or fewer gates!`);
      } else {
        console.log(`  ❌ REGRESSION: Sparky has more gates than Snarky`);
      }
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('🎯 Test Summary');
  console.log(`${'='.repeat(60)}`);
  console.log('If constraint batching is working correctly, we should see:');
  console.log('1. Sparky constraint counts equal to or better than Snarky');
  console.log('2. Evidence of constraint batching in gate structure');
  console.log('3. Reduction in total constraint count for multiple operations');
}

runRealTest().catch(console.error);