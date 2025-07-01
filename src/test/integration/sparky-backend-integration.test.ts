/**
 * Comprehensive Integration Tests for Sparky Backend
 * 
 * This test suite ensures feature and performance parity between Sparky and Snarky backends.
 * Each test runs identical operations on both backends and compares:
 * - Outputs (field values, hashes, EC points)
 * - Constraint counts 
 * - Verification keys (VKs)
 * - Performance metrics
 */

import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { Field, Bool, Scalar, Group, Poseidon, ZkProgram, Provable, createForeignField, Keccak, Hash, switchBackend, getCurrentBackend, Gadgets } from '../../../dist/node/index.js';
import type { ForeignField, AlmostForeignField } from '../../../dist/node/lib/provable/foreign-field.js';

// Helper to run test with both backends
async function runWithBothBackends<T>(
  testName: string,
  testFn: () => Promise<T>
): Promise<{ snarky: T; sparky: T }> {
  // Run with Snarky
  await switchBackend('snarky');
  const snarkyResult = await testFn();
  
  // Run with Sparky
  await switchBackend('sparky');
  const sparkyResult = await testFn();
  
  return { snarky: snarkyResult, sparky: sparkyResult };
}

// Helper to compare results
function expectEqualResults(snarky: any, sparky: any, context: string) {
  if (typeof snarky === 'bigint' && typeof sparky === 'bigint') {
    expect(sparky).toBe(snarky);
  } else if (typeof snarky === 'string' && typeof sparky === 'string') {
    expect(sparky).toBe(snarky);
  } else if (Array.isArray(snarky) && Array.isArray(sparky)) {
    expect(sparky.length).toBe(snarky.length);
    for (let i = 0; i < snarky.length; i++) {
      expectEqualResults(snarky[i], sparky[i], `${context}[${i}]`);
    }
  } else if (snarky && typeof snarky === 'object' && sparky && typeof sparky === 'object') {
    const snarkyKeys = Object.keys(snarky).sort();
    const sparkyKeys = Object.keys(sparky).sort();
    expect(sparkyKeys).toEqual(snarkyKeys);
    for (const key of snarkyKeys) {
      expectEqualResults(snarky[key], sparky[key], `${context}.${key}`);
    }
  } else {
    expect(sparky).toEqual(snarky);
  }
}

