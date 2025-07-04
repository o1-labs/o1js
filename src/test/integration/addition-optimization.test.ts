import { Field, Provable } from '../../../index.js';
import { constraintSystem } from '../../lib/provable/core/provable-context.js';
import { switchBackend, getCurrentBackend } from '../../../index.js';

describe('Addition Optimization Testing', () => {
  describe('Constraint Count Analysis', () => {
    it('should optimize simple addition + assertEquals', async () => {
      // Test with Snarky
      await switchBackend('snarky');
      const snarkyCs = await constraintSystem(() => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(7));
        x.add(y).assertEquals(Field(12));
      });
      
      // Test with Sparky
      await switchBackend('sparky');
      const sparkyCs = await constraintSystem(() => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(7));
        x.add(y).assertEquals(Field(12));
      });
      
      // Both should produce minimal constraints
      expect(sparkyCs.rows).toBeLessThanOrEqual(snarkyCs.rows);
      
      // Ideally both should be 1 constraint
      expect(sparkyCs.rows).toBeLessThanOrEqual(1);
    });

    it('should optimize chained additions', async () => {
      await switchBackend('sparky');
      
      const cs = await constraintSystem(() => {
        const a = Provable.witness(Field, () => Field(1));
        const b = Provable.witness(Field, () => Field(2));
        const c = Provable.witness(Field, () => Field(3));
        const d = Provable.witness(Field, () => Field(4));
        
        // Chain: ((a + b) + c) + d = 10
        a.add(b).add(c).add(d).assertEquals(Field(10));
      });
      
      // Should optimize to single constraint: a + b + c + d - 10 = 0
      expect(cs.rows).toBeLessThanOrEqual(2); // Allow some wiggle room
    });

    it('should handle addition with constants', async () => {
      await switchBackend('sparky');
      
      const cs = await constraintSystem(() => {
        const x = Provable.witness(Field, () => Field(5));
        // x + 3 + 7 = 15
        x.add(Field(3)).add(Field(7)).assertEquals(Field(15));
      });
      
      // Constants should be folded, resulting in minimal constraints
      expect(cs.rows).toBeLessThanOrEqual(1);
    });
  });

  describe('Gate Structure Analysis', () => {
    it('should produce correct gate types for additions', async () => {
      await switchBackend('sparky');
      
      const cs = await constraintSystem(() => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(7));
        x.add(y).assertEquals(Field(12));
      });
      
      expect(cs.gates).toBeDefined();
      expect(cs.gates.length).toBeGreaterThan(0);
      
      // Verify gate structure
      const firstGate = cs.gates[0];
      expect(firstGate).toHaveProperty('typ');
      expect(firstGate).toHaveProperty('wires');
    });
  });

  describe('Backend Parity', () => {
    it('should produce equivalent results across backends', async () => {
      const testCircuit = () => {
        const a = Provable.witness(Field, () => Field(10));
        const b = Provable.witness(Field, () => Field(20));
        const c = Provable.witness(Field, () => Field(30));
        
        // Complex expression: (a + b) * 2 + c = 90
        a.add(b).mul(Field(2)).add(c).assertEquals(Field(90));
      };

      await switchBackend('snarky');
      const snarkyCs = await constraintSystem(testCircuit);
      
      await switchBackend('sparky');
      const sparkyCs = await constraintSystem(testCircuit);
      
      // Should have similar constraint counts
      expect(Math.abs(sparkyCs.rows - snarkyCs.rows)).toBeLessThanOrEqual(1);
    });
  });
});