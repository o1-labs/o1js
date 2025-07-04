/**
 * Simple Constraint Count Test
 * 
 * A focused test to debug VK parity issues by comparing constraint counts
 * between Snarky and Sparky backends for individual operations.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Field, Provable, Bool, switchBackend, getCurrentBackend } from 'o1js';

describe('Simple Constraint Count Debug', () => {
  let originalBackend: 'snarky' | 'sparky';

  beforeAll(async () => {
    originalBackend = getCurrentBackend() as 'snarky' | 'sparky';
  });

  afterAll(async () => {
    await switchBackend(originalBackend);
  });

  /**
   * Helper to count constraints and log details
   */
  async function compareConstraints(
    name: string,
    circuit: () => void,
    expectedSnarkyCount?: number
  ): Promise<{ snarky: number; sparky: number; match: boolean }> {
    // Test with Snarky
    await switchBackend('snarky');
    const snarkyCS = await Provable.constraintSystem(circuit);
    const snarkyCount = snarkyCS.gates.length;
    
    // Test with Sparky
    await switchBackend('sparky');
    const sparkyCS = await Provable.constraintSystem(circuit);
    const sparkyCount = sparkyCS.gates.length;
    
    const match = snarkyCount === sparkyCount;
    
    // Log details for debugging
    console.log(`\n=== ${name} ===`);
    console.log(`Snarky: ${snarkyCount} constraints`);
    console.log(`Sparky: ${sparkyCount} constraints`);
    console.log(`Match: ${match ? '✅' : '❌'}`);
    
    if (expectedSnarkyCount !== undefined && snarkyCount !== expectedSnarkyCount) {
      console.log(`⚠️  Expected Snarky count: ${expectedSnarkyCount}`);
    }
    
    // Log gate types if they differ
    if (!match) {
      const snarkySummary = snarkyCS.summary();
      const sparkySummary = sparkyCS.summary();
      
      console.log('\nSnarky gates:', JSON.stringify(snarkySummary, null, 2));
      console.log('Sparky gates:', JSON.stringify(sparkySummary, null, 2));
      
      // Show first few gates for more detail
      console.log('\nFirst 5 Snarky gates:');
      snarkyCS.gates.slice(0, 5).forEach((gate, i) => {
        console.log(`  ${i}: ${gate.type}`);
      });
      
      console.log('\nFirst 5 Sparky gates:');
      sparkyCS.gates.slice(0, 5).forEach((gate, i) => {
        console.log(`  ${i}: ${gate.type}`);
      });
    }
    
    return { snarky: snarkyCount, sparky: sparkyCount, match };
  }

  describe('Basic Field Operations', () => {
    it('should count constraints for simple assertEquals', async () => {
      const circuit = () => {
        const x = Provable.witness(Field, () => Field(5));
        x.assertEquals(Field(5));
      };
      
      const result = await compareConstraints('Simple assertEquals', circuit, 1);
      expect(result.match).toBe(true);
    });

    it('should count constraints for field addition', async () => {
      const circuit = () => {
        const x = Provable.witness(Field, () => Field(3));
        const y = Provable.witness(Field, () => Field(4));
        const z = x.add(y);
        z.assertEquals(Field(7));
      };
      
      const result = await compareConstraints('Field addition', circuit, 1);
      expect(result.match).toBe(true);
    });

    it('should count constraints for field multiplication', async () => {
      const circuit = () => {
        const x = Provable.witness(Field, () => Field(3));
        const y = Provable.witness(Field, () => Field(4));
        const z = x.mul(y);
        z.assertEquals(Field(12));
      };
      
      const result = await compareConstraints('Field multiplication', circuit, 1);
      expect(result.match).toBe(true);
    });

    it('should count constraints for constant operations', async () => {
      const circuit = () => {
        const x = Provable.witness(Field, () => Field(5));
        const y = x.add(Field(10)); // Adding a constant
        y.assertEquals(Field(15));
      };
      
      const result = await compareConstraints('Constant addition', circuit);
      expect(result.match).toBe(true);
    });
  });

  describe('Boolean Operations', () => {
    it('should count constraints for boolean check', async () => {
      const circuit = () => {
        const x = Provable.witness(Field, () => Field(1));
        x.assertBool();
      };
      
      const result = await compareConstraints('Boolean assertion', circuit, 1);
      expect(result.match).toBe(true);
    });

    it('should count constraints for Bool.and', async () => {
      const circuit = () => {
        const a = Provable.witness(Bool, () => Bool(true));
        const b = Provable.witness(Bool, () => Bool(false));
        const c = a.and(b);
        c.assertEquals(Bool(false));
      };
      
      const result = await compareConstraints('Bool.and operation', circuit);
      expect(result.match).toBe(true);
    });
  });

  describe('Chained Operations', () => {
    it('should count constraints for simple chain', async () => {
      const circuit = () => {
        const x = Provable.witness(Field, () => Field(2));
        const y = x.mul(Field(3)); // 2 * 3 = 6
        const z = y.add(Field(4)); // 6 + 4 = 10
        z.assertEquals(Field(10));
      };
      
      const result = await compareConstraints('Simple chain', circuit);
      expect(result.match).toBe(true);
    });

    it('should count constraints for witness chain', async () => {
      const circuit = () => {
        const a = Provable.witness(Field, () => Field(2));
        const b = Provable.witness(Field, () => Field(3));
        const c = a.mul(b); // 2 * 3 = 6
        const d = c.add(Field(4)); // 6 + 4 = 10
        d.assertEquals(Field(10));
      };
      
      const result = await compareConstraints('Witness chain', circuit);
      expect(result.match).toBe(true);
    });
  });

  describe('Empty and Minimal Circuits', () => {
    it('should handle empty circuit', async () => {
      const circuit = () => {
        // Empty circuit - no constraints
      };
      
      const result = await compareConstraints('Empty circuit', circuit, 0);
      expect(result.match).toBe(true);
      expect(result.snarky).toBe(0);
      expect(result.sparky).toBe(0);
    });

    it('should handle constant-only operations', async () => {
      const circuit = () => {
        const x = Field(5);
        const y = Field(10);
        const z = x.add(y);
        // No constraints generated for constant operations
      };
      
      const result = await compareConstraints('Constant-only operations', circuit, 0);
      expect(result.match).toBe(true);
      expect(result.snarky).toBe(0);
      expect(result.sparky).toBe(0);
    });
  });

  describe('Detailed Gate Analysis', () => {
    it('should analyze gate types for complex circuit', async () => {
      const circuit = () => {
        const a = Provable.witness(Field, () => Field(2));
        const b = Provable.witness(Field, () => Field(3));
        const c = Provable.witness(Field, () => Field(5));
        
        // Multiple different operations
        const ab = a.mul(b);
        ab.assertEquals(Field(6));
        
        const bc = b.mul(c);
        bc.assertEquals(Field(15));
        
        const sum = ab.add(bc);
        sum.assertEquals(Field(21));
      };
      
      console.log('\n🔍 Detailed gate analysis for complex circuit:');
      const result = await compareConstraints('Complex circuit', circuit);
      
      // Additional analysis
      await switchBackend('snarky');
      const snarkyCS = await Provable.constraintSystem(circuit);
      await switchBackend('sparky');
      const sparkyCS = await Provable.constraintSystem(circuit);
      
      console.log('\nGate-by-gate comparison:');
      const maxGates = Math.max(snarkyCS.gates.length, sparkyCS.gates.length);
      for (let i = 0; i < maxGates; i++) {
        const snarkyGate = snarkyCS.gates[i];
        const sparkyGate = sparkyCS.gates[i];
        
        if (!snarkyGate) {
          console.log(`  ${i}: [missing] vs ${sparkyGate.type}`);
        } else if (!sparkyGate) {
          console.log(`  ${i}: ${snarkyGate.type} vs [missing]`);
        } else if (snarkyGate.type !== sparkyGate.type) {
          console.log(`  ${i}: ${snarkyGate.type} vs ${sparkyGate.type} ❌`);
        } else {
          console.log(`  ${i}: ${snarkyGate.type} ✅`);
        }
      }
      
      expect(result.match).toBe(true);
    });
  });
});