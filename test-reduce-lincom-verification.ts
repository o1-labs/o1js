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
      }
    },
    {
      name: 'Multiplication by constant',
      test: () => {
        const x = Provable.witness(Field, () => Field(5));
        const result = x.mul(Field(3));
        result.assertEquals(Field(15));
      }
    },
    {
      name: 'Linear combination optimization',
      test: () => {
        const x = Provable.witness(Field, () => Field(2));
        const y = Provable.witness(Field, () => Field(3));
        // (x + y) * 5 should optimize to single constraint
        const sum = x.add(y);
        const result = sum.mul(Field(5));
        result.assertEquals(Field(25));
      }
    },
    {
      name: 'Variable multiplication (no optimization)',
      test: () => {
        const x = Provable.witness(Field, () => Field(2));
        const y = Provable.witness(Field, () => Field(3));
        const result = x.mul(y);
        result.assertEquals(Field(6));
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log('-'.repeat(50));
    
    // Test with Snarky
    await switchBackend('snarky');
    console.log('Testing with Snarky...');
    let snarkyResult;
    try {
      snarkyResult = await Provable.constraintSystem(testCase.test);
      console.log(`✅ Snarky constraint system size: ${snarkyResult.rows}`);
      console.log(`   Constraint types: ${JSON.stringify(snarkyResult.digest)}`);
    } catch (e: any) {
      console.log(`❌ Snarky error: ${e.message}`);
    }
    
    // Test with Sparky
    await switchBackend('sparky');
    console.log('\nTesting with Sparky...');
    let sparkyResult;
    try {
      sparkyResult = await Provable.constraintSystem(testCase.test);
      console.log(`✅ Sparky constraint system size: ${sparkyResult.rows}`);
      console.log(`   Constraint types: ${JSON.stringify(sparkyResult.digest)}`);
    } catch (e: any) {
      console.log(`❌ Sparky error: ${e.message}`);
    }
    
    // Compare results
    console.log('\n📊 Comparison:');
    if (snarkyResult && sparkyResult) {
      const rowDiff = Math.abs(snarkyResult.rows - sparkyResult.rows);
      if (rowDiff === 0) {
        console.log(`✅ MATCH! Both backends generate ${snarkyResult.rows} constraint rows`);
      } else {
        console.log(`❌ MISMATCH! Snarky: ${snarkyResult.rows} rows, Sparky: ${sparkyResult.rows} rows (diff: ${rowDiff})`);
      }
      
      // Compare digest (constraint type counts)
      console.log('\n   Constraint type comparison:');
      const allTypes = new Set([...Object.keys(snarkyResult.digest), ...Object.keys(sparkyResult.digest)]);
      for (const type of allTypes) {
        const snarkyCount = snarkyResult.digest[type] || 0;
        const sparkyCount = sparkyResult.digest[type] || 0;
        if (snarkyCount === sparkyCount) {
          console.log(`   ✅ ${type}: ${snarkyCount}`);
        } else {
          console.log(`   ❌ ${type}: Snarky=${snarkyCount}, Sparky=${sparkyCount}`);
        }
      }
    }
  }
  
  console.log('\n🎯 Summary');
  console.log('==========');
  console.log('The reduce_lincom optimization should ensure both backends generate');
  console.log('identical constraint counts for multiplication patterns.');
  console.log('\nKey optimizations:');
  console.log('1. Constant folding: 3 * 4 = 12 (should generate 0 constraints)');
  console.log('2. Scale optimization: x * 3 (should generate 1 linear constraint)');
  console.log('3. Linear combination: (x + y) * c (should reduce before multiplication)');
}

testReduceLincomOptimization().catch(console.error);