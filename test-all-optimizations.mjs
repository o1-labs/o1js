#!/usr/bin/env node
/**
 * Test All Optimizations
 * 
 * This test verifies that all optimizations are working correctly:
 * 1. Constraint batching
 * 2. Constant folding
 * 3. Linear combination simplification
 * 4. Union-Find wire optimization
 * 5. Witness value optimization
 */

import { 
  Field, 
  switchBackend, 
  getCurrentBackend,
  Provable 
} from './dist/node/index.js';

console.log('🧪 Testing All Sparky Optimizations');
console.log('===================================\n');

async function countConstraints(circuit) {
  const cs = await Provable.constraintSystem(circuit);
  return cs.gates.length;
}

const tests = {
  '1. Constraint Batching': async () => {
    console.log('\n📊 Testing Constraint Batching...');
    
    // Multiple constraints that should batch
    const circuit = () => {
      // These should batch into fewer gates
      for (let i = 0; i < 4; i++) {
        const x = Provable.witness(Field, () => Field(i));
        const y = Provable.witness(Field, () => Field(i + 1));
        const z = Provable.witness(Field, () => Field(i * (i + 1)));
        Provable.assertEqual(x.mul(y), z);
      }
    };
    
    await switchBackend('sparky');
    const sparkyGates = await countConstraints(circuit);
    
    console.log(`  Sparky gates: ${sparkyGates}`);
    console.log(`  Expected: ~8-10 gates (with batching)`);
    console.log(`  Without batching would be: ~16 gates`);
    
    return sparkyGates < 16; // Batching should reduce gates
  },
  
  '2. Constant Folding': async () => {
    console.log('\n📊 Testing Constant Folding...');
    
    // Operations on constants should not generate constraints
    const circuit = () => {
      const a = Field(3);
      const b = Field(5);
      
      // These should all be folded at compile time
      const c = a.add(b);  // 3 + 5 = 8
      c.assertEquals(8);    // 8 = 8 (constant check)
      
      const d = a.mul(b);  // 3 * 5 = 15
      d.assertEquals(15);   // 15 = 15 (constant check)
      
      const e = a.div(b);  // 3 / 5
      const expected = Field(3).div(Field(5));
      e.assertEquals(expected); // constant = constant
    };
    
    await switchBackend('sparky');
    const sparkyGates = await countConstraints(circuit);
    
    console.log(`  Sparky gates: ${sparkyGates}`);
    console.log(`  Expected: 0 gates (all constants folded)`);
    
    return sparkyGates === 0;
  },
  
  '3. Linear Combination Simplification': async () => {
    console.log('\n📊 Testing Linear Combination Simplification...');
    
    const circuit = () => {
      const x = Provable.witness(Field, () => Field(5));
      
      // Test identity operations
      const a = x.add(0);     // x + 0 → x
      const b = x.mul(1);     // x * 1 → x
      const c = x.mul(0);     // x * 0 → 0
      
      a.assertEquals(x);      // Should be optimized
      b.assertEquals(x);      // Should be optimized  
      c.assertEquals(0);      // Should be optimized
      
      // Test zero cancellation
      const d = x.sub(x);     // x - x → 0
      d.assertEquals(0);      // Should be optimized
    };
    
    await switchBackend('sparky');
    const sparkyGates = await countConstraints(circuit);
    
    console.log(`  Sparky gates: ${sparkyGates}`);
    console.log(`  Expected: very few gates due to simplification`);
    
    return sparkyGates < 5; // Most operations should be simplified away
  },
  
  '4. Union-Find Wire Optimization': async () => {
    console.log('\n📊 Testing Union-Find Wire Optimization...');
    
    const circuit = () => {
      const x = Provable.witness(Field, () => Field(5));
      const y = Provable.witness(Field, () => Field(5));
      const z = Provable.witness(Field, () => Field(5));
      
      // These equalities should be handled by wiring, not constraints
      x.assertEquals(y);  // x = y
      y.assertEquals(z);  // y = z
      z.assertEquals(x);  // z = x (redundant, should be optimized)
      
      // Test constant wiring
      const c = Field(10);
      const w1 = Provable.witness(Field, () => Field(10));
      const w2 = Provable.witness(Field, () => Field(10));
      
      w1.assertEquals(c);  // w1 = 10
      w2.assertEquals(c);  // w2 = 10 (should reuse constant)
    };
    
    await switchBackend('sparky');
    const sparkyGates = await countConstraints(circuit);
    
    await switchBackend('snarky');
    const snarkyGates = await countConstraints(circuit);
    
    console.log(`  Sparky gates: ${sparkyGates}`);
    console.log(`  Snarky gates: ${snarkyGates}`);
    console.log(`  Expected: Similar to Snarky (uses wiring, not constraints)`);
    
    return sparkyGates <= snarkyGates + 2; // Should be close to Snarky
  },
  
  '5. Witness Value Optimization': async () => {
    console.log('\n📊 Testing Witness Value Optimization...');
    
    const circuit = () => {
      const x = Provable.witness(Field, () => Field(5));
      
      // This runs only during proving, not constraint generation
      Provable.asProver(() => {
        // These operations should NOT generate constraints
        const y = x.mul(2);
        const z = y.add(3);
        z.assertEquals(13); // 5*2 + 3 = 13
      });
      
      // This SHOULD generate a constraint
      x.assertEquals(5);
    };
    
    await switchBackend('sparky');
    const sparkyGates = await countConstraints(circuit);
    
    console.log(`  Sparky gates: ${sparkyGates}`);
    console.log(`  Expected: 1-2 gates (only the constraint outside asProver)`);
    
    return sparkyGates <= 2; // Only constraints outside asProver
  }
};

async function runAllTests() {
  let passed = 0;
  let total = 0;
  
  for (const [name, test] of Object.entries(tests)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔬 ${name}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const result = await test();
      total++;
      
      if (result) {
        console.log(`  ✅ PASSED`);
        passed++;
      } else {
        console.log(`  ❌ FAILED`);
      }
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
      total++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Final Results');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Total tests: ${total}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${total - passed}`);
  console.log(`  Success rate: ${(passed/total*100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All optimizations are working correctly!');
    console.log('Sparky now has feature parity with Snarky for constraint generation.');
  } else {
    console.log('\n⚠️  Some optimizations need more work.');
  }
}

runAllTests().catch(console.error);