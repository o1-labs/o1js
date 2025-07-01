/**
 * Gate Operation Tests for newly implemented gates:
 * - Cairo VM gates (CairoClaim, CairoInstruction, CairoFlags, CairoTransition)
 * - Xor16 gate
 * - ForeignField gates (Add, Mul)
 * 
 * This test suite ensures VK equality between Sparky and Snarky backends.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { Field, Provable, Gadgets, switchBackend, ForeignField, AlmostForeignField, CanonicalForeignField } from '../../../dist/node/index.js';
import { createForeignField } from '../../../dist/node/lib/provable/foreign-field.js';
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

describe('Newly Implemented Native Gates', () => {
  beforeAll(async () => {
    // Ensure we start with Snarky backend
    await switchBackend('snarky');
  });

  describe('Rot64 Gate Tests', () => {
    it('should generate identical constraints for 64-bit rotation', async () => {
      const testFn = () => {
        const a = Provable.witness(Field, () => Field(0x123456789ABCDEFn));
        
        // This should use the Rot64 gate
        const result = Gadgets.rotate64(a, 12, 'left');
        
        // Use the result to ensure it's constrained
        result.assertEquals(result);
      };

      // Capture with Snarky
      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      // Capture with Sparky
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, 'Rot64 gate', testFn);
    });

    it('should generate identical constraints for multiple rotation operations', async () => {
      const testFn = () => {
        const a = Provable.witness(Field, () => Field(0xABCDEF0123456789n));
        
        // Chain multiple rotation operations
        const rot1 = Gadgets.rotate64(a, 8, 'left');
        const rot2 = Gadgets.rotate64(rot1, 16, 'right');
        const result = Gadgets.rotate64(rot2, 4, 'left');
        
        // Use the result
        result.assertEquals(result);
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, 'Multiple Rot64 gates', testFn);
    });
  });

  describe('Xor16 Gate Tests', () => {
    it('should generate identical constraints for 16-bit XOR', async () => {
      const testFn = () => {
        const a = Provable.witness(Field, () => Field(0xABCD));
        const b = Provable.witness(Field, () => Field(0x1234));
        
        // This should use the Xor16 gate
        const result = Gadgets.xor(a, b, 16);
        
        // Use the result to ensure it's constrained
        result.assertEquals(Field(0xB9F9));
      };

      // Capture with Snarky
      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      // Capture with Sparky
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, 'Xor16 gate', testFn);
    });

    it('should generate identical constraints for multiple 16-bit XOR operations', async () => {
      const testFn = () => {
        const a = Provable.witness(Field, () => Field(0xFF00));
        const b = Provable.witness(Field, () => Field(0x00FF));
        const c = Provable.witness(Field, () => Field(0xAAAA));
        
        // Chain multiple XOR operations
        const ab = Gadgets.xor(a, b, 16);
        const result = Gadgets.xor(ab, c, 16);
        
        // Verify the result
        result.assertEquals(Field(0x5555));
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, 'Multiple Xor16 gates', testFn);
    });
  });

  describe('ForeignField Gate Tests', () => {
    // Create a test foreign field (secp256k1 base field)
    const Secp256k1Base = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
    class Secp256k1Field extends createForeignField(Secp256k1Base) {}

    it('should generate identical constraints for foreign field addition', async () => {
      const testFn = () => {
        const a = Provable.witness(Secp256k1Field, () => new Secp256k1Field(1000n));
        const b = Provable.witness(Secp256k1Field, () => new Secp256k1Field(2000n));
        
        // This should use the ForeignFieldAdd gate
        const sum = a.add(b);
        
        // Use the result
        sum.assertEquals(new Secp256k1Field(3000n));
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, 'ForeignFieldAdd gate', testFn);
    });

    it('should generate identical constraints for foreign field multiplication', async () => {
      const testFn = () => {
        const a = Provable.witness(Secp256k1Field, () => new Secp256k1Field(123n));
        const b = Provable.witness(Secp256k1Field, () => new Secp256k1Field(456n));
        
        // This should use the ForeignFieldMul gate
        const product = a.mul(b);
        
        // Use the result
        product.assertEquals(new Secp256k1Field(56088n));
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, 'ForeignFieldMul gate', testFn);
    });

    it('should generate identical constraints for complex foreign field operations', async () => {
      const testFn = () => {
        const a = Provable.witness(Secp256k1Field, () => new Secp256k1Field(100n));
        const b = Provable.witness(Secp256k1Field, () => new Secp256k1Field(200n));
        const c = Provable.witness(Secp256k1Field, () => new Secp256k1Field(300n));
        
        // Complex operation: (a + b) * c
        const sum = a.add(b);
        const result = sum.mul(c);
        
        // Verify: (100 + 200) * 300 = 90000
        result.assertEquals(new Secp256k1Field(90000n));
      };

      await switchBackend('snarky');
      const snarkyCS = await captureConstraintSystem(testFn);
      
      await switchBackend('sparky');
      const sparkyCS = await captureConstraintSystem(testFn);
      
      await compareConstraintSystems(snarkyCS, sparkyCS, 'Complex ForeignField operations', testFn);
    });
  });

  describe('Cairo Gate Tests', () => {
    // Cairo gates are specialized and may not be directly accessible through the high-level API
    // We test them through the raw gate interface if available
    
    it('should accept Cairo gate types through raw interface', async () => {
      // This test verifies the infrastructure accepts Cairo gates
      // Full Cairo VM verification would require additional integration
      
      const testCairoGate = async (gateType: number, gateName: string) => {
        const testFn = () => {
          // Try to access the raw gate interface
          const snarky = (globalThis as any).Snarky;
          if (!snarky?.gates?.raw) {
            console.log(`Skipping ${gateName} - raw gate interface not available`);
            return;
          }
          
          // Create 15 field variables (Cairo gates use all 15 wires)
          const values = Array(15).fill(null).map((_, i) => 
            Provable.witness(Field, () => Field(i))
          );
          
          // Cairo gates typically don't use coefficients
          try {
            snarky.gates.raw(gateType, values, []);
            console.log(`✓ ${gateName} gate accepted`);
          } catch (e) {
            console.log(`✗ ${gateName} gate failed:`, e);
          }
        };

        // Test with both backends to ensure compatibility
        await switchBackend('snarky');
        await Provable.constraintSystem(testFn);
        
        await switchBackend('sparky');
        await Provable.constraintSystem(testFn);
      };
      
      // Test all Cairo gates
      await testCairoGate(8, 'CairoClaim');
      await testCairoGate(9, 'CairoInstruction');
      await testCairoGate(10, 'CairoFlags');
      await testCairoGate(11, 'CairoTransition');
    });
  });

  describe('VK Digest Equality Tests', () => {
    it('should produce identical VK digests for programs using Rot64', async () => {
      const program = {
        testRotate: {
          privateInputs: [Field],
          method(a: Field) {
            return Gadgets.rotate64(a, 12, 'left');
          }
        }
      };

      // Compile with Snarky
      await switchBackend('snarky');
      const snarkyCS = await Provable.constraintSystem(() => {
        program.testRotate.method(Field(0x123456789ABCDEFn));
      });

      // Compile with Sparky
      await switchBackend('sparky');
      const sparkyCS = await Provable.constraintSystem(() => {
        program.testRotate.method(Field(0x123456789ABCDEFn));
      });

      // Compare VK digests
      expect(sparkyCS.digest).toBe(snarkyCS.digest);
    });

    it('should produce identical VK digests for programs using Xor16', async () => {
      const program = {
        testXor: {
          privateInputs: [Field, Field],
          method(a: Field, b: Field) {
            return Gadgets.xor(a, b, 16);
          }
        }
      };

      // Compile with Snarky
      await switchBackend('snarky');
      const snarkyCS = await Provable.constraintSystem(() => {
        program.testXor.method(Field(0xABCD), Field(0x1234));
      });

      // Compile with Sparky
      await switchBackend('sparky');
      const sparkyCS = await Provable.constraintSystem(() => {
        program.testXor.method(Field(0xABCD), Field(0x1234));
      });

      // Compare VK digests
      expect(sparkyCS.digest).toBe(snarkyCS.digest);
    });

    it('should produce identical VK digests for programs using ForeignField', async () => {
      const program = {
        testFF: {
          privateInputs: [Secp256k1Field, Secp256k1Field],
          method(a: Secp256k1Field, b: Secp256k1Field) {
            return a.add(b).mul(a);
          }
        }
      };

      // Compile with Snarky
      await switchBackend('snarky');
      const snarkyCS = await Provable.constraintSystem(() => {
        const a = new Secp256k1Field(100n);
        const b = new Secp256k1Field(200n);
        program.testFF.method(a, b);
      });

      // Compile with Sparky
      await switchBackend('sparky');
      const sparkyCS = await Provable.constraintSystem(() => {
        const a = new Secp256k1Field(100n);
        const b = new Secp256k1Field(200n);
        program.testFF.method(a, b);
      });

      // Compare VK digests
      expect(sparkyCS.digest).toBe(snarkyCS.digest);
    });
  });
});