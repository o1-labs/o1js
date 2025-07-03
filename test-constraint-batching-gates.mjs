#!/usr/bin/env node
/**
 * Constraint Batching Gate Count Test
 * 
 * This test uses the correct gate counting method from the existing infrastructure
 * to verify constraint batching is working properly.
 */

import { 
  Field, 
  switchBackend, 
  getCurrentBackend,
  Provable 
} from './dist/node/index.js';

console.log('🧪 Constraint Batching Gate Count Test');
console.log('=====================================\n');

// Helper function to count constraints properly
async function countConstraints(circuit) {
  const cs = await Provable.constraintSystem(circuit);
  return cs.gates.length;
}

// Test circuits that should demonstrate batching
const testCircuits = {
  'Single assertEquals (witness variables)': async () => {
    const circuit = () => {
      const x = Provable.witness(Field, () => Field(3));
      const y = Provable.witness(Field, () => Field(3));
      x.assertEquals(y);
    };
    
    const snarkyCount = await withBackend('snarky', () => countConstraints(circuit));
    const sparkyCount = await withBackend('sparky', () => countConstraints(circuit));
    
    return { snarkyCount, sparkyCount };
  },
  
  'Two assertEquals (should batch)': async () => {
    const circuit = () => {
      const x1 = Provable.witness(Field, () => Field(3));
      const y1 = Provable.witness(Field, () => Field(3));
      x1.assertEquals(y1);  // Constraint 1
      
      const x2 = Provable.witness(Field, () => Field(5));
      const y2 = Provable.witness(Field, () => Field(5));
      x2.assertEquals(y2);  // Constraint 2 - should batch with 1
    };
    
    const snarkyCount = await withBackend('snarky', () => countConstraints(circuit));
    const sparkyCount = await withBackend('sparky', () => countConstraints(circuit));
    
    return { snarkyCount, sparkyCount };
  },
  
  'Three assertEquals (2 batched + 1 single)': async () => {
    const circuit = () => {
      const pairs = [
        [Field(1), Field(1)],
        [Field(2), Field(2)],
        [Field(3), Field(3)]
      ];
      
      for (const [a, b] of pairs) {
        const x = Provable.witness(Field, () => a);
        const y = Provable.witness(Field, () => b);
        x.assertEquals(y);
      }
    };
    
    const snarkyCount = await withBackend('snarky', () => countConstraints(circuit));
    const sparkyCount = await withBackend('sparky', () => countConstraints(circuit));
    
    return { snarkyCount, sparkyCount };
  },
  
  'Four assertEquals (should create 2 batched gates)': async () => {
    const circuit = () => {
      for (let i = 1; i <= 4; i++) {
        const x = Provable.witness(Field, () => Field(i));
        const y = Provable.witness(Field, () => Field(i));
        x.assertEquals(y);
      }
    };
    
    const snarkyCount = await withBackend('snarky', () => countConstraints(circuit));
    const sparkyCount = await withBackend('sparky', () => countConstraints(circuit));
    
    return { snarkyCount, sparkyCount };
  },
  
  'Multiple field operations (mixed constraints)': async () => {
    const circuit = () => {
      const x = Provable.witness(Field, () => Field(3));
      const y = Provable.witness(Field, () => Field(4));
      const z = x.mul(y);
      z.assertEquals(Field(12));
      
      const a = Provable.witness(Field, () => Field(5));
      const b = Provable.witness(Field, () => Field(6));
      const c = a.mul(b);
      c.assertEquals(Field(30));
    };
    
    const snarkyCount = await withBackend('snarky', () => countConstraints(circuit));
    const sparkyCount = await withBackend('sparky', () => countConstraints(circuit));
    
    return { snarkyCount, sparkyCount };
  }
};

// Helper to run code with specific backend
async function withBackend(backend, fn) {
  const original = getCurrentBackend();
  await switchBackend(backend);
  const result = await fn();
  if (original !== backend) {
    await switchBackend(original);
  }
  return result;
}

async function runBatchingTest() {
  console.log('🎯 Testing constraint batching by comparing gate counts\n');
  
  let totalTests = 0;
  let improvementTests = 0;
  let parityTests = 0;
  let regressionTests = 0;
  
  for (const [testName, testFn] of Object.entries(testCircuits)) {
    console.log(`📊 ${testName}:`);
    
    const { snarkyCount, sparkyCount } = await testFn();
    
    console.log(`  Snarky gates: ${snarkyCount}`);
    console.log(`  Sparky gates: ${sparkyCount}`);
    
    const difference = snarkyCount - sparkyCount;
    const percentChange = snarkyCount > 0 ? 
      ((sparkyCount - snarkyCount) / snarkyCount * 100).toFixed(1) : 'N/A';
    
    totalTests++;
    
    if (sparkyCount < snarkyCount) {
      console.log(`  ✅ IMPROVEMENT: ${difference} fewer gates (${percentChange}% reduction)`);
      improvementTests++;
    } else if (sparkyCount === snarkyCount) {
      console.log(`  ✅ PARITY: Same number of gates`);
      parityTests++;
    } else {
      console.log(`  ❌ REGRESSION: ${-difference} more gates (${percentChange}% increase)`);
      regressionTests++;
    }
    
    console.log('');
  }
  
  console.log('═'.repeat(60));
  console.log('📊 Summary:');
  console.log(`  Total tests: ${totalTests}`);
  console.log(`  Improvements: ${improvementTests} (${(improvementTests/totalTests*100).toFixed(1)}%)`);
  console.log(`  Parity: ${parityTests} (${(parityTests/totalTests*100).toFixed(1)}%)`);
  console.log(`  Regressions: ${regressionTests} (${(regressionTests/totalTests*100).toFixed(1)}%)`);
  console.log('');
  
  if (improvementTests > 0) {
    console.log('🎉 Constraint batching is showing improvements!');
  } else if (regressionTests === 0) {
    console.log('✅ No regressions found - constraint counts match Snarky');
  } else {
    console.log('⚠️  Some tests show higher constraint counts than Snarky');
  }
}

runBatchingTest().catch(console.error);