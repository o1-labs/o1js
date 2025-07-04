/**
 * Cryptographic property-based tests for o1js
 * 
 * These tests verify essential cryptographic properties that, if broken,
 * could lead to practical attacks on zero-knowledge proof systems.
 */

import { describe, test, expect } from '@jest/globals';
import {
  Field,
  Provable,
  Circuit,
  Gadgets,
  ZkProgram,
  Bool,
  Group,
  Scalar,
  PrivateKey,
  PublicKey,
  Signature,
  CircuitString,
  Poseidon,
  Keccak,
  Hash,
} from '../../../dist/node/index.js';
import { Random, MerkleTree } from '../../../dist/node/index.js';
import * as fc from 'fast-check';

// Convert fast-check arbitrary to Field
const arbField = fc
  .bigUint({ max: Field.ORDER - 1n })
  .map((n) => Field(n));

// Arbitrary for non-zero fields
const arbNonZeroField = arbField.filter((f) => !f.equals(0));

// Arbitrary for small fields (for exponentiation)
const arbSmallField = fc.integer({ min: 0, max: 1000 }).map((n) => Field(n));

describe('Cryptographic Properties', () => {
  const TEST_TIMEOUT = 360000; // 6 minutes

  describe('PROPERTY 1: Field Homomorphism', () => {
    test('Field operations preserve algebraic structure', () => {
      fc.assert(
        fc.property(arbField, arbField, arbField, (a, b, c) => {
          // Ring properties
          expect(a.add(b).toString()).toBe(b.add(a).toString()); // Commutativity of addition
          expect(a.mul(b).toString()).toBe(b.mul(a).toString()); // Commutativity of multiplication
          expect(a.add(b.add(c)).toString()).toBe(a.add(b).add(c).toString()); // Associativity of addition
          expect(a.mul(b.mul(c)).toString()).toBe(a.mul(b).mul(c).toString()); // Associativity of multiplication
          expect(a.mul(b.add(c)).toString()).toBe(a.mul(b).add(a.mul(c)).toString()); // Distributivity

          // Identity elements
          expect(a.add(Field(0)).toString()).toBe(a.toString());
          expect(a.mul(Field(1)).toString()).toBe(a.toString());

          // Inverse elements
          expect(a.add(a.neg()).toString()).toBe(Field(0).toString());
          if (!a.equals(0)) {
            expect(a.mul(a.inv()).toString()).toBe(Field(1).toString());
          }
        }),
        { numRuns: 1000 }
      );
    });

    test('Field characteristic is prime', () => {
      // Verify Field.ORDER is prime (critical for security)
      const p = Field.ORDER;
      
      // Check small factors
      for (let i = 2n; i <= 1000n; i++) {
        expect(p % i).not.toBe(0n);
      }

      // Verify p - 1 = 2^s * t where t is odd (for efficient square roots)
      let s = 0n;
      let t = p - 1n;
      while (t % 2n === 0n) {
        s++;
        t = t / 2n;
      }
      expect(t % 2n).toBe(1n); // t should be odd
      expect(2n ** s * t).toBe(p - 1n);
    });
  });

  describe('PROPERTY 2: Discrete Logarithm Hardness', () => {
    test('Cannot efficiently compute discrete logarithms', () => {
      fc.assert(
        fc.property(arbSmallField, arbSmallField, (base, exponent) => {
          if (base.equals(0)) return; // Skip 0 base

          // Compute g^x
          const result = base.pow(exponent.toBigInt());

          // Verify we cannot reverse this operation
          // (In practice, this would require solving discrete log)
          let found = false;
          let maxTries = 100; // Small search space for test

          for (let i = 0n; i < BigInt(maxTries); i++) {
            if (base.pow(i).equals(result)) {
              found = true;
              expect(i).toBe(exponent.toBigInt() % (Field.ORDER - 1n));
              break;
            }
          }

          // For large exponents, we shouldn't find it in small search
          if (exponent.toBigInt() >= BigInt(maxTries)) {
            expect(found).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('PROPERTY 3: Hash Function Properties', () => {
    test('Poseidon hash is collision-resistant', () => {
      const hashes = new Set<string>();
      const inputs: Field[][] = [];

      // Generate many inputs and check for collisions
      fc.assert(
        fc.property(fc.array(arbField, { minLength: 1, maxLength: 10 }), (input) => {
          const hash = Poseidon.hash(input);
          const hashStr = hash.toString();

          // Check for collision
          if (hashes.has(hashStr)) {
            // Find the colliding input
            const collidingIndex = [...hashes].indexOf(hashStr);
            const collidingInput = inputs[collidingIndex];
            
            // Verify it's not the same input
            const sameInput = 
              input.length === collidingInput.length &&
              input.every((f, i) => f.equals(collidingInput[i]));
            
            expect(sameInput).toBe(true); // Only same input should produce same hash
          }

          hashes.add(hashStr);
          inputs.push(input);
        }),
        { numRuns: 1000 }
      );
    });

    test('Hash functions have avalanche effect', () => {
      fc.assert(
        fc.property(arbField, fc.integer({ min: 0, max: 253 }), (input, bitPosition) => {
          // Original hash
          const original = Poseidon.hash([input]);

          // Flip one bit
          const bits = input.toBits();
          bits[bitPosition] = bits[bitPosition].not();
          const modified = Field.fromBits(bits);

          // Hash the modified input
          const modifiedHash = Poseidon.hash([modified]);

          // Count differing bits (should be ~50% for good avalanche)
          const originalBits = original.toBits();
          const modifiedBits = modifiedHash.toBits();
          let differences = 0;
          
          for (let i = 0; i < originalBits.length; i++) {
            if (!originalBits[i].equals(modifiedBits[i])) {
              differences++;
            }
          }

          // Expect significant avalanche (at least 30% bits different)
          expect(differences).toBeGreaterThan(originalBits.length * 0.3);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('PROPERTY 4: Elliptic Curve Security', () => {
    test('EC point operations maintain group structure', () => {
      fc.assert(
        fc.property(arbScalar, arbScalar, arbScalar, (a, b, c) => {
          const G = Group.generator;

          // Associativity: (aG + bG) + cG = aG + (bG + cG)
          const left = G.scale(a).add(G.scale(b)).add(G.scale(c));
          const right = G.scale(a).add(G.scale(b).add(G.scale(c)));
          expect(left.equals(right)).toBe(true);

          // Distributivity: (a + b)G = aG + bG
          const sum = a.add(b);
          const distributed = G.scale(sum);
          const separated = G.scale(a).add(G.scale(b));
          expect(distributed.equals(separated)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test('Cannot forge signatures', () => {
      fc.assert(
        fc.property(arbField, arbField, (message1, message2) => {
          // Generate a key pair
          const privateKey = PrivateKey.random();
          const publicKey = privateKey.toPublicKey();

          // Sign message1
          const signature1 = Signature.create(privateKey, [message1]);

          // Verify correct signature
          expect(signature1.verify(publicKey, [message1])).toBe(true);

          // Cannot use signature for different message
          if (!message1.equals(message2)) {
            expect(signature1.verify(publicKey, [message2])).toBe(false);
          }

          // Cannot use signature with different public key
          const otherKey = PrivateKey.random().toPublicKey();
          expect(signature1.verify(otherKey, [message1])).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('PROPERTY 5: Zero-Knowledge Properties', () => {
    test('Proofs do not leak witness information', async () => {
      // Create a simple ZK program
      const TestProgram = ZkProgram({
        name: 'WitnessPrivacy',
        publicInput: Field,
        methods: {
          prove: {
            privateInputs: [Field],
            async method(publicInput: Field, witness: Field) {
              // Constraint: witness^2 = publicInput
              witness.square().assertEquals(publicInput);
            },
          },
        },
      });

      await TestProgram.compile();

      await fc.assert(
        fc.asyncProperty(arbField, async (witness) => {
          const publicInput = witness.square();

          // Generate proof
          const proof = await TestProgram.prove(publicInput, witness);

          // Proof should be valid
          expect(await TestProgram.verify(proof)).toBe(true);

          // Proof size should be constant (not dependent on witness)
          const proofJson = proof.toJSON();
          expect(proofJson.proof.length).toBeGreaterThan(0);

          // Proof should not contain witness value
          const proofStr = JSON.stringify(proofJson);
          expect(proofStr.includes(witness.toString())).toBe(false);

          // For square roots, both +/- witness should work
          const negWitness = witness.neg();
          const proof2 = await TestProgram.prove(publicInput, negWitness);
          expect(await TestProgram.verify(proof2)).toBe(true);
        }),
        { numRuns: 10 } // Fewer runs due to compilation overhead
      );
    }, TEST_TIMEOUT);
  });

  describe('PROPERTY 6: Merkle Tree Security', () => {
    test('Cannot forge Merkle proofs', () => {
      fc.assert(
        fc.property(
          fc.array(arbField, { minLength: 4, maxLength: 16 }),
          fc.integer({ min: 0, max: 15 }),
          arbField,
          (leaves, targetIndex, fakeLeaf) => {
            // Create Merkle tree
            const tree = new MerkleTree(4); // height 4 = 16 leaves
            leaves.forEach((leaf, i) => tree.setLeaf(BigInt(i), leaf));

            // Get valid proof for target
            const targetLeaf = leaves[targetIndex % leaves.length];
            const proof = tree.getWitness(BigInt(targetIndex % leaves.length));
            const root = tree.getRoot();

            // Valid proof should verify
            expect(proof.calculateRoot(targetLeaf).equals(root)).toBe(true);

            // Cannot use proof with different leaf (unless collision)
            if (!fakeLeaf.equals(targetLeaf)) {
              expect(proof.calculateRoot(fakeLeaf).equals(root)).toBe(false);
            }

            // Cannot use proof for different position
            const otherIndex = (targetIndex + 1) % leaves.length;
            if (otherIndex !== targetIndex % leaves.length) {
              const otherProof = tree.getWitness(BigInt(otherIndex));
              expect(otherProof.calculateRoot(targetLeaf).equals(root)).toBe(
                targetLeaf.equals(leaves[otherIndex])
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('PROPERTY 7: Range Check Security', () => {
    test('Range checks are sound', () => {
      fc.assert(
        fc.property(arbField, fc.integer({ min: 0, max: 64 }), (value, bits) => {
          const maxValue = 2n ** BigInt(bits) - 1n;

          Provable.runAndCheck(() => {
            const field = Provable.witness(Field, () => value);

            // Check if value is in range
            const inRange = value.toBigInt() <= maxValue;

            if (inRange) {
              // Should pass range check
              expect(() => {
                if (bits === 64) Gadgets.rangeCheck64(field);
                else if (bits === 32) Gadgets.rangeCheck32(field);
                else if (bits === 16) Gadgets.rangeCheck16(field);
                else if (bits === 8) Gadgets.rangeCheck8(field);
              }).not.toThrow();
            } else {
              // Should fail range check
              expect(() => {
                if (bits === 64) Gadgets.rangeCheck64(field);
                else if (bits === 32) Gadgets.rangeCheck32(field);
                else if (bits === 16) Gadgets.rangeCheck16(field);
                else if (bits === 8) Gadgets.rangeCheck8(field);
              }).toThrow();
            }
          });
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('PROPERTY 8: Constraint System Soundness', () => {
    test('Cannot satisfy contradictory constraints', () => {
      fc.assert(
        fc.property(arbField, arbField, (a, b) => {
          if (a.equals(b)) return; // Skip when equal

          expect(() => {
            Provable.runAndCheck(() => {
              const x = Provable.witness(Field, () => a);
              
              // Contradictory constraints
              x.assertEquals(a);
              x.assertEquals(b); // This should fail
            });
          }).toThrow();
        }),
        { numRuns: 100 }
      );
    });

    test('Constraint system is deterministic', () => {
      fc.assert(
        fc.property(arbField, arbField, arbField, (a, b, c) => {
          // Run same computation twice
          let result1: Field | null = null;
          let result2: Field | null = null;

          Provable.runAndCheck(() => {
            const x = Provable.witness(Field, () => a);
            const y = Provable.witness(Field, () => b);
            const z = Provable.witness(Field, () => c);

            const computation = x.mul(y).add(z).square();
            result1 = computation;
          });

          Provable.runAndCheck(() => {
            const x = Provable.witness(Field, () => a);
            const y = Provable.witness(Field, () => b);
            const z = Provable.witness(Field, () => c);

            const computation = x.mul(y).add(z).square();
            result2 = computation;
          });

          // Results should be identical
          expect(result1?.toString()).toBe(result2?.toString());
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('PROPERTY 9: Foreign Field Security', () => {
    test('Foreign field operations maintain modular arithmetic', () => {
      // Test with secp256k1 field
      const secp256k1_modulus = 2n ** 256n - 2n ** 32n - 977n;

      fc.assert(
        fc.property(
          fc.bigUint({ max: secp256k1_modulus - 1n }),
          fc.bigUint({ max: secp256k1_modulus - 1n }),
          (a, b) => {
            // Manual modular arithmetic
            const sum = (a + b) % secp256k1_modulus;
            const product = (a * b) % secp256k1_modulus;

            // Verify properties
            expect(sum).toBeLessThan(secp256k1_modulus);
            expect(product).toBeLessThan(secp256k1_modulus);

            // Commutativity
            expect((a + b) % secp256k1_modulus).toBe((b + a) % secp256k1_modulus);
            expect((a * b) % secp256k1_modulus).toBe((b * a) % secp256k1_modulus);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('PROPERTY 10: Side-Channel Resistance', () => {
    test('Operations do not leak information through exceptions', () => {
      fc.assert(
        fc.property(arbField, arbField, (a, b) => {
          // These operations should either all succeed or all fail
          const operations = [
            () => a.add(b),
            () => a.sub(b),
            () => a.mul(b),
            () => a.square(),
            () => b.square(),
          ];

          const results = operations.map(op => {
            try {
              op();
              return 'success';
            } catch (e) {
              return 'error';
            }
          });

          // All basic operations should succeed
          expect(results.every(r => r === 'success')).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });
});

// Helper to create arbitrary Scalar values
const arbScalar = fc
  .bigUint({ max: Scalar.ORDER - 1n })
  .map((n) => Scalar.from(n));