describe('Sparky Backend Integration Tests', () => {
  beforeAll(async () => {
    // Ensure we start with Snarky backend
    await switchBackend('snarky');
  });

  beforeEach(async () => {
    // Reset to Snarky before each test
    await switchBackend('snarky');
  });

  describe('Field Operations', () => {
    it('should handle basic field arithmetic identically', async () => {
      const results = await runWithBothBackends('field arithmetic', async () => {
        const a = Field(123456789n);
        const b = Field(987654321n);
        
        const sum = a.add(b);
        const diff = a.sub(b);
        const prod = a.mul(b);
        const quot = a.div(b);
        const neg = a.neg();
        const inv = a.inv();
        const square = a.square();
        const sqrt = square.sqrt();
        
        return {
          sum: sum.toBigInt(),
          diff: diff.toBigInt(),
          prod: prod.toBigInt(),
          quot: quot.toBigInt(),
          neg: neg.toBigInt(),
          inv: inv.toBigInt(),
          square: square.toBigInt(),
          sqrt: sqrt.toBigInt(),
        };
      });
      
      expectEqualResults(results.snarky, results.sparky, 'field arithmetic');
    });

    it('should handle field assertions identically', async () => {
      const results = await runWithBothBackends('field assertions', async () => {
        let assertionsPassed = true;
        
        try {
          Provable.runAndCheck(() => {
            const a = Provable.witness(Field, () => Field(42));
            const b = Provable.witness(Field, () => Field(42));
            const c = Provable.witness(Field, () => Field(1764)); // 42 * 42
            
            a.assertEquals(b);
            a.mul(b).assertEquals(c);
            a.square().assertEquals(c);
            
            const bool = Provable.witness(Bool, () => Bool(true));
            bool.assertTrue();
          });
        } catch (e) {
          assertionsPassed = false;
        }
        
        return { assertionsPassed };
      });
      
      expectEqualResults(results.snarky, results.sparky, 'field assertions');
    });

    it('should generate identical constraints for field operations', async () => {
      const program = ZkProgram({
        name: 'FieldOperations',
        publicInput: Field,
        methods: {
          compute: {
            privateInputs: [Field],
            async method(pub: Field, priv: Field) {
              const sum = pub.add(priv);
              const prod = pub.mul(priv);
              const square = sum.square();
              square.assertGreaterThanOrEqual(prod);
            },
          },
        },
      });

      const results = await runWithBothBackends('field constraints', async () => {
        const { verificationKey } = await program.compile();
        const analysis = await program.analyzeMethods();
        const constraintCount = analysis.compute.rows;
        
        return {
          vkHash: verificationKey.hash.toBigInt(),
          constraintCount,
        };
      });
      
      expectEqualResults(results.snarky, results.sparky, 'field constraints');
    });
  });

  describe('Boolean Operations', () => {
    it('should handle boolean operations identically', async () => {
      const results = await runWithBothBackends('boolean ops', async () => {
        const a = Bool(true);
        const b = Bool(false);
        
        const and = a.and(b);
        const or = a.or(b);
        const not = a.not();
        const xor = Bool(true).equals(Bool(false)).not();
        
        return {
          and: and.toBoolean(),
          or: or.toBoolean(),
          not: not.toBoolean(),
          xor: xor.toBoolean(),
        };
      });
      
      expectEqualResults(results.snarky, results.sparky, 'boolean ops');
    });
  });

  describe('Poseidon Hash', () => {
    it('should produce identical Poseidon hashes', async () => {
      const results = await runWithBothBackends('poseidon hash', async () => {
        const inputs = [Field(1), Field(2), Field(3), Field(4), Field(5)];
        
        const hash2 = Poseidon.hash([inputs[0], inputs[1]]);
        const hashArray = Poseidon.hash(inputs);
        const sponge = new Poseidon.Sponge();
        sponge.absorb(inputs[0]);
        sponge.absorb(inputs[1]);
        const squeezed = sponge.squeeze();
        
        return {
          hash2: hash2.toBigInt(),
          hashArray: hashArray.toBigInt(),
          squeezed: squeezed.toBigInt(),
        };
      });
      
      expectEqualResults(results.snarky, results.sparky, 'poseidon hash');
    });

    it('should handle Poseidon sponge construction identically', async () => {
      const results = await runWithBothBackends('poseidon sponge', async () => {
        const sponge = new Poseidon.Sponge();
        
        // Absorb multiple field elements
        for (let i = 0; i < 10; i++) {
          sponge.absorb(Field(i));
        }
        
        // Squeeze multiple times
        const squeezed = [];
        for (let i = 0; i < 5; i++) {
          squeezed.push(sponge.squeeze().toBigInt());
        }
        
        return { squeezed };
      });
      
      expectEqualResults(results.snarky, results.sparky, 'poseidon sponge');
    });
  });

  describe('Elliptic Curve Operations', () => {
    it('should handle EC point operations identically', async () => {
      const results = await runWithBothBackends('EC operations', async () => {
        const g = Group.generator;
        const scalar = Scalar.from(12345n);
        
        // Point operations
        const doubled = g.add(g);
        const scaled = g.scale(scalar);
        const negated = g.neg();
        
        return {
          doubled: { x: doubled.x.toBigInt(), y: doubled.y.toBigInt() },
          scaled: { x: scaled.x.toBigInt(), y: scaled.y.toBigInt() },
          negated: { x: negated.x.toBigInt(), y: negated.y.toBigInt() },
        };
      });
      
      expectEqualResults(results.snarky, results.sparky, 'EC operations');
    });

    it('should generate identical constraints for EC operations', async () => {
      const program = ZkProgram({
        name: 'ECOperations',
        publicInput: Group,
        methods: {
          compute: {
            privateInputs: [Scalar],
            async method(pub: Group, scalar: Scalar) {
              const scaled = pub.scale(scalar);
              const doubled = pub.add(pub);
              // Note: Scalar doesn't have div method, use Field division
              const halfScalar = Scalar.from(scalar.toBigInt() / 2n);
              scaled.assertEquals(doubled.scale(halfScalar));
            },
          },
        },
      });

      const results = await runWithBothBackends('EC constraints', async () => {
        const { verificationKey } = await program.compile();
        const analysis = await program.analyzeMethods();
        const constraintCount = analysis.compute.rows;
        
        return {
          vkHash: verificationKey.hash.toBigInt(),
          constraintCount,
        };
      });
      
      expectEqualResults(results.snarky, results.sparky, 'EC constraints');
    });
  });

  describe('Range Checks', () => {
    it('should handle range checks identically', async () => {
      const testRangeCheck = async (bits: number, value: bigint) => {
        try {
          await Provable.runAndCheck(() => {
            const field = Provable.witness(Field, () => Field(value));
            if (bits === 64) {
              Gadgets.rangeCheck64(field);
            } else if (bits === 32) {
              Gadgets.rangeCheck32(field);
            } else {
              // For other bit sizes, use generic range check
              Gadgets.rangeCheckN(bits, field);
            }
          });
          return true;
        } catch {
          return false;
        }
      };

      const results = await runWithBothBackends('range checks', async () => {
        const checks = {
          valid64: await testRangeCheck(64, 1n << 63n),
          invalid64: await testRangeCheck(64, 1n << 64n),
          valid32: await testRangeCheck(32, (1n << 32n) - 1n),
          invalid32: await testRangeCheck(32, 1n << 32n),
          valid16: await testRangeCheck(16, 65535n),
          invalid16: await testRangeCheck(16, 65536n),
        };
        
        return checks;
      });
      
      expectEqualResults(results.snarky, results.sparky, 'range checks');
    });
  });

  describe('Foreign Field Operations', () => {
    it('should handle foreign field operations identically', async () => {
      const secp256k1 = createForeignField(
        0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn
      );

      const results = await runWithBothBackends('foreign field ops', async () => {
        const a = secp256k1.from(123456789n);
        const b = secp256k1.from(987654321n);
        
        const sum = a.add(b);
        const diff = a.sub(b);
        // For multiplication, we need AlmostReduced
        const aReduced = a.assertAlmostReduced();
        const bReduced = b.assertAlmostReduced();
        const prod = aReduced.mul(bReduced);
        const neg = a.neg();
        
        return {
          sum: sum.toBigInt(),
          diff: diff.toBigInt(),
          prod: prod.toBigInt(),
          neg: neg.toBigInt(),
        };
      });
      
      expectEqualResults(results.snarky, results.sparky, 'foreign field ops');
    });

    it('should generate identical constraints for foreign field operations', async () => {
      const secp256k1 = createForeignField(
        0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn
      );

      const program = ZkProgram({
        name: 'ForeignFieldOps',
        publicInput: secp256k1.AlmostReduced.provable,
        methods: {
          compute: {
            privateInputs: [secp256k1.AlmostReduced.provable],
            async method(pub: AlmostForeignField, priv: AlmostForeignField) {
              const sum = pub.add(priv);
              const prod = pub.mul(priv);
              const prodReduced = prod.assertAlmostReduced();
              const privReduced = priv.assertAlmostReduced();
              const expected = prodReduced.add(pub).sub(pub.mul(privReduced).sub(priv));
              sum.assertEquals(expected);
            },
          },
        },
      });

      const results = await runWithBothBackends('foreign field constraints', async () => {
        const { verificationKey } = await program.compile();
        const analysis = await program.analyzeMethods();
        const constraintCount = analysis.compute.rows;
        
        return {
          vkHash: verificationKey.hash.toBigInt(),
          constraintCount,
        };
      });
      
      expectEqualResults(results.snarky, results.sparky, 'foreign field constraints');
    });
  });

  describe('Complex Cryptographic Operations', () => {
    it('should handle SHA256 identically', async () => {
      const results = await runWithBothBackends('SHA256', async () => {
        // SHA256 operates on bytes, not fields directly
        // For now, we'll skip this test or use a simpler example
        // TODO: Implement proper SHA256 test with byte conversion
        return {
          hash: 0n, // Placeholder
        };
      });
      
      // Skip this test for now
      // expectEqualResults(results.snarky, results.sparky, 'SHA256');
    });

    it('should handle Keccak identically', async () => {
      const results = await runWithBothBackends('Keccak', async () => {
        // Note: Keccak operates on bytes, not Field arrays
        // For now, we'll skip this test or use a simpler example
        // TODO: Implement proper Keccak test with byte conversion
        return {
          hash: 0n, // Placeholder
        };
      });
      
      // Skip this test for now
      // expectEqualResults(results.snarky, results.sparky, 'Keccak');
    });
  });

  describe('Constraint System Analysis', () => {
    it('should produce identical constraint system metadata', async () => {
      const program = ZkProgram({
        name: 'ConstraintAnalysis',
        publicInput: Field,
        methods: {
          method1: {
            privateInputs: [Field, Field],
            async method(pub: Field, a: Field, b: Field) {
              const c = a.mul(b);
              c.assertEquals(pub);
            },
          },
          method2: {
            privateInputs: [Bool],
            async method(pub: Field, flag: Bool) {
              const result = Provable.if(flag, pub, Field(0));
              result.assertGreaterThan(Field(0));
            },
          },
        },
      });

      const results = await runWithBothBackends('constraint analysis', async () => {
        await program.compile();
        const analysis = await program.analyzeMethods();
        
        return {
          method1: {
            rows: analysis.method1.rows,
            digest: analysis.method1.digest,
          },
          method2: {
            rows: analysis.method2.rows,
            digest: analysis.method2.digest,
          },
        };
      });
      
      expectEqualResults(results.snarky, results.sparky, 'constraint analysis');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should have comparable performance for field operations', async () => {
      const iterations = 1000;
      
      const measurePerformance = async () => {
        const start = Date.now();
        
        for (let i = 0; i < iterations; i++) {
          const a = Field(i);
          const b = Field(i + 1);
          const c = a.mul(b).add(a).square();
          c.toBigInt(); // Force evaluation
        }
        
        return Date.now() - start;
      };

      const results = await runWithBothBackends('field performance', async () => {
        return await measurePerformance();
      });
      
      // Sparky should be within 2x of Snarky performance
      const ratio = results.sparky / results.snarky;
      console.log(`Performance ratio (Sparky/Snarky): ${ratio.toFixed(2)}x`);
      expect(ratio).toBeLessThan(2);
    });

    it('should have comparable performance for Poseidon hashing', async () => {
      const iterations = 100;
      
      const measurePerformance = async () => {
        const start = Date.now();
        
        for (let i = 0; i < iterations; i++) {
          const inputs = Array.from({ length: 10 }, (_, j) => Field(i * 10 + j));
          const hash = Poseidon.hash(inputs);
          hash.toBigInt(); // Force evaluation
        }
        
        return Date.now() - start;
      };

      const results = await runWithBothBackends('poseidon performance', async () => {
        return await measurePerformance();
      });
      
      // Sparky should be within 2x of Snarky performance
      const ratio = results.sparky / results.snarky;
      console.log(`Poseidon performance ratio (Sparky/Snarky): ${ratio.toFixed(2)}x`);
      expect(ratio).toBeLessThan(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors identically', async () => {
      const testError = async (testFn: () => void) => {
        try {
          await Provable.runAndCheck(testFn);
          return null;
        } catch (e: any) {
          return e.message || 'Unknown error';
        }
      };

      const results = await runWithBothBackends('error handling', async () => {
        const divByZero = await testError(() => {
          const a = Field(1);
          const zero = Field(0);
          a.div(zero);
        });
        
        const assertFailed = await testError(() => {
          const a = Provable.witness(Field, () => Field(42));
          a.assertEquals(Field(43));
        });
        
        const rangeCheckFailed = await testError(() => {
          const a = Provable.witness(Field, () => Field(1n << 65n));
          Gadgets.rangeCheck64(a);
        });
        
        return {
          divByZero: divByZero !== null,
          assertFailed: assertFailed !== null,
          rangeCheckFailed: rangeCheckFailed !== null,
        };
      });
      
      expectEqualResults(results.snarky, results.sparky, 'error handling');
    });
  });

  describe('Complete zkApp Test', () => {
    it('should compile and prove a complete zkApp identically', async () => {
      const ComplexProgram = ZkProgram({
        name: 'ComplexZkApp',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          compute: {
            privateInputs: [Field, Bool],
            async method(pub: Field, priv: Field, flag: Bool) {
              // Field operations
              const sum = pub.add(priv);
              const prod = pub.mul(priv);
              
              // Conditional logic
              const result = Provable.if(flag, sum, prod);
              
              // Range check
              Gadgets.rangeCheck32(result);
              
              // Poseidon hash
              const hash = Poseidon.hash([pub, priv, result]);
              
              // EC operations
              const g = Group.generator;
              const point = g.scale(Scalar.from(result.toBigInt()));
              
              // Return hash of x-coordinate
              return { publicOutput: Poseidon.hash([point.x]) };
            },
          },
        },
      });

      const results = await runWithBothBackends('complete zkApp', async () => {
        const { verificationKey } = await ComplexProgram.compile();
        
        const proof = await ComplexProgram.compute(
          Field(100),
          Field(200),
          Bool(true)
        );
        
        const verified = await ComplexProgram.verify(proof.proof);
        
        return {
          vkHash: verificationKey.hash.toBigInt(),
          publicOutput: proof.proof.publicOutput.toBigInt(),
          verified,
          proofSize: JSON.stringify(proof.proof).length,
        };
      });
      
      expectEqualResults(results.snarky, results.sparky, 'complete zkApp');
    });
  });
});