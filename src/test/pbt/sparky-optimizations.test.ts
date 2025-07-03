import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { Field, Provable, switchBackend, getCurrentBackend } from 'o1js';

/**
 * Property-Based Tests for Sparky Optimizations
 * 
 * These tests verify that Sparky with all optimizations produces
 * the same constraint systems as Snarky across a wide range of inputs.
 */

// Helper to count constraints for both backends
async function compareConstraintCounts(
  circuit: () => void,
  property: string
): Promise<{ snarky: number; sparky: number; equal: boolean }> {
  // Test with Snarky
  await switchBackend('snarky');
  const snarkyCs = await Provable.constraintSystem(circuit);
  const snarkyCount = snarkyCs.gates.length;
  
  // Test with Sparky
  await switchBackend('sparky');
  const sparkyCs = await Provable.constraintSystem(circuit);
  const sparkyCount = sparkyCs.gates.length;
  
  const equal = snarkyCount === sparkyCount;
  
  if (!equal) {
    console.log(`Property: ${property}`);
    console.log(`  Snarky: ${snarkyCount} gates`);
    console.log(`  Sparky: ${sparkyCount} gates`);
    console.log(`  Difference: ${sparkyCount - snarkyCount}`);
  }
  
  return { snarky: snarkyCount, sparky: sparkyCount, equal };
}

