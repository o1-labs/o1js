import { test, describe, expect } from '@jest/globals';
import { Field, Provable, Bool, ZkProgram } from '../index.js';
import { switchBackend, getCurrentBackend } from '../bindings.js';

describe('Gate Ordering Investigation', () => {
  test('simple gate ordering comparison', async () => {
    console.log('\n=== SIMPLE GATE ORDERING TEST ===\n');

    // Create a simple zkProgram to analyze
    const SimpleProgram = ZkProgram({
      name: 'SimpleProgram',
      publicInput: Field,
      methods: {
        addAndMultiply: {
          privateInputs: [Field, Field],
          async method(sum: Field, a: Field, b: Field) {
            // Create some constraints
            a.add(b).assertEquals(sum);
            a.mul(2).assertEquals(10);
            b.sub(3).assertEquals(4);
          },
        },
      },
    });

    // Compile with both backends
    console.log('Compiling with Snarky...');
    await switchBackend('snarky');
    const snarkyResult = await SimpleProgram.compile();
    
    console.log('Compiling with Sparky...');
    await switchBackend('sparky');
    const sparkyResult = await SimpleProgram.compile();
    
    // Compare constraint systems
    console.log('\nConstraint System Comparison:');
    console.log(`Snarky constraint count: ${snarkyResult.constraintSystem.gates.length}`);
    console.log(`Sparky constraint count: ${sparkyResult.constraintSystem.gates.length}`);
    
    // Compare VK hashes
    console.log('\nVK Hash Comparison:');
    console.log(`Snarky VK hash: ${snarkyResult.verificationKey.hash}`);
    console.log(`Sparky VK hash: ${sparkyResult.verificationKey.hash}`);
    console.log(`VK Match: ${snarkyResult.verificationKey.hash === sparkyResult.verificationKey.hash ? '✓' : '✗'}`);
    
    // Analyze gate types
    console.log('\nGate Type Analysis:');
    const snarkyGates = snarkyResult.constraintSystem.gates;
    const sparkyGates = sparkyResult.constraintSystem.gates;
    
    // Count gate types
    const countGateTypes = (gates: any[]) => {
      const counts: Record<string, number> = {};
      gates.forEach(gate => {
        counts[gate.typ] = (counts[gate.typ] || 0) + 1;
      });
      return counts;
    };
    
    const snarkyCounts = countGateTypes(snarkyGates);
    const sparkyCounts = countGateTypes(sparkyGates);
    
    console.log('Snarky gate types:', snarkyCounts);
    console.log('Sparky gate types:', sparkyCounts);
    
    // Look at first few gates in detail
    console.log('\nFirst 10 gates comparison:');
    for (let i = 0; i < Math.min(10, Math.max(snarkyGates.length, sparkyGates.length)); i++) {
      const snarkyGate = snarkyGates[i];
      const sparkyGate = sparkyGates[i];
      
      if (!snarkyGate || !sparkyGate) {
        console.log(`Gate ${i}: One backend missing gate`);
        continue;
      }
      
      console.log(`Gate ${i}: Snarky=${snarkyGate.typ}, Sparky=${sparkyGate.typ}`);
      
      if (snarkyGate.typ === 'Generic' && sparkyGate.typ === 'Generic') {
        console.log(`  Snarky coeffs: ${snarkyGate.coeffs.length} coefficients`);
        console.log(`  Sparky coeffs: ${sparkyGate.coeffs.length} coefficients`);
      }
    }
  });

  test('generic constraint batching test', async () => {
    console.log('\n=== GENERIC CONSTRAINT BATCHING TEST ===\n');

    // Create a program that generates multiple generic constraints
    const BatchingProgram = ZkProgram({
      name: 'BatchingProgram',
      publicOutput: Field,
      methods: {
        generateConstraints: {
          privateInputs: [],
          async method() {
            // Generate exactly 5 generic constraints
            const a = Field(1);
            const b = Field(2);
            const c = Field(3);
            const d = Field(4);
            const e = Field(5);
            
            // These should all become generic constraints
            const r1 = a.add(b); // 1 + 2 = 3
            r1.assertEquals(c);
            
            const r2 = b.mul(Field(2)); // 2 * 2 = 4
            r2.assertEquals(d);
            
            const r3 = c.add(Field(2)); // 3 + 2 = 5
            r3.assertEquals(e);
            
            const r4 = d.sub(Field(1)); // 4 - 1 = 3
            r4.assertEquals(c);
            
            const r5 = e.div(Field(5)); // 5 / 5 = 1
            r5.assertEquals(a);
            
            return e;
          },
        },
      },
    });

    // Compile with both backends
    await switchBackend('snarky');
    const snarkyResult = await BatchingProgram.compile();
    
    await switchBackend('sparky');
    const sparkyResult = await BatchingProgram.compile();
    
    // Analyze generic gates
    const analyzeGenericGates = (gates: any[], backend: string) => {
      console.log(`\n${backend} Generic Gate Analysis:`);
      let genericCount = 0;
      let batchedCount = 0;
      let singleCount = 0;
      
      gates.forEach((gate, i) => {
        if (gate.typ === 'Generic') {
          genericCount++;
          const coeffCount = gate.coeffs.length;
          const isBatched = coeffCount === 10; // Batched gates have 10 coeffs
          
          if (isBatched) {
            batchedCount++;
            console.log(`  Gate ${i}: BATCHED (2 constraints in 1 gate)`);
          } else {
            singleCount++;
            console.log(`  Gate ${i}: SINGLE (1 constraint)`);
          }
        }
      });
      
      console.log(`  Total generic gates: ${genericCount}`);
      console.log(`  Batched gates: ${batchedCount} (handling ${batchedCount * 2} constraints)`);
      console.log(`  Single gates: ${singleCount} (handling ${singleCount} constraints)`);
      console.log(`  Total constraints handled: ${batchedCount * 2 + singleCount}`);
      
      return { genericCount, batchedCount, singleCount };
    };
    
    const snarkyStats = analyzeGenericGates(snarkyResult.constraintSystem.gates, 'Snarky');
    const sparkyStats = analyzeGenericGates(sparkyResult.constraintSystem.gates, 'Sparky');
    
    // Compare efficiency
    console.log('\nBatching Efficiency:');
    console.log(`Snarky uses ${snarkyStats.genericCount} gates for ~5 constraints`);
    console.log(`Sparky uses ${sparkyStats.genericCount} gates for ~5 constraints`);
    
    const snarkyEfficiency = snarkyStats.batchedCount > 0 ? 'WORKING' : 'NOT WORKING';
    const sparkyEfficiency = sparkyStats.batchedCount > 0 ? 'WORKING' : 'NOT WORKING';
    
    console.log(`Snarky batching: ${snarkyEfficiency}`);
    console.log(`Sparky batching: ${sparkyEfficiency}`);
  });

  test('analyze real constraint system export', async () => {
    console.log('\n=== REAL CONSTRAINT SYSTEM EXPORT ===\n');

    const TestProgram = ZkProgram({
      name: 'TestProgram',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [Field],
          async method(pub: Field, priv: Field) {
            pub.add(priv).assertEquals(Field(10));
          },
        },
      },
    });

    // Export constraint systems
    await switchBackend('snarky');
    const snarkyCS = await TestProgram.analyzeMethods();
    
    await switchBackend('sparky');
    const sparkyCS = await TestProgram.analyzeMethods();
    
    console.log('Snarky constraint system:', JSON.stringify(snarkyCS.test.gates.slice(0, 3), null, 2));
    console.log('\nSparky constraint system:', JSON.stringify(sparkyCS.test.gates.slice(0, 3), null, 2));
  });
});