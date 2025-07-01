/**
 * VK Investigation Test
 * 
 * Deep investigation into why Sparky generates different VKs than Snarky
 * and why all Sparky programs generate the same VK hash.
 */

import { Field, ZkProgram, Provable, switchBackend } from 'o1js';
import { ConstraintSystemAnalyzer } from '../tools/constraint-system-analyzer';

describe('VK Deep Investigation', () => {
  const analyzer = new ConstraintSystemAnalyzer('./constraint-analysis');

  // Define multiple test programs with different complexity
  const testPrograms = {
    // Simplest possible program
    minimal: ZkProgram({
      name: 'MinimalProgram',
      publicInput: Field,
      methods: {
        prove: {
          privateInputs: [],
          async method(publicInput) {
            publicInput.assertEquals(Field(42));
          }
        }
      }
    }),

    // Single operation
    singleOp: ZkProgram({
      name: 'SingleOpProgram',
      publicInput: Field,
      methods: {
        prove: {
          privateInputs: [Field],
          async method(publicInput, x) {
            x.assertEquals(publicInput);
          }
        }
      }
    }),

    // Different operation type
    multiplication: ZkProgram({
      name: 'MultiplicationProgram',
      publicInput: Field,
      methods: {
        prove: {
          privateInputs: [Field],
          async method(publicInput, x) {
            x.mul(x).assertEquals(publicInput);
          }
        }
      }
    }),

    // Linear combination that should trigger reduction
    linearReduction: ZkProgram({
      name: 'LinearReductionProgram',
      publicInput: Field,
      methods: {
        prove: {
          privateInputs: [Field],
          async method(publicInput, x) {
            // x + x + x should reduce to 3*x
            x.add(x).add(x).assertEquals(publicInput);
          }
        }
      }
    }),

    // Complex program
    complex: ZkProgram({
      name: 'ComplexProgram',
      publicInput: Field,
      methods: {
        prove: {
          privateInputs: [Field, Field, Field],
          async method(publicInput, a, b, c) {
            const ab = a.mul(b);
            const bc = b.mul(c);
            const ac = a.mul(c);
            ab.add(bc).add(ac).assertEquals(publicInput);
          }
        }
      }
    })
  };

  it('should analyze all test programs and generate report', async () => {
    const comparisons = [];

    for (const [name, program] of Object.entries(testPrograms)) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Analyzing ${name}`);
      console.log('='.repeat(60));
      
      const comparison = await analyzer.compareProgram(program, name);
      comparisons.push(comparison);
      
      // Log immediate findings
      console.log(`\nQuick findings for ${name}:`);
      console.log(`- Gate count difference: ${comparison.differences.gateCountDiff}`);
      console.log(`- VK hash match: ${comparison.differences.vkHashMatch}`);
      console.log(`- Snarky VK hash: ${comparison.snarky.verificationKey?.hash.substring(0, 20)}...`);
      console.log(`- Sparky VK hash: ${comparison.sparky.verificationKey?.hash.substring(0, 20)}...`);
    }

    // Generate comprehensive report
    const report = analyzer.generateReport(comparisons);
    console.log('\n' + '='.repeat(60));
    console.log('ANALYSIS COMPLETE - See ./constraint-analysis/analysis-report.md');
    console.log('='.repeat(60));

    // Check for the critical issue
    const sparkyHashes = comparisons.map(c => c.sparky.verificationKey?.hash);
    const uniqueSparkyHashes = new Set(sparkyHashes);
    
    if (uniqueSparkyHashes.size === 1 && comparisons.length > 1) {
      console.error('\n🚨 CRITICAL ISSUE CONFIRMED:');
      console.error(`All ${comparisons.length} different programs generate the SAME Sparky VK hash!`);
      console.error(`Hash: ${sparkyHashes[0]}`);
      console.error('This indicates Sparky is not properly differentiating between programs.');
    }

    // All comparisons should show VK differences (for now)
    expect(comparisons.every(c => !c.differences.vkHashMatch)).toBe(true);
  }, 300000); // 5 minute timeout

  it('should investigate Sparky VK generation process', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('INVESTIGATING SPARKY VK GENERATION');
    console.log('='.repeat(60));

    await switchBackend('sparky');

    // Try to access internal Sparky state
    console.log('\nChecking Sparky internal state...');
    
    // Compile two different programs and check if CS differs
    const { verificationKey: vk1 } = await testPrograms.minimal.compile();
    const { verificationKey: vk2 } = await testPrograms.complex.compile();

    console.log('\nVK comparison:');
    console.log(`Minimal program VK: ${vk1.hash.toString().substring(0, 30)}...`);
    console.log(`Complex program VK: ${vk2.hash.toString().substring(0, 30)}...`);
    console.log(`VKs are identical: ${vk1.hash.toString() === vk2.hash.toString()}`);

    // Try to get raw constraint system
    try {
      const { Snarky } = await import('../../bindings.js');
      
      // Enter CS mode and compile minimal program
      console.log('\nTrying to capture raw constraint system...');
      const cs1 = Snarky.run.enterConstraintSystem();
      await testPrograms.minimal.compile();
      const rawCS1 = cs1();
      
      // Enter CS mode and compile complex program  
      const cs2 = Snarky.run.enterConstraintSystem();
      await testPrograms.complex.compile();
      const rawCS2 = cs2();

      console.log('Raw CS1:', rawCS1 ? 'captured' : 'null');
      console.log('Raw CS2:', rawCS2 ? 'captured' : 'null');
      
      // Try to convert to JSON to see structure
      try {
        const cs1Json = Snarky.constraintSystem.toJson({});
        const cs2Json = Snarky.constraintSystem.toJson({});
        console.log('CS1 gates:', (cs1Json as any).gates?.length || 0);
        console.log('CS2 gates:', (cs2Json as any).gates?.length || 0);
      } catch (jsonError) {
        console.log('Could not get CS JSON');
      }
    } catch (e: any) {
      console.log('Could not access raw CS:', e.message);
    }

    await switchBackend('snarky');
  }, 120000);

  it('should trace constraint generation step by step', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('CONSTRAINT GENERATION TRACE');
    console.log('='.repeat(60));

    // Simple program that should generate exactly one constraint
    const OneConstraintProgram = ZkProgram({
      name: 'OneConstraint',
      publicInput: Field,
      methods: {
        prove: {
          privateInputs: [Field],
          async method(publicInput, x) {
            // Single equality constraint
            x.assertEquals(publicInput);
          }
        }
      }
    });

    for (const backend of ['snarky', 'sparky']) {
      console.log(`\n--- ${backend.toUpperCase()} ---`);
      await switchBackend(backend as any);
      
      const { verificationKey } = await OneConstraintProgram.compile();
      console.log(`VK hash: ${verificationKey.hash.toString()}`);
      console.log(`VK data length: ${verificationKey.data.length}`);
      console.log(`First 100 chars: ${verificationKey.data.substring(0, 100)}`);
    }

    await switchBackend('snarky');
  });
});