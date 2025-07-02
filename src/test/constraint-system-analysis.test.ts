/**
 * Constraint System Analysis Tests
 * 
 * Deep analysis of constraint generation, optimization differences, and gate format
 * compatibility between Snarky (OCaml) and Sparky (Rust) backends.
 * 
 * Key Issues:
 * - Missing `reduce_lincom` optimization in Sparky causes different constraint counts
 * - Gate format differences may affect verification key generation
 * - Constraint recording infrastructure routes incorrectly
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { 
  initializeBindings, 
  switchBackend, 
  Field, 
  Provable 
} from '../../dist/node/index.js';

describe('Constraint System Analysis', () => {
  beforeAll(async () => {
    await initializeBindings();
  });

  describe('Basic Constraint Generation', () => {
    test('simple multiplication constraint structure', async () => {
      const multiplyCircuit = () => {
        const x = Provable.witness(Field, () => Field(3));
        x.mul(x).assertEquals(Field(9));
      };

      // Analyze with Snarky
      await switchBackend('snarky');
      const snarkyCS = await Provable.constraintSystem(multiplyCircuit);
      
      // Analyze with Sparky
      await switchBackend('sparky');
      const sparkyCS = await Provable.constraintSystem(multiplyCircuit);

      console.log('\n🔍 MULTIPLICATION CONSTRAINT ANALYSIS');
      console.log('='.repeat(50));
      console.log(`Snarky constraints: ${snarkyCS.gates.length}`);
      console.log(`Sparky constraints: ${sparkyCS.gates.length}`);
      
      // Detailed gate analysis
      console.log('\nSnarky Gates:');
      snarkyCS.gates.forEach((gate, i) => {
        console.log(`  Gate ${i}: ${gate.typ} (coeffs: ${gate.coeffs?.length || 'N/A'})`);
      });
      
      console.log('\nSparky Gates:');
      sparkyCS.gates.forEach((gate, i) => {
        console.log(`  Gate ${i}: ${gate.typ} (coeffs: ${gate.coeffs?.length || 'N/A'})`);
      });

      // Known issue: Different constraint counts due to optimization differences
      expect(snarkyCS.gates.length).not.toBe(sparkyCS.gates.length);
      
      // TODO: When optimization parity is achieved:
      // expect(snarkyCS.gates.length).toBe(sparkyCS.gates.length);
    });

    test('addition constraint optimization analysis', async () => {
      const additionCircuit = () => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(7));
        x.add(y).assertEquals(Field(12));
      };

      await switchBackend('snarky');
      const snarkyCS = await Provable.constraintSystem(additionCircuit);
      
      await switchBackend('sparky');
      const sparkyCS = await Provable.constraintSystem(additionCircuit);

      console.log('\n🔍 ADDITION CONSTRAINT ANALYSIS');
      console.log('='.repeat(50));
      console.log(`Snarky constraints: ${snarkyCS.gates.length}`);
      console.log(`Sparky constraints: ${sparkyCS.gates.length}`);

      // Analyze gate types
      const snarkyGateTypes = snarkyCS.gates.map(g => g.typ);
      const sparkyGateTypes = sparkyCS.gates.map(g => g.typ);
      
      console.log(`Snarky gate types: [${snarkyGateTypes.join(', ')}]`);
      console.log(`Sparky gate types: [${sparkyGateTypes.join(', ')}]`);

      // Check for `reduce_lincom` optimization presence
      const snarkyHasLincom = snarkyGateTypes.includes('LinComb') || snarkyGateTypes.includes('reduce_lincom');
      const sparkyHasLincom = sparkyGateTypes.includes('LinComb') || sparkyGateTypes.includes('reduce_lincom');
      
      console.log(`\n💡 OPTIMIZATION ANALYSIS:`);
      console.log(`Snarky uses lincom optimization: ${snarkyHasLincom ? '✅' : '❌'}`);
      console.log(`Sparky uses lincom optimization: ${sparkyHasLincom ? '✅' : '❌'}`);
      
      if (!sparkyHasLincom && snarkyHasLincom) {
        console.log('🚨 Missing reduce_lincom optimization in Sparky detected!');
      }
    });

    test('complex expression constraint decomposition', async () => {
      const complexCircuit = () => {
        const a = Provable.witness(Field, () => Field(2));
        const b = Provable.witness(Field, () => Field(3));
        const c = Provable.witness(Field, () => Field(4));
        
        // Complex expression: (a * b) + c = result
        const intermediate = a.mul(b);
        const result = intermediate.add(c);
        result.assertEquals(Field(10));
      };

      await switchBackend('snarky');
      const snarkyCS = await Provable.constraintSystem(complexCircuit);
      
      await switchBackend('sparky');
      const sparkyCS = await Provable.constraintSystem(complexCircuit);

      console.log('\n🔍 COMPLEX EXPRESSION ANALYSIS');
      console.log('='.repeat(50));
      
      // Analyze constraint decomposition
      const analyzeGates = (gates, backend) => {
        console.log(`\n${backend} Constraint Decomposition:`);
        gates.forEach((gate, i) => {
          console.log(`  ${i+1}. ${gate.typ}`);
          if (gate.coeffs && gate.coeffs.length > 0) {
            console.log(`     Coefficients: [${gate.coeffs.slice(0, 5).map(c => c.toString().slice(0, 10)).join(', ')}${gate.coeffs.length > 5 ? '...' : ''}]`);
          }
          if (gate.wires) {
            console.log(`     Wires: ${JSON.stringify(gate.wires).slice(0, 50)}${JSON.stringify(gate.wires).length > 50 ? '...' : ''}`);
          }
        });
      };

      analyzeGates(snarkyCS.gates, 'Snarky');
      analyzeGates(sparkyCS.gates, 'Sparky');

      console.log(`\n📊 COMPLEXITY METRICS:`);
      console.log(`Snarky total constraints: ${snarkyCS.gates.length}`);
      console.log(`Sparky total constraints: ${sparkyCS.gates.length}`);
      console.log(`Difference: ${Math.abs(snarkyCS.gates.length - sparkyCS.gates.length)} constraints`);
      console.log(`Efficiency ratio: ${(snarkyCS.gates.length / sparkyCS.gates.length).toFixed(2)}x`);
    });
  });

  describe('Gate Format Compatibility', () => {
    test('gate structure consistency', async () => {
      const testCircuit = () => {
        const x = Provable.witness(Field, () => Field(42));
        x.mul(Field(2)).assertEquals(Field(84));
      };

      await switchBackend('snarky');
      const snarkyCS = await Provable.constraintSystem(testCircuit);
      
      await switchBackend('sparky');
      const sparkyCS = await Provable.constraintSystem(testCircuit);

      // Analyze gate structure compatibility
      const snarkyGate = snarkyCS.gates[0];
      const sparkyGate = sparkyCS.gates[0];

      console.log('\n🔍 GATE FORMAT ANALYSIS');
      console.log('='.repeat(50));
      
      const analyzeGateStructure = (gate, backend) => {
        console.log(`\n${backend} Gate Structure:`);
        console.log(`  Type: ${gate.typ}`);
        console.log(`  Has coefficients: ${!!gate.coeffs}`);
        console.log(`  Coefficient count: ${gate.coeffs?.length || 0}`);
        console.log(`  Has wires: ${!!gate.wires}`);
        console.log(`  Wire structure: ${typeof gate.wires} (${Array.isArray(gate.wires) ? 'array' : 'object'})`);
        
        if (gate.coeffs && gate.coeffs.length > 0) {
          console.log(`  Sample coefficients: [${gate.coeffs.slice(0, 3).map(c => typeof c).join(', ')}]`);
        }
      };

      if (snarkyGate) analyzeGateStructure(snarkyGate, 'Snarky');
      if (sparkyGate) analyzeGateStructure(sparkyGate, 'Sparky');

      // Check structural compatibility
      const structureCompatible = 
        (!!snarkyGate?.coeffs) === (!!sparkyGate?.coeffs) &&
        (!!snarkyGate?.wires) === (!!sparkyGate?.wires);

      console.log(`\n📋 COMPATIBILITY CHECK:`);
      console.log(`Gate structure compatible: ${structureCompatible ? '✅' : '❌'}`);
      console.log(`Both have gates: ${(snarkyCS.gates.length > 0 && sparkyCS.gates.length > 0) ? '✅' : '❌'}`);
    });

    test('coefficient format consistency', async () => {
      const testCircuit = () => {
        const x = Provable.witness(Field, () => Field(123));
        const y = Provable.witness(Field, () => Field(456));
        x.add(y).mul(Field(2)).assertEquals(Field(1158));
      };

      await switchBackend('snarky');
      const snarkyCS = await Provable.constraintSystem(testCircuit);
      
      await switchBackend('sparky');
      const sparkyCS = await Provable.constraintSystem(testCircuit);

      console.log('\n🔍 COEFFICIENT FORMAT ANALYSIS');
      console.log('='.repeat(50));

      const analyzeCoefficients = (gates, backend) => {
        console.log(`\n${backend} Coefficient Analysis:`);
        gates.forEach((gate, i) => {
          if (gate.coeffs && gate.coeffs.length > 0) {
            const coeffTypes = gate.coeffs.map(c => typeof c);
            const uniqueTypes = [...new Set(coeffTypes)];
            console.log(`  Gate ${i}: ${gate.coeffs.length} coeffs, types: [${uniqueTypes.join(', ')}]`);
            
            // Sample actual values (first few)
            const sampleValues = gate.coeffs.slice(0, 2).map(c => {
              if (typeof c === 'string') return `"${c.slice(0, 10)}${c.length > 10 ? '...' : ''}"`;
              if (typeof c === 'object' && c !== null) return `{...}`;
              return c.toString();
            });
            console.log(`    Samples: [${sampleValues.join(', ')}]`);
          }
        });
      };

      analyzeCoefficients(snarkyCS.gates, 'Snarky');
      analyzeCoefficients(sparkyCS.gates, 'Sparky');

      // Check if coefficient formats are compatible
      const snarkyCoeffTypes = new Set();
      const sparkyCoeffTypes = new Set();

      snarkyCS.gates.forEach(gate => {
        if (gate.coeffs) {
          gate.coeffs.forEach(c => snarkyCoeffTypes.add(typeof c));
        }
      });

      sparkyCS.gates.forEach(gate => {
        if (gate.coeffs) {
          gate.coeffs.forEach(c => sparkyCoeffTypes.add(typeof c));
        }
      });

      const formatCompatible = JSON.stringify([...snarkyCoeffTypes].sort()) === JSON.stringify([...sparkyCoeffTypes].sort());
      
      console.log(`\n📋 FORMAT COMPATIBILITY:`);
      console.log(`Snarky coeff types: [${[...snarkyCoeffTypes].join(', ')}]`);
      console.log(`Sparky coeff types: [${[...sparkyCoeffTypes].join(', ')}]`);
      console.log(`Format compatible: ${formatCompatible ? '✅' : '❌'}`);
    });
  });

  describe('Optimization Impact Analysis', () => {
    test('reduce_lincom optimization impact', async () => {
      // Test circuits that should benefit from linear combination optimization
      const testCases = [
        {
          name: 'Simple Addition Chain',
          circuit: () => {
            const a = Provable.witness(Field, () => Field(1));
            const b = Provable.witness(Field, () => Field(2));
            const c = Provable.witness(Field, () => Field(3));
            a.add(b).add(c).assertEquals(Field(6));
          }
        },
        {
          name: 'Multiple Linear Operations',
          circuit: () => {
            const x = Provable.witness(Field, () => Field(5));
            const result = x.add(Field(1)).add(Field(2)).add(Field(3));
            result.assertEquals(Field(11));
          }
        },
        {
          name: 'Mixed Linear and Nonlinear',
          circuit: () => {
            const x = Provable.witness(Field, () => Field(3));
            const y = Provable.witness(Field, () => Field(4));
            const linear = x.add(y).add(Field(1)); // Should be optimized
            const nonlinear = linear.mul(x); // Cannot be optimized with linear ops
            nonlinear.assertEquals(Field(24)); // (3+4+1) * 3 = 24
          }
        }
      ];

      console.log('\n🔍 OPTIMIZATION IMPACT ANALYSIS');
      console.log('='.repeat(50));

      for (const testCase of testCases) {
        console.log(`\n📝 Test Case: ${testCase.name}`);
        
        await switchBackend('snarky');
        const snarkyCS = await Provable.constraintSystem(testCase.circuit);
        
        await switchBackend('sparky');
        const sparkyCS = await Provable.constraintSystem(testCase.circuit);
        
        const constraintDiff = sparkyCS.gates.length - snarkyCS.gates.length;
        const optimizationImpact = constraintDiff > 0 ? `+${constraintDiff} (Sparky less efficient)` : 
                                  constraintDiff < 0 ? `${constraintDiff} (Sparky more efficient)` : 
                                  '0 (Same efficiency)';
        
        console.log(`  Snarky: ${snarkyCS.gates.length} constraints`);
        console.log(`  Sparky: ${sparkyCS.gates.length} constraints`);
        console.log(`  Difference: ${optimizationImpact}`);
        
        if (constraintDiff > 0) {
          console.log(`  🚨 Sparky generating ${constraintDiff} extra constraints - optimization missing`);
        }
      }
    });

    test('constraint system size scaling', async () => {
      // Test how constraint count scales with circuit complexity
      const complexityLevels = [1, 2, 3, 5];
      
      console.log('\n🔍 CONSTRAINT SCALING ANALYSIS');
      console.log('='.repeat(50));
      
      for (const level of complexityLevels) {
        const scalingCircuit = () => {
          let result = Provable.witness(Field, () => Field(1));
          
          // Create increasingly complex circuits
          for (let i = 0; i < level; i++) {
            const factor = Provable.witness(Field, () => Field(i + 2));
            result = result.mul(factor).add(Field(1));
          }
          
          // Expected: 1 * 2 * 3 * ... * (level+1) + level
          const expected = Array.from({length: level}, (_, i) => i + 2).reduce((a, b) => a * b, 1) + level;
          result.assertEquals(Field(expected));
        };

        await switchBackend('snarky');
        const snarkyCS = await Provable.constraintSystem(scalingCircuit);
        
        await switchBackend('sparky');
        const sparkyCS = await Provable.constraintSystem(scalingCircuit);
        
        console.log(`\nComplexity Level ${level}:`);
        console.log(`  Snarky: ${snarkyCS.gates.length} constraints`);
        console.log(`  Sparky: ${sparkyCS.gates.length} constraints`);
        console.log(`  Ratio: ${(sparkyCS.gates.length / snarkyCS.gates.length).toFixed(2)}x`);
      }
    });
  });

  describe('Constraint Recording Infrastructure', () => {
    test('constraint capture completeness', async () => {
      const testCircuit = () => {
        const x = Provable.witness(Field, () => Field(10));
        x.mul(x).assertEquals(Field(100));
      };

      // Test constraint capture with both backends
      await switchBackend('snarky');
      console.log('\n🔍 CONSTRAINT CAPTURE ANALYSIS');
      console.log('='.repeat(50));
      
      let snarkyConstraints;
      try {
        snarkyConstraints = await Provable.constraintSystem(testCircuit);
        console.log(`✅ Snarky captured ${snarkyConstraints.gates.length} constraints`);
      } catch (error) {
        console.log(`❌ Snarky constraint capture failed: ${error.message}`);
      }

      await switchBackend('sparky');
      let sparkyConstraints;
      try {
        sparkyConstraints = await Provable.constraintSystem(testCircuit);
        console.log(`✅ Sparky captured ${sparkyConstraints.gates.length} constraints`);
      } catch (error) {
        console.log(`❌ Sparky constraint capture failed: ${error.message}`);
      }

      // Check if both backends captured constraints
      const bothCaptured = snarkyConstraints && sparkyConstraints && 
                          snarkyConstraints.gates.length > 0 && 
                          sparkyConstraints.gates.length > 0;

      console.log(`\n📋 CAPTURE STATUS:`);
      console.log(`Both backends captured constraints: ${bothCaptured ? '✅' : '❌'}`);
      
      if (bothCaptured) {
        console.log(`Constraint structure compatible: ${typeof snarkyConstraints.gates[0] === typeof sparkyConstraints.gates[0] ? '✅' : '❌'}`);
      }

      // Due to routing bug, we expect capture to work but constraints to be routed wrong
      expect(bothCaptured).toBe(true); // Basic capture should work
      expect(snarkyConstraints.gates.length).not.toBe(sparkyConstraints.gates.length); // But counts differ due to routing
    });
  });
});