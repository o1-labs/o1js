import { test, describe } from '@jest/globals';
import { switchBackend, getCurrentBackend } from '../index.js';
import { BackendTestFramework } from './BackendTestFramework.js';
import { FieldVar, Field, Gadgets, Provable } from '../index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Gate Ordering Investigation', () => {
  const framework = new BackendTestFramework();

  test('investigate gate ordering for simple constraints', async () => {
    console.log('\n=== GATE ORDERING INVESTIGATION ===\n');

    // Test 1: Multiple constraints added in sequence
    const multipleConstraintsTest = () => {
      return Provable.witness(Field, () => {
        // Create multiple constraints in a specific order
        const a = new Field(5);
        const b = new Field(7);
        const c = new Field(12);
        
        // Constraint 1: a + b = c
        a.add(b).assertEquals(c);
        
        // Constraint 2: a * 2 = 10
        a.mul(2).assertEquals(10);
        
        // Constraint 3: b - 3 = 4
        b.sub(3).assertEquals(4);
        
        return c;
      });
    };

    // Test 2: Same constraints but in different order
    const reorderedConstraintsTest = () => {
      return Provable.witness(Field, () => {
        const a = new Field(5);
        const b = new Field(7);
        const c = new Field(12);
        
        // Constraint 3: b - 3 = 4
        b.sub(3).assertEquals(4);
        
        // Constraint 1: a + b = c
        a.add(b).assertEquals(c);
        
        // Constraint 2: a * 2 = 10
        a.mul(2).assertEquals(10);
        
        return c;
      });
    };

    // Test 3: Boolean constraints ordering
    const booleanConstraintsTest = () => {
      return Provable.witness(Field, () => {
        const x = new Field(1);
        const y = new Field(0);
        const z = new Field(1);
        
        // Boolean constraints
        Gadgets.isBoolean(x);
        Gadgets.isBoolean(y);
        Gadgets.isBoolean(z);
        
        // Mixed with arithmetic
        x.add(y).assertEquals(1);
        
        return x;
      });
    };

    // Test 4: Generic constraint batching order
    const batchingOrderTest = () => {
      return Provable.witness(Field, () => {
        const vars = [];
        for (let i = 0; i < 10; i++) {
          vars.push(new Field(i));
        }
        
        // Create many generic constraints to trigger batching
        for (let i = 0; i < 9; i++) {
          vars[i].add(1).assertEquals(vars[i + 1]);
        }
        
        return vars[9];
      });
    };

    // Test 5: Poseidon hash gate placement
    const poseidonOrderTest = () => {
      return Provable.witness(Field, () => {
        const a = new Field(1);
        const b = new Field(2);
        const c = new Field(3);
        
        // Add constraint before Poseidon
        a.add(b).assertEquals(c);
        
        // Poseidon hash
        const hash = Poseidon.hash([a, b, c]);
        
        // Add constraint after Poseidon
        hash.assertNotEquals(0);
        
        return hash;
      });
    };

    // Run tests for both backends
    const tests = [
      { name: 'Multiple Constraints', fn: multipleConstraintsTest },
      { name: 'Reordered Constraints', fn: reorderedConstraintsTest },
      { name: 'Boolean Constraints', fn: booleanConstraintsTest },
      { name: 'Batching Order', fn: batchingOrderTest },
      { name: 'Poseidon Order', fn: poseidonOrderTest }
    ];

    for (const testCase of tests) {
      console.log(`\n--- Testing: ${testCase.name} ---`);
      
      // Get constraint systems from both backends
      const snarkyCS = await framework.getConstraintSystem('snarky', testCase.fn);
      const sparkyCS = await framework.getConstraintSystem('sparky', testCase.fn);
      
      // Analyze gate ordering
      console.log('\nSnarky gates:', snarkyCS.gates.length);
      console.log('Sparky gates:', sparkyCS.gates.length);
      
      // Compare gate types in order
      console.log('\nGate type sequence comparison:');
      const maxGates = Math.max(snarkyCS.gates.length, sparkyCS.gates.length);
      
      for (let i = 0; i < Math.min(10, maxGates); i++) {
        const snarkyGate = snarkyCS.gates[i];
        const sparkyGate = sparkyCS.gates[i];
        
        const snarkyType = snarkyGate ? snarkyGate.typ : 'MISSING';
        const sparkyType = sparkyGate ? sparkyGate.typ : 'MISSING';
        
        const match = snarkyType === sparkyType ? '✓' : '✗';
        console.log(`  Gate ${i}: Snarky=${snarkyType}, Sparky=${sparkyType} ${match}`);
        
        // If types match but coefficients differ, show them
        if (snarkyType === sparkyType && snarkyGate && sparkyGate) {
          const snarkyCoeffs = snarkyGate.coeffs.join(', ');
          const sparkyCoeffs = sparkyGate.coeffs.join(', ');
          
          if (snarkyCoeffs !== sparkyCoeffs) {
            console.log(`    Coeffs differ:`);
            console.log(`      Snarky: [${snarkyCoeffs}]`);
            console.log(`      Sparky: [${sparkyCoeffs}]`);
          }
        }
      }
      
      // Check VK hash
      const { snarkyVK, sparkyVK } = await framework.getVKs(testCase.fn);
      const vkMatch = snarkyVK.hash === sparkyVK.hash;
      console.log(`\nVK Hash Match: ${vkMatch ? '✓' : '✗'}`);
      
      // Save detailed constraint systems for analysis
      const testName = testCase.name.toLowerCase().replace(/\s+/g, '-');
      await fs.writeFile(
        path.join('/tmp', `gate-order-${testName}-snarky.json`),
        JSON.stringify(snarkyCS, null, 2)
      );
      await fs.writeFile(
        path.join('/tmp', `gate-order-${testName}-sparky.json`),
        JSON.stringify(sparkyCS, null, 2)
      );
    }
  });

  test('analyze generic constraint batching differences', async () => {
    console.log('\n=== GENERIC CONSTRAINT BATCHING ANALYSIS ===\n');

    // Create a test that generates exactly 5 generic constraints
    // to see how they are batched
    const genericBatchingTest = () => {
      return Provable.witness(Field, () => {
        const vars = [];
        for (let i = 0; i < 6; i++) {
          vars.push(new Field(i));
        }
        
        // Create exactly 5 generic constraints
        // In Snarky, this should create 3 gates (2 batched + 1 single)
        vars[0].add(vars[1]).assertEquals(vars[2]); // Constraint 1
        vars[1].mul(2).assertEquals(vars[3]);       // Constraint 2
        vars[2].sub(1).assertEquals(vars[4]);       // Constraint 3
        vars[3].add(vars[4]).assertEquals(vars[5]); // Constraint 4
        vars[4].mul(3).assertEquals(15);            // Constraint 5
        
        return vars[5];
      });
    };

    const snarkyCS = await framework.getConstraintSystem('snarky', genericBatchingTest);
    const sparkyCS = await framework.getConstraintSystem('sparky', genericBatchingTest);

    console.log('Snarky gates:', snarkyCS.gates.length);
    console.log('Sparky gates:', sparkyCS.gates.length);
    
    // Analyze generic gates specifically
    let snarkyGenericCount = 0;
    let sparkyGenericCount = 0;
    
    console.log('\nSnarky Generic gates:');
    snarkyCS.gates.forEach((gate, i) => {
      if (gate.typ === 'Generic') {
        snarkyGenericCount++;
        console.log(`  Gate ${i}: ${gate.coeffs.length} coefficients`);
        // Batched gates have 10 coefficients, single gates have 5
        const isBatched = gate.coeffs.length === 10;
        console.log(`    Type: ${isBatched ? 'BATCHED (2 constraints)' : 'SINGLE'}`);
      }
    });
    
    console.log('\nSparky Generic gates:');
    sparkyCS.gates.forEach((gate, i) => {
      if (gate.typ === 'Generic') {
        sparkyGenericCount++;
        console.log(`  Gate ${i}: ${gate.coeffs.length} coefficients`);
        const isBatched = gate.coeffs.length === 10;
        console.log(`    Type: ${isBatched ? 'BATCHED (2 constraints)' : 'SINGLE'}`);
      }
    });
    
    console.log(`\nGeneric gate count: Snarky=${snarkyGenericCount}, Sparky=${sparkyGenericCount}`);
    
    // Expected: Snarky should batch constraints into fewer gates
    const expectedSnarkyGates = Math.ceil(5 / 2); // 3 gates for 5 constraints
    const expectedSparkyGates = 5; // Currently Sparky doesn't batch
    
    console.log(`Expected gates: Snarky=${expectedSnarkyGates}, Sparky=${expectedSparkyGates}`);
    console.log(`Batching working: Snarky=${snarkyGenericCount === expectedSnarkyGates ? '✓' : '✗'}, Sparky=${sparkyGenericCount === expectedSnarkyGates ? '✓' : '✗'}`);
  });

  test('investigate union-find optimization impact', async () => {
    console.log('\n=== UNION-FIND OPTIMIZATION ANALYSIS ===\n');

    // Test case that should trigger union-find optimization in Snarky
    const unionFindTest = () => {
      return Provable.witness(Field, () => {
        const a = new Field(5);
        const b = new Field(5);
        const c = new Field(5);
        
        // These should be optimized by union-find
        // since they're equality constraints with same coefficients
        a.assertEquals(b);
        b.assertEquals(c);
        
        // This should create actual constraints
        a.add(1).assertEquals(6);
        
        return a;
      });
    };

    const snarkyCS = await framework.getConstraintSystem('snarky', unionFindTest);
    const sparkyCS = await framework.getConstraintSystem('sparky', unionFindTest);

    console.log('Gate counts:');
    console.log(`  Snarky: ${snarkyCS.gates.length} gates`);
    console.log(`  Sparky: ${sparkyCS.gates.length} gates`);
    
    // With union-find optimization, Snarky should have fewer constraints
    // because a=b and b=c are handled through wiring, not constraints
    const difference = sparkyCS.gates.length - snarkyCS.gates.length;
    console.log(`\nGate difference: ${difference}`);
    console.log('Union-find optimization likely active:', difference > 0 ? 'Yes' : 'No');
  });
});

// Add Poseidon import
import { Poseidon } from '../index.js';