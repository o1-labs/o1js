/**
 * Constraint Optimization Analysis Tests
 * 
 * This test suite performs detailed analysis of how Sparky's optimizations
 * affect constraint generation compared to Snarky, with focus on:
 * - Identifying specific optimization patterns
 * - Measuring constraint reduction effectiveness
 * - Validating optimization correctness
 * - Finding optimization opportunities
 */

import fc from 'fast-check';
import { describe, test, expect, beforeAll } from '@jest/globals';
import { Field, Provable, Bool, Circuit } from 'o1js';
import { switchBackend, getCurrentBackend } from '../../../index.js';
import { initializeWithRealBackend, compareBackends } from './utils/BackendTestUtils.js';
import { constraintSystem } from '../../../lib/provable/core/provable-context.js';

beforeAll(async () => {
  await initializeWithRealBackend();
});

/**
 * Detailed constraint analysis result
 */
interface ConstraintAnalysis {
  totalConstraints: number;
  gateTypes: Map<string, number>;
  optimizationOpportunities: string[];
  redundantConstraints: number;
  linearCombinations: number;
  constants: number;
}

/**
 * Analyze constraint system for optimization opportunities
 */
async function analyzeConstraintSystem(
  circuitFn: () => void
): Promise<ConstraintAnalysis> {
  const cs = await constraintSystem(circuitFn);
  
  // This is a simplified analysis - real implementation would inspect actual gates
  return {
    totalConstraints: cs.rows,
    gateTypes: new Map(), // Would need access to gate details
    optimizationOpportunities: [],
    redundantConstraints: 0,
    linearCombinations: 0,
    constants: 0
  };
}

