#!/usr/bin/env node
/**
 * Simplified assertEquals debug - just count constraints
 */

import { Field, Provable, switchBackend, getCurrentBackend } from '../../../dist/node/index.js';

async function testAssertEquals() {
  console.log('\n🔍 SIMPLIFIED assertEquals DEBUG\n');

  // Helper to safely get constraint count
  async function getConstraintCount(backend, name, circuit) {
    try {
      await switchBackend(backend);
      const cs = await Provable.constraintSystem(circuit);
      const count = cs.gates ? cs.gates.length : 0;
      console.log(`${backend.toUpperCase()} - ${name}: ${count} constraints`);
      return count;
    } catch (error) {
      console.log(`${backend.toUpperCase()} - ${name}: ERROR - ${error.message}`);
      return -1;
    }
  }

  // Test cases
  const tests = [
    {
      name: 'witness.assertEquals(constant)',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(5));
        x.assertEquals(Field(5));
      }
    },
    {
      name: 'witness1.assertEquals(witness2)',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(5));
        x.assertEquals(y);
      }
    },
    {
      name: 'x.sub(y) only',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(3));
        x.sub(y);
      }
    },
    {
      name: 'x.add(y) only',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(3));
        x.add(y);
      }
    },
    {
      name: 'result.assertEquals(0) after sub',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(5));
        const result = x.sub(y);
        result.assertEquals(Field(0));
      }
    },
    {
      name: 'simple constraint with assertMul',
      circuit: () => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(7));
        const z = x.mul(y);
        // Don't call assertEquals to isolate the mul constraint
      }
    }
  ];

  // Run all tests
  for (const test of tests) {
    console.log(`\n📊 ${test.name}`);
    const snarkyCount = await getConstraintCount('snarky', test.name, test.circuit);
    const sparkyCount = await getConstraintCount('sparky', test.name, test.circuit);
    
    if (snarkyCount >= 0 && sparkyCount >= 0) {
      const match = snarkyCount === sparkyCount;
      console.log(`Match: ${match ? '✅' : '❌'} (Snarky: ${snarkyCount}, Sparky: ${sparkyCount})`);
    }
  }

  // Direct test without constraint system wrapper
  console.log('\n\n📊 DIRECT TEST - Checking if assertEquals is called');
  
  await switchBackend('sparky');
  console.log('\nTesting direct field operations in Sparky:');
  
  try {
    // Create a simple circuit context
    const { exists, assertR1CS, assertSquare, assertMul, assertBoolean, scale } = 
      await import('../../../dist/node/bindings/js/bindings.js').then(m => m.sparky);
    
    console.log('Functions available:', { 
      exists: typeof exists,
      assertR1CS: typeof assertR1CS,
      assertSquare: typeof assertSquare,
      assertMul: typeof assertMul,
      assertBoolean: typeof assertBoolean,
      scale: typeof scale
    });
    
  } catch (error) {
    console.log('Error accessing Sparky functions:', error.message);
  }

  await switchBackend('snarky');
  console.log('\n✅ Test complete\n');
}

testAssertEquals().catch(console.error);