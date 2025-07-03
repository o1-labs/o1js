#!/usr/bin/env node

/**
 * TEST: Different constraint types to isolate the issue
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function testConstraintTypes() {
  console.log('🔬 CONSTRAINT TYPES TEST');
  console.log('========================');
  
  const tests = [
    {
      name: 'Addition constraint',
      test: () => {
        const a = Provable.witness(Field, () => Field.from(3));
        const b = Provable.witness(Field, () => Field.from(4));
        const c = a.add(b);
        c.assertEquals(Field.from(7));
      }
    },
    {
      name: 'Subtraction constraint',
      test: () => {
        const a = Provable.witness(Field, () => Field.from(7));
        const b = Provable.witness(Field, () => Field.from(3));
        const c = a.sub(b);
        c.assertEquals(Field.from(4));
      }
    },
    {
      name: 'Multiplication constraint',
      test: () => {
        const a = Provable.witness(Field, () => Field.from(3));
        const b = Provable.witness(Field, () => Field.from(4));
        const c = a.mul(b);
        c.assertEquals(Field.from(12));
      }
    },
    {
      name: 'Direct assertEquals',
      test: () => {
        const a = Provable.witness(Field, () => Field.from(42));
        a.assertEquals(Field.from(42));
      }
    },
    {
      name: 'Multiple assertEquals',
      test: () => {
        const a = Provable.witness(Field, () => Field.from(10));
        const b = Provable.witness(Field, () => Field.from(10));
        a.assertEquals(b);
        b.assertEquals(Field.from(10));
      }
    }
  ];
  
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n📊 Testing ${backend.toUpperCase()}:`);
    console.log('=' .repeat(40));
    
    await switchBackend(backend);
    
    for (const { name, test } of tests) {
      try {
        await Provable.runAndCheck(test);
        console.log(`✅ ${name}: PASSED`);
      } catch (error) {
        console.log(`❌ ${name}: FAILED`);
        console.log(`   Error: ${error.message}`);
      }
    }
  }
  
  // Compare constraint counts
  console.log('\n📊 CONSTRAINT COUNT COMPARISON:');
  console.log('=' .repeat(40));
  
  for (const backend of ['snarky', 'sparky']) {
    await switchBackend(backend);
    console.log(`\n${backend.toUpperCase()}:`);
    
    // Get constraint count for multiplication
    let constraintCount = 0;
    
    await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      const c = a.mul(b);
      c.assertEquals(Field.from(12));
    }).then(cs => {
      constraintCount = cs.gates ? cs.gates.length : 0;
      console.log(`  Multiplication constraints: ${constraintCount}`);
    });
  }
}

testConstraintTypes().catch(console.error);