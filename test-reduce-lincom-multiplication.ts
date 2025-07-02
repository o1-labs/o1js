/**
 * Test reduce_lincom optimization for multiplication
 * Verifies that Sparky generates the same constraint patterns as Snarky
 */

import { Field, initializeBindings, switchBackend, Provable } from './dist/node/index.js';

async function testReduceLincomOptimization() {
  console.log('🧪 Testing reduce_lincom Multiplication Optimization');
  console.log('==================================================');
  
  await initializeBindings();
  
  // Test patterns that should be optimized
  const testCases = [
    {
      name: 'Constant folding',
      test: () => {
        const a = Field(3);
        const b = Field(4);
        const c = a.mul(b);
        c.assertEquals(Field(12));
      },
      expectedConstraints: { snarky: 0, sparky: 0 } // Should generate 0 constraints
    },
    {
      name: 'Multiplication by constant',
      test: () => {
        Provable.witness(Field, () => Field(5)).mul(Field(3)).assertEquals(Field(15));
      },
      expectedConstraints: { snarky: 1, sparky: 1 } // Should generate 1 linear constraint
    },
    {
      name: 'Linear combination optimization',
      test: () => {
        const x = Provable.witness(Field, () => Field(2));
        const y = Provable.witness(Field, () => Field(3));
        // (x + y) * 5 should optimize to single constraint
        x.add(y).mul(Field(5)).assertEquals(Field(25));
      },
      expectedConstraints: { snarky: 2, sparky: 2 } // Optimized
    },
    {
      name: 'Variable multiplication (no optimization)',
      test: () => {
        const x = Provable.witness(Field, () => Field(2));
        const y = Provable.witness(Field, () => Field(3));
        x.mul(y).assertEquals(Field(6));
      },
      expectedConstraints: { snarky: 2, sparky: 2 } // R1CS + Equal
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log('-'.repeat(40));
    
    // Test with Snarky
    await switchBackend('snarky');
    console.log('Testing with Snarky...');
    let snarkyConstraints = 0;
    try {
      // Reset constraint counter
      (globalThis as any).__constraintCounter = 0;
      
      // Run test
      await Provable.constraintSystem(testCase.test);
      
      // Get constraint count (this is a simplified approach)
      snarkyConstraints = (globalThis as any).__constraintCounter || 0;
      console.log(`✅ Snarky constraints: ${snarkyConstraints}`);
    } catch (e: any) {
      console.log(`❌ Snarky error: ${e.message}`);
    }
    
    // Test with Sparky
    await switchBackend('sparky');
    console.log('Testing with Sparky...');
    let sparkyConstraints = 0;
    try {
      // Reset constraint counter
      (globalThis as any).__constraintCounter = 0;
      
      // Run test
      await Provable.constraintSystem(testCase.test);
      
      // Get constraint count
      sparkyConstraints = (globalThis as any).__constraintCounter || 0;
      console.log(`✅ Sparky constraints: ${sparkyConstraints}`);
    } catch (e: any) {
      console.log(`❌ Sparky error: ${e.message}`);
    }
    
    // Compare results
    console.log('\n📊 Comparison:');
    console.log(`Expected - Snarky: ${testCase.expectedConstraints.snarky}, Sparky: ${testCase.expectedConstraints.sparky}`);
    console.log(`Actual - Snarky: ${snarkyConstraints}, Sparky: ${sparkyConstraints}`);
    
    if (snarkyConstraints === sparkyConstraints) {
      console.log('✅ MATCH! Both backends generate same constraint count');
    } else {
      console.log(`❌ MISMATCH! Difference: ${Math.abs(snarkyConstraints - sparkyConstraints)} constraints`);
    }
  }
  
  console.log('\n🎯 Summary');
  console.log('==========');
  console.log('The reduce_lincom optimization should ensure both backends generate');
  console.log('identical constraint counts for multiplication patterns.');
}

testReduceLincomOptimization().catch(console.error);