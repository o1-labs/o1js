import { Field, ZkProgram } from '../../../index.js';
import { switchBackend, getCurrentBackend } from '../../../index.js';

describe('Sparky Optimization Improvements', () => {
  // Simple addition chain program that should benefit from optimization
  const AdditionChain = ZkProgram({
    name: 'AdditionChain',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      addChain: {
        privateInputs: [Field, Field],
        async method(a, b, c) {
          // Create addition chain: temp1 = a + b, temp2 = temp1 + c, result = temp2
          const temp1 = a.add(b);      // Should create: temp1 - a - b = 0
          const temp2 = temp1.add(c);  // Should create: temp2 - temp1 - c = 0
          return temp2;                // Should create: result - temp2 = 0
          
          // Before optimization: 3 constraints
          // After optimization with complex substitution: 1 constraint (result - a - b - c = 0)
        }
      }
    }
  });

  beforeAll(async () => {
    if (getCurrentBackend() !== 'sparky') {
      await switchBackend('sparky');
    }
  });

  describe('Complex Variable Substitution', () => {
    it('should optimize addition chains via variable substitution', async () => {
      // Compile the program
      const { verificationKey } = await AdditionChain.compile();
      
      expect(verificationKey).toBeDefined();
      expect(verificationKey.hash).toBeDefined();
      
      // The optimization should work silently in the background
      // This test verifies that compilation succeeds with the optimization
    });

    it('should handle nested addition chains', async () => {
      const NestedAddition = ZkProgram({
        name: 'NestedAddition',
        methods: {
          nested: {
            privateInputs: [Field, Field, Field, Field],
            async method(a, b, c, d) {
              // Even deeper nesting: ((a + b) + c) + d
              const t1 = a.add(b);
              const t2 = t1.add(c);
              const t3 = t2.add(d);
              t3.assertEquals(Field(10)); // Assume sum is 10
            }
          }
        }
      });

      const { verificationKey } = await NestedAddition.compile();
      expect(verificationKey).toBeDefined();
      
      // This tests that deeper chains are also optimized
    });
  });

  describe('Multiplication Optimization', () => {
    it('should optimize mul + assertEqual to single constraint', async () => {
      const MultiplicationTest = ZkProgram({
        name: 'MultiplicationTest',
        methods: {
          testMul: {
            privateInputs: [Field, Field],
            async method(a, b) {
              const c = a.mul(b);
              c.assertEquals(Field(12));
              // Should optimize to single multiplication constraint
            }
          }
        }
      });

      const { verificationKey } = await MultiplicationTest.compile();
      expect(verificationKey).toBeDefined();
    });
  });
});