describe('Sparky Optimizations Property-Based Tests', () => {
  beforeAll(async () => {
    // Ensure we start with snarky
    await switchBackend('snarky');
  });

  afterAll(async () => {
    // Reset to snarky
    await switchBackend('snarky');
  });

  describe('Constant Folding', () => {
    it('should fold constant operations identically to Snarky', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.bigInt({ min: 0n, max: Field.ORDER - 1n }), { minLength: 2, maxLength: 10 }),
          async (constants) => {
            const circuit = () => {
              const fields = constants.map(c => Field(c));
              
              // Test various constant operations
              let result = fields[0];
              for (let i = 1; i < fields.length; i++) {
                if (i % 3 === 0) {
                  result = result.add(fields[i]);
                } else if (i % 3 === 1) {
                  result = result.mul(fields[i]);
                } else {
                  result = result.sub(fields[i]);
                }
              }
              
              // All operations on constants should be folded
              // This should generate 0 constraints
            };
            
            const comparison = await compareConstraintCounts(circuit, 'constant folding');
            expect(comparison.equal).toBe(true);
            expect(comparison.sparky).toBe(0); // All constants should be folded
          }
        ),
        { verbose: true, numRuns: 20 }
      );
    });

    it('should handle mixed constant/variable operations identically', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.bigInt({ min: 0n, max: Field.ORDER - 1n }), { minLength: 2, maxLength: 5 }),
          fc.array(fc.bigInt({ min: 0n, max: Field.ORDER - 1n }), { minLength: 2, maxLength: 5 }),
          async (constants, witnessValues) => {
            const circuit = () => {
              // Mix of constants and witness variables
              const constantFields = constants.map(c => Field(c));
              const witnessFields = witnessValues.map(v => 
                Provable.witness(Field, () => Field(v))
              );
              
              // Operations mixing constants and variables
              for (let i = 0; i < Math.min(constantFields.length, witnessFields.length); i++) {
                const result = constantFields[i].mul(witnessFields[i]);
                // This should use scale optimization when one operand is constant
              }
            };
            
            const comparison = await compareConstraintCounts(circuit, 'mixed constant/variable ops');
            expect(comparison.equal).toBe(true);
          }
        ),
        { verbose: true, numRuns: 20 }
      );
    });
  });

  describe('Linear Combination Simplification', () => {
    it('should simplify identity operations identically to Snarky', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.bigInt({ min: 0n, max: Field.ORDER - 1n }),
          async (value) => {
            const circuit = () => {
              const x = Provable.witness(Field, () => Field(value));
              
              // Identity operations that should be simplified
              const a = x.add(Field(0));     // x + 0 → x
              const b = x.mul(Field(1));     // x * 1 → x
              const c = x.mul(Field(0));     // x * 0 → 0
              const d = x.sub(x);            // x - x → 0
              
              // These should not generate extra constraints
              a.assertEquals(x);
              b.assertEquals(x);
              c.assertEquals(Field(0));
              d.assertEquals(Field(0));
            };
            
            const comparison = await compareConstraintCounts(circuit, 'identity operations');
            expect(comparison.equal).toBe(true);
          }
        ),
        { verbose: true, numRuns: 20 }
      );
    });

    it('should simplify complex linear combinations identically', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: -10, max: 10 }), { minLength: 3, maxLength: 8 }),
          fc.bigInt({ min: 0n, max: Field.ORDER - 1n }),
          async (coefficients, witnessValue) => {
            const circuit = () => {
              const x = Provable.witness(Field, () => Field(witnessValue));
              
              // Build complex linear combination: c0*x + c1*x + c2*x + ...
              let expr = Field(0);
              for (const coeff of coefficients) {
                if (coeff !== 0) {
                  expr = expr.add(x.mul(Field(Math.abs(coeff))));
                  if (coeff < 0) {
                    expr = expr.sub(x.mul(Field(Math.abs(coeff) * 2)));
                  }
                }
              }
              
              // This should be simplified to a single scale operation
            };
            
            const comparison = await compareConstraintCounts(circuit, 'complex linear combinations');
            expect(comparison.equal).toBe(true);
          }
        ),
        { verbose: true, numRuns: 15 }
      );
    });
  });

  describe('Union-Find Wire Optimization', () => {
    it('should optimize equality chains identically to Snarky', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }),
          fc.bigInt({ min: 0n, max: Field.ORDER - 1n }),
          async (chainLength, value) => {
            const circuit = () => {
              // Create a chain of equal variables
              const vars = [];
              for (let i = 0; i < chainLength; i++) {
                vars.push(Provable.witness(Field, () => Field(value)));
              }
              
              // Assert all are equal in a chain: x0 = x1, x1 = x2, etc.
              for (let i = 0; i < chainLength - 1; i++) {
                vars[i].assertEquals(vars[i + 1]);
              }
              
              // This should use union-find to create wiring instead of constraints
            };
            
            const comparison = await compareConstraintCounts(circuit, 'equality chains');
            expect(comparison.equal).toBe(true);
          }
        ),
        { verbose: true, numRuns: 15 }
      );
    });

    it('should optimize constant equality reuse identically', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 8 }),
          fc.bigInt({ min: 0n, max: Field.ORDER - 1n }),
          async (varCount, constantValue) => {
            const circuit = () => {
              const constant = Field(constantValue);
              
              // Multiple variables equal to the same constant
              for (let i = 0; i < varCount; i++) {
                const witness = Provable.witness(Field, () => Field(constantValue));
                witness.assertEquals(constant);
              }
              
              // Should reuse the constant variable through union-find
            };
            
            const comparison = await compareConstraintCounts(circuit, 'constant equality reuse');
            expect(comparison.equal).toBe(true);
          }
        ),
        { verbose: true, numRuns: 15 }
      );
    });
  });

  describe('Witness Value Optimization', () => {
    it('should not generate constraints in as_prover blocks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.bigInt({ min: 0n, max: Field.ORDER - 1n }), { minLength: 1, maxLength: 5 }),
          async (values) => {
            const circuit = () => {
              const witnesses = values.map(v => 
                Provable.witness(Field, () => Field(v))
              );
              
              // Operations inside as_prover should not generate constraints
              Provable.asProver(() => {
                let result = witnesses[0];
                for (let i = 1; i < witnesses.length; i++) {
                  result = result.mul(witnesses[i]);
                  result.assertEquals(result); // This should not add a constraint
                }
              });
              
              // Only operations outside as_prover should generate constraints
              if (witnesses.length > 1) {
                witnesses[0].assertEquals(witnesses[0]);
              }
            };
            
            const comparison = await compareConstraintCounts(circuit, 'witness value optimization');
            expect(comparison.equal).toBe(true);
          }
        ),
        { verbose: true, numRuns: 20 }
      );
    });
  });

  describe('Constraint Batching', () => {
    it('should batch constraints identically to Snarky', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (pairCount) => {
            const circuit = () => {
              // Generate pairs of multiplications that should batch
              for (let i = 0; i < pairCount; i++) {
                const a = Provable.witness(Field, () => Field(i + 1));
                const b = Provable.witness(Field, () => Field(i + 2));
                const c = Provable.witness(Field, () => Field((i + 1) * (i + 2)));
                
                // These multiplications should batch in pairs
                Provable.assertEqual(a.mul(b), c);
              }
            };
            
            const comparison = await compareConstraintCounts(circuit, 'constraint batching');
            expect(comparison.equal).toBe(true);
            
            // Verify batching is working (should have fewer gates than operations)
            const expectedUnbatched = pairCount * 2; // Each mul + assertEqual
            expect(comparison.sparky).toBeLessThan(expectedUnbatched);
          }
        ),
        { verbose: true, numRuns: 15 }
      );
    });
  });

  describe('Combined Optimizations', () => {
    it('should handle complex circuits with all optimizations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            constants: fc.array(fc.bigInt({ min: 0n, max: 100n }), { minLength: 2, maxLength: 5 }),
            witnesses: fc.array(fc.bigInt({ min: 0n, max: 100n }), { minLength: 2, maxLength: 5 }),
            coefficients: fc.array(fc.integer({ min: -5, max: 5 }), { minLength: 2, maxLength: 5 }),
          }),
          async ({ constants, witnesses, coefficients }) => {
            const circuit = () => {
              // Mix all optimization scenarios
              const constantFields = constants.map(c => Field(c));
              const witnessFields = witnesses.map(w => 
                Provable.witness(Field, () => Field(w))
              );
              
              // Constant folding
              let constantResult = constantFields[0];
              for (let i = 1; i < constantFields.length; i++) {
                constantResult = constantResult.add(constantFields[i]);
              }
              
              // Linear combination with simplification
              let linearComb = Field(0);
              for (let i = 0; i < Math.min(coefficients.length, witnessFields.length); i++) {
                const coeff = coefficients[i];
                if (coeff !== 0) {
                  linearComb = linearComb.add(witnessFields[i].mul(Field(Math.abs(coeff))));
                }
              }
              
              // Union-find optimization
              if (witnessFields.length >= 2) {
                witnessFields[0].assertEquals(witnessFields[1]);
              }
              
              // Witness optimization
              Provable.asProver(() => {
                const temp = witnessFields[0].mul(Field(2));
                temp.assertEquals(temp); // Should not generate constraint
              });
            };
            
            const comparison = await compareConstraintCounts(circuit, 'combined optimizations');
            expect(comparison.equal).toBe(true);
          }
        ),
        { verbose: true, numRuns: 25 }
      );
    });

    it('should maintain correctness with edge cases', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          fc.boolean(),
          async (useZero, useOne) => {
            const circuit = () => {
              const zero = Field(0);
              const one = Field(1);
              const x = Provable.witness(Field, () => Field(42));
              
              // Edge cases that should be optimized
              if (useZero) {
                const a = x.add(zero);        // x + 0 → x
                const b = x.mul(zero);        // x * 0 → 0
                const c = zero.mul(x);        // 0 * x → 0
                a.assertEquals(x);
                b.assertEquals(zero);
                c.assertEquals(zero);
              }
              
              if (useOne) {
                const d = x.mul(one);         // x * 1 → x
                const e = one.mul(x);         // 1 * x → x
                d.assertEquals(x);
                e.assertEquals(x);
              }
              
              // Self equality (union-find optimization)
              x.assertEquals(x);
            };
            
            const comparison = await compareConstraintCounts(circuit, 'edge cases');
            expect(comparison.equal).toBe(true);
          }
        ),
        { verbose: true, numRuns: 20 }
      );
    });
  });

  describe('Constraint Count Parity', () => {
    it('should never generate more constraints than Snarky', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            numOps: fc.integer({ min: 1, max: 20 }),
            opTypes: fc.array(fc.constantFrom('add', 'mul', 'assertEquals', 'scale'), { minLength: 1, maxLength: 20 }),
            values: fc.array(fc.bigInt({ min: 0n, max: 1000n }), { minLength: 20, maxLength: 40 }),
          }),
          async ({ numOps, opTypes, values }) => {
            const circuit = () => {
              const witnesses = values.slice(0, numOps).map(v => 
                Provable.witness(Field, () => Field(v))
              );
              const constants = values.slice(numOps, numOps * 2).map(v => Field(v));
              
              // Random operations
              for (let i = 0; i < Math.min(numOps, opTypes.length); i++) {
                const op = opTypes[i];
                const w = witnesses[i % witnesses.length];
                const c = constants[i % constants.length];
                const next = witnesses[(i + 1) % witnesses.length];
                
                switch (op) {
                  case 'add':
                    w.add(c);
                    break;
                  case 'mul':
                    w.mul(c);
                    break;
                  case 'assertEquals':
                    if (i % 3 === 0) {
                      w.assertEquals(w); // Self equality
                    } else if (i % 3 === 1) {
                      w.assertEquals(next); // Variable equality
                    } else {
                      w.assertEquals(c); // Constant equality
                    }
                    break;
                  case 'scale':
                    w.mul(Field(i + 1));
                    break;
                }
              }
            };
            
            const comparison = await compareConstraintCounts(circuit, 'random operations');
            
            // Sparky should never generate more constraints than Snarky
            expect(comparison.sparky).toBeLessThanOrEqual(comparison.snarky);
            
            // Ideally they should be equal
            if (!comparison.equal) {
              console.log(`Warning: Constraint count mismatch in random test`);
              console.log(`  Operations: ${numOps}, Types: ${opTypes.slice(0, numOps).join(', ')}`);
            }
          }
        ),
        { verbose: true, numRuns: 50 }
      );
    });
  });
});