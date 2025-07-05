#!/usr/bin/env node

/**
 * Detailed investigation of Boolean operations constraint generation
 * 
 * Created: July 5, 2025, 1:30 AM UTC
 * Last Modified: July 5, 2025, 1:30 AM UTC
 */

import { switchBackend, getCurrentBackend, Bool, Field, Provable } from './dist/node/index.js';

async function investigateBooleanOperations() {
  console.log('🔍 Boolean Operations Constraint Investigation\n');
  console.log('Analyzing why Boolean AND generates different constraint counts...\n');
  
  // Define all boolean operations to test
  const booleanOperations = [
    {
      name: 'Boolean AND',
      fn: () => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        const result = a.and(b);
        return result;
      }
    },
    {
      name: 'Boolean OR',
      fn: () => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        const result = a.or(b);
        return result;
      }
    },
    {
      name: 'Boolean NOT',
      fn: () => {
        const a = Provable.witness(Bool, () => Bool(true));
        const result = a.not();
        return result;
      }
    },
    {
      name: 'Boolean XOR',
      fn: () => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        // XOR = (a OR b) AND NOT(a AND b)
        const aOrB = a.or(b);
        const aAndB = a.and(b);
        const notAAndB = aAndB.not();
        const result = aOrB.and(notAAndB);
        return result;
      }
    },
    {
      name: 'Boolean assertEquals',
      fn: () => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(true));
        a.assertEquals(b);
        return a;
      }
    },
    {
      name: 'Boolean from Field',
      fn: () => {
        const a = Provable.witness(Field, () => Field(1));
        const result = Bool.fromFields([a]);
        return result;
      }
    }
  ];
  
  const results = [];
  
  for (const test of booleanOperations) {
    console.log(`\n📊 Testing: ${test.name}`);
    console.log('=' .repeat(50));
    
    const testResult = { name: test.name };
    
    // Test with Snarky
    switchBackend('snarky');
    try {
      const cs = await Provable.constraintSystem(test.fn);
      testResult.snarky = {
        constraints: cs.rows,
        gates: cs.gates?.length || 0,
        gateTypes: {}
      };
      
      // Analyze gate types
      if (cs.gates) {
        cs.gates.forEach(gate => {
          const type = gate.type || 'Unknown';
          testResult.snarky.gateTypes[type] = (testResult.snarky.gateTypes[type] || 0) + 1;
        });
      }
      
      console.log(`Snarky: ${cs.rows} constraints`);
      if (Object.keys(testResult.snarky.gateTypes).length > 0) {
        console.log(`  Gate types:`, testResult.snarky.gateTypes);
      }
      
      // Get the actual constraint details if available
      if (cs.json) {
        const constraintDetails = JSON.parse(cs.json);
        if (constraintDetails.gates && constraintDetails.gates.length > 0) {
          console.log('  Gate details:');
          constraintDetails.gates.slice(0, 5).forEach((gate, i) => {
            console.log(`    ${i}: ${JSON.stringify(gate).substring(0, 100)}...`);
          });
        }
      }
    } catch (error) {
      console.log(`Snarky: Failed - ${error.message}`);
      testResult.snarky = { error: error.message };
    }
    
    // Test with Sparky
    switchBackend('sparky');
    try {
      const cs = await Provable.constraintSystem(test.fn);
      testResult.sparky = {
        constraints: cs.rows,
        gates: cs.gates?.length || 0,
        gateTypes: {}
      };
      
      // Analyze gate types
      if (cs.gates) {
        cs.gates.forEach(gate => {
          const type = gate.type || 'Unknown';
          testResult.sparky.gateTypes[type] = (testResult.sparky.gateTypes[type] || 0) + 1;
        });
      }
      
      console.log(`Sparky: ${cs.rows} constraints`);
      if (Object.keys(testResult.sparky.gateTypes).length > 0) {
        console.log(`  Gate types:`, testResult.sparky.gateTypes);
      }
      
      // Show constraint optimization details from logs
      // The optimization logs will show what's happening
      
    } catch (error) {
      console.log(`Sparky: Failed - ${error.message}`);
      testResult.sparky = { error: error.message };
    }
    
    // Compare results
    if (testResult.snarky && testResult.sparky && !testResult.snarky.error && !testResult.sparky.error) {
      const match = testResult.snarky.constraints === testResult.sparky.constraints;
      const diff = testResult.sparky.constraints - testResult.snarky.constraints;
      console.log(`\nParity: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
      if (!match) {
        console.log(`  Difference: ${diff > 0 ? '+' : ''}${diff} constraints`);
        console.log(`  Snarky uses ${testResult.snarky.constraints}, Sparky uses ${testResult.sparky.constraints}`);
      }
      testResult.parity = match;
      testResult.difference = diff;
    }
    
    results.push(testResult);
  }
  
  // Summary
  console.log('\n\n📊 BOOLEAN OPERATIONS SUMMARY');
  console.log('=' .repeat(60));
  console.log('Operation'.padEnd(25) + 'Snarky'.padEnd(10) + 'Sparky'.padEnd(10) + 'Difference'.padEnd(12) + 'Parity');
  console.log('-' .repeat(60));
  
  results.forEach(r => {
    if (r.snarky && r.sparky && !r.snarky.error && !r.sparky.error) {
      console.log(
        r.name.padEnd(25) + 
        r.snarky.constraints.toString().padEnd(10) + 
        r.sparky.constraints.toString().padEnd(10) + 
        (r.difference > 0 ? '+' + r.difference : r.difference.toString()).padEnd(12) +
        (r.parity ? '✅' : '❌')
      );
    }
  });
  
  // Deep dive into Boolean AND
  console.log('\n\n🔬 Deep Dive: Boolean AND Analysis');
  console.log('=' .repeat(60));
  
  // Test with explicit boolean values
  const booleanAndTests = [
    { a: true, b: true, expected: true },
    { a: true, b: false, expected: false },
    { a: false, b: true, expected: false },
    { a: false, b: false, expected: false }
  ];
  
  console.log('\nTesting all boolean combinations:');
  for (const testCase of booleanAndTests) {
    console.log(`\n  AND(${testCase.a}, ${testCase.b}) = ${testCase.expected}`);
    
    for (const backend of ['snarky', 'sparky']) {
      switchBackend(backend);
      try {
        const cs = await Provable.constraintSystem(() => {
          const a = Provable.witness(Bool, () => Bool(testCase.a));
          const b = Provable.witness(Bool, () => Bool(testCase.b));
          const result = a.and(b);
          // Verify the result is correct
          const expectedBool = Bool(testCase.expected);
          result.assertEquals(expectedBool);
          return result;
        });
        console.log(`    ${backend}: ${cs.rows} constraints`);
      } catch (error) {
        console.log(`    ${backend}: Failed - ${error.message}`);
      }
    }
  }
  
  // Analyze the specific constraints for Boolean AND
  console.log('\n\n🔍 Constraint Structure Analysis:');
  console.log('Looking at the actual constraints generated...\n');
  
  // Test creating booleans in different ways
  console.log('Testing different boolean creation methods:');
  
  const booleanCreationTests = [
    {
      name: 'Direct Bool witness',
      fn: () => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        return a.and(b);
      }
    },
    {
      name: 'Field to Bool conversion',
      fn: () => {
        const a = Provable.witness(Field, () => Field(1));
        const b = Provable.witness(Field, () => Field(0));
        const aBool = Bool.fromFields([a]);
        const bBool = Bool.fromFields([b]);
        return aBool.and(bBool);
      }
    },
    {
      name: 'Pre-constrained booleans',
      fn: () => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        // Force boolean constraints
        a.assertEquals(a);
        b.assertEquals(b);
        return a.and(b);
      }
    }
  ];
  
  for (const test of booleanCreationTests) {
    console.log(`\n${test.name}:`);
    for (const backend of ['snarky', 'sparky']) {
      switchBackend(backend);
      try {
        const cs = await Provable.constraintSystem(test.fn);
        console.log(`  ${backend}: ${cs.rows} constraints`);
      } catch (error) {
        console.log(`  ${backend}: Failed`);
      }
    }
  }
  
  // Final hypothesis
  console.log('\n\n💡 Hypothesis:');
  console.log('Sparky generates explicit boolean check constraints for each input:');
  console.log('  - v0 * v0 = v1 (ensures v0 ∈ {0,1})');
  console.log('  - v2 * v2 = v3 (ensures v2 ∈ {0,1})');
  console.log('  - v0 * v2 = v4 (the AND operation)');
  console.log('\nSnarky might be:');
  console.log('  1. Combining boolean checks with the AND operation');
  console.log('  2. Using a different gate type that implicitly checks boolean-ness');
  console.log('  3. Assuming inputs are already boolean without explicit checks');
}

// Run the investigation
investigateBooleanOperations().catch(console.error);