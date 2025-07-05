#!/usr/bin/env node

/**
 * Test actual constraint generation between Snarky and Sparky
 * 
 * Created: July 5, 2025, 1:10 AM UTC
 * Last Modified: July 5, 2025, 1:10 AM UTC
 */

import { switchBackend, getCurrentBackend, Field, Bool, Provable, Circuit } from './dist/node/index.js';

async function testConstraintGeneration() {
  console.log('🔍 Testing Constraint Generation Between Backends\n');
  
  // Define test operations that generate constraints
  const testOperations = [
    {
      name: 'Simple Addition',
      fn: () => {
        const a = Provable.witness(Field, () => Field(5));
        const b = Provable.witness(Field, () => Field(10));
        const c = a.add(b);
        return c;
      }
    },
    {
      name: 'Simple Multiplication',
      fn: () => {
        const a = Provable.witness(Field, () => Field(3));
        const b = Provable.witness(Field, () => Field(7));
        const c = a.mul(b);
        return c;
      }
    },
    {
      name: 'Field Assertion',
      fn: () => {
        const a = Provable.witness(Field, () => Field(42));
        const b = Provable.witness(Field, () => Field(42));
        a.assertEquals(b);
        return a;
      }
    },
    {
      name: 'Boolean AND',
      fn: () => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        const c = a.and(b);
        return c;
      }
    },
    {
      name: 'Complex Expression',
      fn: () => {
        const a = Provable.witness(Field, () => Field(2));
        const b = Provable.witness(Field, () => Field(3));
        const c = Provable.witness(Field, () => Field(4));
        // (a + b) * c
        const sum = a.add(b);
        const result = sum.mul(c);
        return result;
      }
    },
    {
      name: 'Conditional (if)',
      fn: () => {
        const condition = Provable.witness(Bool, () => Bool(true));
        const thenVal = Provable.witness(Field, () => Field(100));
        const elseVal = Provable.witness(Field, () => Field(200));
        const result = Provable.if(condition, thenVal, elseVal);
        return result;
      }
    }
  ];
  
  const results = [];
  
  for (const test of testOperations) {
    console.log(`\n📊 Testing: ${test.name}`);
    console.log('=' .repeat(40));
    
    let snarkyConstraints, sparkyConstraints;
    
    // Test with Snarky
    switchBackend('snarky');
    try {
      const cs = await Provable.constraintSystem(test.fn);
      snarkyConstraints = cs.rows;
      console.log(`Snarky: ${snarkyConstraints} constraints`);
      
      // Show gate types if available
      if (cs.gates && cs.gates.length > 0) {
        const gateTypes = {};
        cs.gates.forEach(gate => {
          const type = gate.type || 'Unknown';
          gateTypes[type] = (gateTypes[type] || 0) + 1;
        });
        console.log(`  Gate types:`, gateTypes);
      }
    } catch (error) {
      console.log(`Snarky: Failed - ${error.message}`);
      snarkyConstraints = -1;
    }
    
    // Test with Sparky
    switchBackend('sparky');
    try {
      const cs = await Provable.constraintSystem(test.fn);
      sparkyConstraints = cs.rows;
      console.log(`Sparky: ${sparkyConstraints} constraints`);
      
      // Show gate types if available
      if (cs.gates && cs.gates.length > 0) {
        const gateTypes = {};
        cs.gates.forEach(gate => {
          const type = gate.type || 'Unknown';
          gateTypes[type] = (gateTypes[type] || 0) + 1;
        });
        console.log(`  Gate types:`, gateTypes);
      }
    } catch (error) {
      console.log(`Sparky: Failed - ${error.message}`);
      sparkyConstraints = -1;
    }
    
    // Compare results
    if (snarkyConstraints >= 0 && sparkyConstraints >= 0) {
      const match = snarkyConstraints === sparkyConstraints;
      const diff = sparkyConstraints - snarkyConstraints;
      console.log(`\nParity: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
      if (!match) {
        console.log(`  Difference: ${diff > 0 ? '+' : ''}${diff} constraints`);
        if (sparkyConstraints < snarkyConstraints) {
          const optimization = ((1 - sparkyConstraints/snarkyConstraints) * 100).toFixed(1);
          console.log(`  🎉 Sparky is ${optimization}% more efficient!`);
        }
      }
      
      results.push({
        test: test.name,
        snarky: snarkyConstraints,
        sparky: sparkyConstraints,
        parity: match,
        optimization: snarkyConstraints > 0 ? ((1 - sparkyConstraints/snarkyConstraints) * 100).toFixed(1) : 0
      });
    }
  }
  
  // Summary
  console.log('\n\n📊 CONSTRAINT GENERATION SUMMARY');
  console.log('=' .repeat(50));
  console.log('Test'.padEnd(25) + 'Snarky'.padEnd(10) + 'Sparky'.padEnd(10) + 'Parity'.padEnd(10) + 'Optimization');
  console.log('-' .repeat(50));
  
  let parityCount = 0;
  results.forEach(r => {
    console.log(
      r.test.padEnd(25) + 
      r.snarky.toString().padEnd(10) + 
      r.sparky.toString().padEnd(10) + 
      (r.parity ? '✅' : '❌').padEnd(10) +
      (r.optimization > 0 ? `-${r.optimization}%` : '')
    );
    if (r.parity) parityCount++;
  });
  
  console.log('-' .repeat(50));
  console.log(`Overall Parity: ${parityCount}/${results.length} (${(parityCount/results.length * 100).toFixed(0)}%)`);
  
  // Test raw constraint accumulation
  console.log('\n\n🔧 Testing Raw Constraint Accumulation');
  console.log('=' .repeat(50));
  
  // Check Sparky functions
  switchBackend('sparky');
  const sparkyInstance = globalThis.sparkyWasm || globalThis.sparky;
  if (sparkyInstance) {
    console.log('Sparky WASM functions available:');
    console.log('  - assertEqual:', typeof sparkyInstance.assertEqual);
    console.log('  - getConstraints:', typeof sparkyInstance.getConstraints);
    console.log('  - clearConstraints:', typeof sparkyInstance.clearConstraints);
    console.log('  - startConstraintAccumulation:', typeof sparkyInstance.startConstraintAccumulation);
    console.log('  - endConstraintAccumulation:', typeof sparkyInstance.endConstraintAccumulation);
    
    // Test direct constraint generation
    try {
      console.log('\nTesting direct Sparky constraint generation:');
      sparkyInstance.clearConstraints();
      sparkyInstance.startConstraintAccumulation();
      
      // Generate a simple constraint
      sparkyInstance.assertEqual([0, 0], [1, 42]); // x = 42
      
      const constraints = sparkyInstance.getConstraints();
      console.log('  Constraints after assertEqual:', constraints.length);
      
      sparkyInstance.endConstraintAccumulation();
    } catch (e) {
      console.log('  Direct constraint test failed:', e.message);
    }
  }
}

// Run the test
testConstraintGeneration().catch(console.error);