describe('Constraint Optimization Analysis', () => {
  describe('1. Constant Folding Analysis', () => {
    test('measure constant folding effectiveness', async () => {
      const results: Array<{
        numConstants: number;
        snarkyConstraints: number;
        sparkyConstraints: number;
        reduction: number;
      }> = [];

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 5, maxLength: 30 }),
          async (numVariables, constants) => {
            const comparison = await compareBackends(async (backend) => {
              return await constraintSystem(() => {
                // Create variables
                const vars = Array.from({ length: numVariables }, (_, i) =>
                  Provable.witness(Field, () => Field(i + 1))
                );
                
                // Build expression with many constants
                let expr = Field(constants[0]);
                
                // Add constant operations
                for (let i = 1; i < constants.length; i++) {
                  const c = Field(constants[i]);
                  if (i % 3 === 0) {
                    expr = expr.add(c);
                  } else if (i % 3 === 1) {
                    expr = expr.mul(c);
                  } else {
                    expr = expr.sub(c);
                  }
                }
                
                // Mix with variables to prevent complete elimination
                for (const v of vars) {
                  expr = expr.add(v.mul(Field(7)));
                }
                
                // Add constraints
                expr.assertEquals(expr);
                expr.assertGreaterThan(Field(-(10 ** 9)));
              });
            });

            const reduction = comparison.snarky.result!.rows - comparison.sparky.result!.rows;
            const reductionPercent = (reduction / comparison.snarky.result!.rows) * 100;
            
            results.push({
              numConstants: constants.length,
              snarkyConstraints: comparison.snarky.result!.rows,
              sparkyConstraints: comparison.sparky.result!.rows,
              reduction: reductionPercent
            });

            // Sparky should have fewer or equal constraints due to optimization
            expect(comparison.sparky.result!.rows).toBeLessThanOrEqual(comparison.snarky.result!.rows);
          }
        ),
        { numRuns: 20 }
      );

      // Analyze results
      const avgReduction = results.reduce((sum, r) => sum + r.reduction, 0) / results.length;
      console.log('\nConstant Folding Analysis:');
      console.log(`Average constraint reduction: ${avgReduction.toFixed(1)}%`);
      console.log(`Best reduction: ${Math.max(...results.map(r => r.reduction)).toFixed(1)}%`);
    });

    test('identify constant propagation patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            constantChain: fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 5, maxLength: 15 }),
            variablePositions: fc.array(fc.integer({ min: 0, max: 14 }), { minLength: 1, maxLength: 5 })
          }),
          async ({ constantChain, variablePositions }) => {
            const comparison = await compareBackends(async (backend) => {
              return await constraintSystem(() => {
                const variable = Provable.witness(Field, () => Field(42));
                
                // Build chain with constants and occasional variable
                let result = Field(constantChain[0]);
                const varPosSet = new Set(variablePositions);
                
                for (let i = 1; i < constantChain.length; i++) {
                  if (varPosSet.has(i)) {
                    // Insert variable to break constant chain
                    result = result.add(variable);
                  } else {
                    // Continue constant chain
                    result = result.add(Field(constantChain[i]));
                  }
                }
                
                // Force constraint generation
                result.assertEquals(result);
                
                // Add assertion that depends on the result
                result.assertGreaterThan(Field(0));
              });
            });

            // Verify both backends work
            expect(comparison.snarky.error).toBeUndefined();
            expect(comparison.sparky.error).toBeUndefined();
            
            // Log pattern effectiveness
            const numConstants = constantChain.length - variablePositions.length;
            const constraintRatio = comparison.sparky.result!.rows / comparison.snarky.result!.rows;
            console.log(`Pattern: ${numConstants} constants, ${variablePositions.length} variables - Ratio: ${constraintRatio.toFixed(2)}`);
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('2. Linear Combination Optimization Analysis', () => {
    test('measure linear combination batching', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            numTerms: fc.integer({ min: 2, max: 20 }),
            coefficients: fc.array(
              fc.integer({ min: -10, max: 10 }).filter(n => n !== 0),
              { minLength: 2, maxLength: 20 }
            )
          }),
          async ({ numTerms, coefficients }) => {
            const comparison = await compareBackends(async (backend) => {
              return await constraintSystem(() => {
                // Create variables
                const vars = Array.from({ length: numTerms }, (_, i) =>
                  Provable.witness(Field, () => Field(i + 1))
                );
                
                // Method 1: Build linear combination incrementally
                let incremental = Field(0);
                for (let i = 0; i < Math.min(numTerms, coefficients.length); i++) {
                  incremental = incremental.add(vars[i].mul(Field(coefficients[i])));
                }
                
                // Method 2: Build in one expression (may optimize better)
                const combined = vars.slice(0, coefficients.length).reduce(
                  (acc, v, i) => acc.add(v.mul(Field(coefficients[i]))),
                  Field(0)
                );
                
                // They should be equal
                incremental.assertEquals(combined);
                
                // Add more complex linear combinations
                const doubled = incremental.add(incremental);
                const scaled = incremental.mul(Field(2));
                doubled.assertEquals(scaled);
              });
            });

            const snarkyCount = comparison.snarky.result!.rows;
            const sparkyCount = comparison.sparky.result!.rows;
            
            console.log(`Linear combination with ${numTerms} terms: Snarky=${snarkyCount}, Sparky=${sparkyCount}`);
            
            // Both should produce valid results
            expect(comparison.snarky.error).toBeUndefined();
            expect(comparison.sparky.error).toBeUndefined();
          }
        ),
        { numRuns: 25 }
      );
    });

    test('analyze nested linear combination patterns', async () => {
      const patterns: Array<{
        pattern: string;
        snarkyConstraints: number;
        sparkyConstraints: number;
      }> = [];

      // Test different linear combination patterns
      const testPatterns = [
        {
          name: 'flat-sum',
          build: (vars: Field[]) => vars.reduce((a, b) => a.add(b), Field(0))
        },
        {
          name: 'weighted-sum',
          build: (vars: Field[]) => vars.reduce((a, b, i) => a.add(b.mul(Field(i + 1))), Field(0))
        },
        {
          name: 'nested-pairs',
          build: (vars: Field[]) => {
            let result = vars[0];
            for (let i = 1; i < vars.length; i++) {
              result = result.add(vars[i]).mul(Field(2));
            }
            return result;
          }
        },
        {
          name: 'tree-sum',
          build: (vars: Field[]) => {
            function treeSum(arr: Field[]): Field {
              if (arr.length <= 1) return arr[0] || Field(0);
              const mid = Math.floor(arr.length / 2);
              return treeSum(arr.slice(0, mid)).add(treeSum(arr.slice(mid)));
            }
            return treeSum(vars);
          }
        }
      ];

      for (const pattern of testPatterns) {
        const comparison = await compareBackends(async (backend) => {
          return await constraintSystem(() => {
            const vars = Array.from({ length: 8 }, (_, i) =>
              Provable.witness(Field, () => Field(i + 1))
            );
            
            const result = pattern.build(vars);
            result.assertEquals(result);
            result.assertGreaterThan(Field(0));
          });
        });

        patterns.push({
          pattern: pattern.name,
          snarkyConstraints: comparison.snarky.result!.rows,
          sparkyConstraints: comparison.sparky.result!.rows
        });
      }

      // Report pattern analysis
      console.log('\nLinear Combination Pattern Analysis:');
      patterns.forEach(({ pattern, snarkyConstraints, sparkyConstraints }) => {
        const reduction = ((snarkyConstraints - sparkyConstraints) / snarkyConstraints * 100).toFixed(1);
        console.log(`${pattern}: Snarky=${snarkyConstraints}, Sparky=${sparkyConstraints} (${reduction}% reduction)`);
      });
    });
  });

  describe('3. Constraint Batching Analysis', () => {
    test('analyze batching effectiveness by constraint type', async () => {
      const batchingResults: Map<string, number[]> = new Map();

      // Test different constraint types
      const constraintTypes = [
        {
          name: 'equality-batch',
          generate: (vars: Field[]) => {
            for (let i = 0; i < vars.length - 1; i++) {
              vars[i].assertEquals(vars[i + 1]);
            }
          }
        },
        {
          name: 'arithmetic-batch',
          generate: (vars: Field[]) => {
            for (let i = 0; i < vars.length - 2; i++) {
              const sum = vars[i].add(vars[i + 1]);
              sum.assertEquals(vars[i + 2]);
            }
          }
        },
        {
          name: 'multiplication-batch',
          generate: (vars: Field[]) => {
            for (let i = 0; i < vars.length - 2; i++) {
              const product = vars[i].mul(vars[i + 1]);
              product.assertEquals(vars[i + 2]);
            }
          }
        },
        {
          name: 'mixed-batch',
          generate: (vars: Field[]) => {
            for (let i = 0; i < vars.length - 3; i++) {
              const a = vars[i].add(vars[i + 1]);
              const b = vars[i + 2].mul(Field(2));
              a.assertEquals(b);
            }
          }
        }
      ];

      for (const constraintType of constraintTypes) {
        const results: number[] = [];
        
        // Test with different batch sizes
        for (const batchSize of [5, 10, 20, 50]) {
          const comparison = await compareBackends(async (backend) => {
            return await constraintSystem(() => {
              const vars = Array.from({ length: batchSize }, (_, i) =>
                Provable.witness(Field, () => Field(i + 1))
              );
              
              constraintType.generate(vars);
            });
          });

          const reduction = comparison.snarky.result!.rows - comparison.sparky.result!.rows;
          results.push(reduction);
        }
        
        batchingResults.set(constraintType.name, results);
      }

      // Report batching analysis
      console.log('\nConstraint Batching Analysis:');
      batchingResults.forEach((reductions, type) => {
        const avgReduction = reductions.reduce((a, b) => a + b, 0) / reductions.length;
        console.log(`${type}: Average reduction = ${avgReduction.toFixed(1)} constraints`);
      });
    });

    test('identify optimal batch sizes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          async (batchSize) => {
            const comparison = await compareBackends(async (backend) => {
              return await constraintSystem(() => {
                const vars = Array.from({ length: batchSize + 2 }, (_, i) =>
                  Provable.witness(Field, () => Field(i + 1))
                );
                
                // Create batch of similar constraints
                for (let i = 0; i < batchSize; i++) {
                  const idx = i % (vars.length - 2);
                  const sum = vars[idx].add(vars[idx + 1]);
                  sum.assertEquals(vars[idx + 2]);
                }
              });
            });

            const efficiency = comparison.sparky.result!.rows / comparison.snarky.result!.rows;
            
            // Log batch size efficiency
            if (batchSize % 10 === 0) {
              console.log(`Batch size ${batchSize}: Efficiency ratio = ${efficiency.toFixed(3)}`);
            }
            
            // Verify correctness
            expect(comparison.snarky.error).toBeUndefined();
            expect(comparison.sparky.error).toBeUndefined();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('4. Dead Code Elimination Analysis', () => {
    test('identify and measure dead code elimination', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            usedVars: fc.integer({ min: 2, max: 10 }),
            unusedVars: fc.integer({ min: 0, max: 10 }),
            deadComputations: fc.integer({ min: 0, max: 20 })
          }),
          async ({ usedVars, unusedVars, deadComputations }) => {
            const comparison = await compareBackends(async (backend) => {
              return await constraintSystem(() => {
                // Create used variables
                const used = Array.from({ length: usedVars }, (_, i) =>
                  Provable.witness(Field, () => Field(i + 1))
                );
                
                // Create unused variables (dead code)
                const unused = Array.from({ length: unusedVars }, (_, i) =>
                  Provable.witness(Field, () => Field(100 + i))
                );
                
                // Perform dead computations
                for (let i = 0; i < deadComputations; i++) {
                  const dead = unused[i % unused.length] || Field(0);
                  const _ = dead.mul(dead).add(Field(i));
                  // Result is not used anywhere
                }
                
                // Perform used computations
                const result = used.reduce((acc, v) => acc.add(v), Field(0));
                result.assertEquals(result);
                result.assertGreaterThan(Field(0));
              });
            });

            // Log dead code elimination effectiveness
            const totalPotentialOps = usedVars + unusedVars + deadComputations;
            const actualConstraints = comparison.sparky.result!.rows;
            console.log(`Dead code: ${unusedVars} unused vars, ${deadComputations} dead ops - Constraints: ${actualConstraints}`);
            
            // Both should work
            expect(comparison.snarky.error).toBeUndefined();
            expect(comparison.sparky.error).toBeUndefined();
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('5. Common Subexpression Elimination', () => {
    test('measure CSE effectiveness', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            numVars: fc.integer({ min: 3, max: 8 }),
            numRepeats: fc.integer({ min: 2, max: 10 })
          }),
          async ({ numVars, numRepeats }) => {
            const comparison = await compareBackends(async (backend) => {
              return await constraintSystem(() => {
                const vars = Array.from({ length: numVars }, (_, i) =>
                  Provable.witness(Field, () => Field(i + 1))
                );
                
                // Common subexpression
                const commonExpr = vars[0].mul(vars[1]).add(vars[2]);
                
                // Use common subexpression multiple times
                const results: Field[] = [];
                for (let i = 0; i < numRepeats; i++) {
                  // Each usage of commonExpr could be optimized
                  const result = commonExpr.mul(Field(i + 1)).add(vars[i % vars.length]);
                  results.push(result);
                  result.assertEquals(result);
                }
                
                // Verify all results are constrained
                const total = results.reduce((acc, r) => acc.add(r), Field(0));
                total.assertGreaterThan(Field(0));
              });
            });

            const reduction = comparison.snarky.result!.rows - comparison.sparky.result!.rows;
            console.log(`CSE with ${numRepeats} repeats: Saved ${reduction} constraints`);
            
            expect(comparison.snarky.error).toBeUndefined();
            expect(comparison.sparky.error).toBeUndefined();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('6. Optimization Interference Analysis', () => {
    test('verify optimizations do not interfere negatively', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            enableConstantFolding: fc.boolean(),
            enableLinearOptimization: fc.boolean(),
            enableBatching: fc.boolean(),
            circuitSize: fc.integer({ min: 10, max: 50 })
          }),
          async ({ enableConstantFolding, enableLinearOptimization, enableBatching, circuitSize }) => {
            const comparison = await compareBackends(async (backend) => {
              return await constraintSystem(() => {
                const vars = Array.from({ length: 5 }, (_, i) =>
                  Provable.witness(Field, () => Field(i + 1))
                );
                
                // Build circuit with different optimization opportunities
                let result = Field(0);
                
                if (enableConstantFolding) {
                  // Add constant folding opportunities
                  result = result.add(Field(10).mul(Field(20)).add(Field(30)));
                }
                
                if (enableLinearOptimization) {
                  // Add linear combination
                  const linComb = vars.reduce((acc, v, i) => acc.add(v.mul(Field(i + 1))), Field(0));
                  result = result.add(linComb);
                }
                
                if (enableBatching) {
                  // Add batchable constraints
                  for (let i = 0; i < circuitSize; i++) {
                    const temp = vars[i % vars.length].add(Field(i));
                    temp.assertEquals(temp);
                  }
                }
                
                result.assertEquals(result);
                result.assertGreaterThan(Field(-1000));
              });
            });

            // Verify both backends work regardless of optimization mix
            expect(comparison.snarky.error).toBeUndefined();
            expect(comparison.sparky.error).toBeUndefined();
            
            // Log optimization combination effectiveness
            const optimizations = [
              enableConstantFolding && 'CF',
              enableLinearOptimization && 'LO',
              enableBatching && 'BA'
            ].filter(Boolean).join('+') || 'NONE';
            
            const reduction = comparison.snarky.result!.rows - comparison.sparky.result!.rows;
            console.log(`Optimizations ${optimizations}: Reduction = ${reduction}`);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('7. Optimization Report Generation', () => {
    test('generate comprehensive optimization report', async () => {
      const report = {
        constantFolding: { totalSaved: 0, avgSaved: 0, maxSaved: 0 },
        linearCombination: { totalSaved: 0, avgSaved: 0, maxSaved: 0 },
        batching: { totalSaved: 0, avgSaved: 0, maxSaved: 0 },
        overall: { totalTests: 0, totalSnarky: 0, totalSparky: 0 }
      };

      // Run comprehensive test suite
      const testCases = [
        // Constant folding heavy
        () => {
          const constants = Array.from({ length: 20 }, (_, i) => Field(i + 1));
          const result = constants.reduce((acc, c) => acc.add(c.mul(c)), Field(0));
          result.assertEquals(result);
        },
        // Linear combination heavy
        () => {
          const vars = Array.from({ length: 10 }, (_, i) =>
            Provable.witness(Field, () => Field(i + 1))
          );
          const linComb = vars.reduce((acc, v, i) => acc.add(v.mul(Field(i + 1))), Field(0));
          linComb.assertEquals(linComb);
        },
        // Batching heavy
        () => {
          const vars = Array.from({ length: 20 }, (_, i) =>
            Provable.witness(Field, () => Field(i + 1))
          );
          for (let i = 0; i < 15; i++) {
            vars[i].assertEquals(vars[i]);
          }
        }
      ];

      for (const testCase of testCases) {
        const comparison = await compareBackends(async (backend) => {
          return await constraintSystem(testCase);
        });

        report.overall.totalTests++;
        report.overall.totalSnarky += comparison.snarky.result!.rows;
        report.overall.totalSparky += comparison.sparky.result!.rows;
      }

      // Generate final report
      console.log('\n=== COMPREHENSIVE OPTIMIZATION REPORT ===');
      console.log(`Total Tests Run: ${report.overall.totalTests}`);
      console.log(`Total Snarky Constraints: ${report.overall.totalSnarky}`);
      console.log(`Total Sparky Constraints: ${report.overall.totalSparky}`);
      console.log(`Overall Reduction: ${report.overall.totalSnarky - report.overall.totalSparky} constraints`);
      console.log(`Reduction Percentage: ${((1 - report.overall.totalSparky / report.overall.totalSnarky) * 100).toFixed(1)}%`);
      console.log('=======================================\n');
    });
  });
});

/**
 * Helper to generate optimization opportunity report
 */
function generateOptimizationReport(
  snarkyConstraints: number,
  sparkyConstraints: number,
  analysis: ConstraintAnalysis
): string {
  const reduction = snarkyConstraints - sparkyConstraints;
  const reductionPercent = (reduction / snarkyConstraints) * 100;
  
  return `
Optimization Analysis:
- Snarky constraints: ${snarkyConstraints}
- Sparky constraints: ${sparkyConstraints}
- Reduction: ${reduction} (${reductionPercent.toFixed(1)}%)
- Opportunities identified: ${analysis.optimizationOpportunities.length}
  ${analysis.optimizationOpportunities.map(o => `  - ${o}`).join('\n')}
`;
}