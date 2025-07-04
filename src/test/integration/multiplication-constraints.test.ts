import { Field, Provable, ZkProgram } from '../../../index.js';
import { switchBackend, getCurrentBackend } from '../../../index.js';

describe('Multiplication Constraint Testing', () => {
  describe('Basic Multiplication Patterns', () => {
    it('should handle simple multiplication with assertEquals', async () => {
      const program = ZkProgram({
        name: 'SimpleMultiplication',
        methods: {
          multiply: {
            privateInputs: [Field, Field],
            async method(x, y) {
              const z = x.mul(y);
              z.assertEquals(Field(12));
            }
          }
        }
      });

      await program.compile();
      const proof = await program.multiply(Field(3), Field(4));
      expect(proof).toBeDefined();
    });

    it('should handle multiplication with witness values', async () => {
      const program = ZkProgram({
        name: 'WitnessMultiplication',
        methods: {
          multiplyWitness: {
            privateInputs: [],
            async method() {
              const x = Provable.witness(Field, () => Field(3));
              const y = Provable.witness(Field, () => Field(4));
              const z = x.mul(y);
              z.assertEquals(Field(12));
            }
          }
        }
      });

      await program.compile();
      const proof = await program.multiplyWitness();
      expect(proof).toBeDefined();
    });

    it('should handle chained multiplications', async () => {
      const program = ZkProgram({
        name: 'ChainedMultiplication',
        methods: {
          multiplyChain: {
            privateInputs: [Field, Field, Field],
            async method(a, b, c) {
              const temp = a.mul(b);
              const result = temp.mul(c);
              result.assertEquals(Field(24)); // 2 * 3 * 4 = 24
            }
          }
        }
      });

      await program.compile();
      const proof = await program.multiplyChain(Field(2), Field(3), Field(4));
      expect(proof).toBeDefined();
    });
  });

  describe('Multiplication Optimization Patterns', () => {
    it('should optimize assertMul patterns', async () => {
      const program = ZkProgram({
        name: 'AssertMulPattern',
        methods: {
          assertMulTest: {
            privateInputs: [Field, Field, Field],
            async method(x, y, z) {
              // This pattern should be recognized and optimized
              x.mul(y).assertEquals(z);
              // Should compile to single assertMul constraint
            }
          }
        }
      });

      await program.compile();
      const proof = await program.assertMulTest(Field(5), Field(6), Field(30));
      expect(proof).toBeDefined();
    });

    it('should handle multiplication with constants', async () => {
      const program = ZkProgram({
        name: 'ConstantMultiplication',
        methods: {
          multiplyByConstant: {
            privateInputs: [Field],
            async method(x) {
              const doubled = x.mul(Field(2));
              const tripled = x.mul(Field(3));
              doubled.add(tripled).assertEquals(Field(25)); // 2x + 3x = 25, so x = 5
            }
          }
        }
      });

      await program.compile();
      const proof = await program.multiplyByConstant(Field(5));
      expect(proof).toBeDefined();
    });
  });

  describe('Backend Comparison', () => {
    it('should produce equivalent results across backends', async () => {
      const program = ZkProgram({
        name: 'BackendComparison',
        publicOutput: Field,
        methods: {
          compute: {
            privateInputs: [Field, Field],
            async method(a, b) {
              return a.mul(b).add(Field(1));
            }
          }
        }
      });

      // Test with Snarky
      await switchBackend('snarky');
      const snarkyCompiled = await program.compile();
      const snarkyProof = await program.compute(Field(7), Field(8));
      
      // Test with Sparky
      await switchBackend('sparky');
      const sparkyCompiled = await program.compile();
      const sparkyProof = await program.compute(Field(7), Field(8));

      // Both should produce Field(57) as output
      expect(snarkyProof.publicOutput).toEqual(sparkyProof.publicOutput);
    });
  });
});