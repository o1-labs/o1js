/**
 * Low-level Gate Operation Tests for Sparky Backend
 * 
 * This test suite focuses on individual gate operations and ensures
 * that constraint generation is identical between Sparky and Snarky.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { Field, Bool, Provable, ZkProgram, Group, Scalar, Poseidon, switchBackend, Gadgets } from '../../../dist/node/index.js';
import { compareConstraintSystems as detailedCompare } from '../debug/constraint-comparison.js';

// Helper to capture constraint system
async function captureConstraintSystem(fn: () => void): Promise<any> {
  const cs = await Provable.constraintSystem(fn);
  return cs;
}

// Enhanced helper to compare constraint systems with detailed output on failure
async function compareConstraintSystems(snarkyCS: any, sparkyCS: any, testName: string, circuitFn: () => void) {
  try {
    // Compare basic properties
    expect(sparkyCS.publicInputSize).toBe(snarkyCS.publicInputSize);
    expect(sparkyCS.rows).toBe(snarkyCS.rows);
    
    // Compare digest (this ensures the constraints are identical)
    expect(sparkyCS.digest).toBe(snarkyCS.digest);
    
    // If gates are available, compare them
    if (snarkyCS.gates && sparkyCS.gates) {
      expect(sparkyCS.gates.length).toBe(snarkyCS.gates.length);
      
      // Compare each gate
      for (let i = 0; i < snarkyCS.gates.length; i++) {
        const snarkyGate = snarkyCS.gates[i];
        const sparkyGate = sparkyCS.gates[i];
        
        expect(sparkyGate.type).toBe(snarkyGate.type);
        expect(sparkyGate.wires).toEqual(snarkyGate.wires);
        
        // Compare coefficients if present
        if (snarkyGate.coeffs) {
          expect(sparkyGate.coeffs).toEqual(snarkyGate.coeffs);
        }
      }
    }
  } catch (error) {
    // On failure, generate detailed constraint comparison
    console.log(`\n❌ CONSTRAINT MISMATCH DETECTED for ${testName}`);
    console.log('🔍 Generating detailed comparison...\n');
    
    try {
      await detailedCompare(testName, circuitFn, { 
        verboseOutput: true, 
        maxDifferences: 20,
        showIdentical: false 
      });
    } catch (compareError) {
      console.error('Failed to generate detailed comparison:', compareError);
    }
    
    // Re-throw the original error so the test still fails
    throw error;
  }
}

describe('Sparky Gate Operations', () => {
  beforeAll(async () => {
    // Ensure we start with Snarky backend
    await switchBackend('snarky');
  });

  describe('Basic Gate Tests', () => {
    it('should generate identical constraints for zero gate', async () => {
      const testFn = () => {
        const a = Provable.witness(Field, () => Field(5));
        const b = Provable.witness(Field, () => Field(7));
        const c = Provable.witness(Field, () => Field(12));
        
        // This should create a constraint: a + b - c = 0
        a.add(b).assertEquals(c);
      };

      // Capture with Snarky
      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      // Capture with Sparky
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, 'zero gate', testFn);
    });

    it('should generate identical constraints for generic gate', async () => {
      const testFn = () => {
        const a = Provable.witness(Field, () => Field(3));
        const b = Provable.witness(Field, () => Field(4));
        const c = Provable.witness(Field, () => Field(5));
        
        // Create a constraint: 2*a + 3*b - c + a*b - 7 = 0
        // This uses the generic gate with all coefficients
        const left = a.mul(2).add(b.mul(3));
        const right = c.sub(a.mul(b)).add(Field(7));
        left.assertEquals(right);
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, "gate test", testFn);
    });

    it('should generate identical constraints for multiplication', async () => {
      const testFn = () => {
        const a = Provable.witness(Field, () => Field(6));
        const b = Provable.witness(Field, () => Field(7));
        const c = Provable.witness(Field, () => Field(42));
        
        // Assert a * b = c
        a.mul(b).assertEquals(c);
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, "gate test", testFn);
    });

    it('should generate identical constraints for boolean operations', async () => {
      const testFn = () => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        
        // Boolean AND: a * b = result
        const and = a.and(b);
        
        // Boolean OR: a + b - a*b = result
        const or = a.or(b);
        
        // Boolean NOT: 1 - a = result
        const not = a.not();
        
        // Assert some properties
        and.assertEquals(Bool(false));
        or.assertEquals(Bool(true));
        not.assertEquals(Bool(false));
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, "gate test", testFn);
    });
  });

  describe('Poseidon Gate Tests', () => {
    it('should generate identical constraints for Poseidon hash', async () => {
      const testFn = () => {
        const inputs = [
          Provable.witness(Field, () => Field(1)),
          Provable.witness(Field, () => Field(2)),
          Provable.witness(Field, () => Field(3)),
        ];
        
        const hash = Poseidon.hash(inputs);
        
        // Add a constraint to ensure the hash is used
        hash.assertEquals(hash);
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, "gate test", testFn);
    });

    it('should generate identical constraints for Poseidon sponge', async () => {
      const testFn = () => {
        const sponge = new Poseidon.Sponge();
        
        // Absorb some values
        sponge.absorb(Provable.witness(Field, () => Field(10)));
        sponge.absorb(Provable.witness(Field, () => Field(20)));
        sponge.absorb(Provable.witness(Field, () => Field(30)));
        
        // Squeeze output
        const out1 = sponge.squeeze();
        const out2 = sponge.squeeze();
        
        // Use the outputs
        out1.add(out2).assertEquals(out1.add(out2));
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, "gate test", testFn);
    });
  });

  describe('Range Check Tests', () => {
    it('should generate identical constraints for 64-bit range check', async () => {
      const testFn = () => {
        const value = Provable.witness(Field, () => Field(1n << 63n));
        Gadgets.rangeCheck64(value);
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, "gate test", testFn);
    });

    it('should generate identical constraints for 32-bit range check', async () => {
      const testFn = () => {
        const value = Provable.witness(Field, () => Field((1n << 32n) - 1n));
        Gadgets.rangeCheck32(value);
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, "gate test", testFn);
    });

    it('should generate identical constraints for multi-range check', async () => {
      const testFn = () => {
        const a = Provable.witness(Field, () => Field(100));
        const b = Provable.witness(Field, () => Field(200));
        const c = Provable.witness(Field, () => Field(300));
        
        // This creates a complex range check pattern
        const sum = a.add(b).add(c);
        Gadgets.rangeCheckN(16, sum);
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, "gate test", testFn);
    });
  });

  describe('EC Operation Tests', () => {
    it('should generate identical constraints for EC addition', async () => {
      const testFn = () => {
        const g = Group.generator;
        const g2 = g.add(g);
        const g3 = g2.add(g);
        
        // Assert 3*g = g + g + g
        g3.assertEquals(g3);
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, "gate test", testFn);
    });

    it('should generate identical constraints for EC scalar multiplication', async () => {
      const testFn = () => {
        const g = Group.generator;
        const scalar = Provable.witness(Scalar, () => Scalar.from(42));
        
        const scaled = g.scale(scalar);
        scaled.assertEquals(scaled);
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, "gate test", testFn);
    });
  });

  describe('Verification Key Tests', () => {
    it('should produce identical VKs for simple circuits', async () => {
      const SimpleCircuit = ZkProgram({
        name: 'SimpleCircuit',
        publicInput: Field,
        methods: {
          add: {
            privateInputs: [Field],
            async method(pub: Field, priv: Field) {
              pub.add(priv).assertEquals(Field(100));
            },
          },
        },
      });

      // Compile with Snarky
      await switchBackend('snarky');
      const snarkyResult = await SimpleCircuit.compile();
      
      // Compile with Sparky
      await switchBackend('sparky');
      const sparkyResult = await SimpleCircuit.compile();
      
      // Compare VK hashes
      expect(sparkyResult.verificationKey.hash.toBigInt())
        .toBe(snarkyResult.verificationKey.hash.toBigInt());
      
      // Compare VK data structure
      expect(sparkyResult.verificationKey.data)
        .toBe(snarkyResult.verificationKey.data);
    });

    it('should produce identical VKs for complex circuits', async () => {
      const ComplexCircuit = ZkProgram({
        name: 'ComplexCircuit',
        publicInput: Field,
        publicOutput: Field,
        methods: {
          compute: {
            privateInputs: [Field, Field, Bool],
            async method(pub: Field, a: Field, b: Field, flag: Bool) {
              // Mix of operations
              const sum = a.add(b);
              const prod = a.mul(b);
              const choice = Provable.if(flag, sum, prod);
              
              // Poseidon hash
              const hash = Poseidon.hash([pub, choice]);
              
              // Range check
              Gadgets.rangeCheck32(choice);
              
              // EC operation
              const g = Group.generator;
              const point = g.scale(Scalar.from(choice.toBigInt()));
              
              return { publicOutput: point.x };
            },
          },
        },
      });

      // Compile with Snarky
      await switchBackend('snarky');
      const snarkyResult = await ComplexCircuit.compile();
      
      // Compile with Sparky
      await switchBackend('sparky');
      const sparkyResult = await ComplexCircuit.compile();
      
      // Compare VK hashes
      expect(sparkyResult.verificationKey.hash.toBigInt())
        .toBe(snarkyResult.verificationKey.hash.toBigInt());
    });
  });

  describe('Raw Gate Interface Tests', () => {
    it('should support raw gate operations identically', async () => {
      // This tests the low-level raw gate interface
      const testFn = () => {
        const a = Provable.witness(Field, () => Field(10));
        const b = Provable.witness(Field, () => Field(20));
        const c = Provable.witness(Field, () => Field(30));
        
        // Use low-level operations that might invoke raw gates
        const result = a.seal().add(b.seal()).sub(c.seal());
        result.assertEquals(Field(0));
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, "gate test", testFn);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle division by zero identically', async () => {
      const testDivByZero = async () => {
        try {
          await Provable.runAndCheck(() => {
            const a = Field(1);
            const zero = Field(0);
            a.div(zero);
          });
          return 'no error';
        } catch (e: any) {
          return 'error';
        }
      };

      await switchBackend('snarky');
      const snarkyResult = await testDivByZero();
      
      await switchBackend('sparky');
      const sparkyResult = await testDivByZero();
      
      expect(sparkyResult).toBe(snarkyResult);
    });

    it('should handle out-of-range values identically', async () => {
      const testOutOfRange = async () => {
        try {
          await Provable.runAndCheck(() => {
            const big = Provable.witness(Field, () => Field(1n << 65n));
            Gadgets.rangeCheck64(big);
          });
          return 'no error';
        } catch (e: any) {
          return 'error';
        }
      };

      await switchBackend('snarky');
      const snarkyResult = await testOutOfRange();
      
      await switchBackend('sparky');
      const sparkyResult = await testOutOfRange();
      
      expect(sparkyResult).toBe(snarkyResult);
    });
  });
});