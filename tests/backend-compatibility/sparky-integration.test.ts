import { Field, ZkProgram, Poseidon, switchBackend, initializeBindings } from '../../src/index.js';

describe('Sparky Backend Integration Tests', () => {
  beforeAll(async () => {
    await initializeBindings();
    await switchBackend('sparky');
  });

  describe('Poseidon Fix Validation', () => {
    it('should compile and prove programs with 0-5 private inputs', async () => {
      const testCases = [
        {
          name: '0 inputs',
          privateInputs: [],
          method: (publicInput: Field) => {
            publicInput.assertEquals(Field(42));
          },
          publicValue: Field(42),
          privateValues: []
        },
        {
          name: '1 input',
          privateInputs: [Field],
          method: (publicInput: Field, a: Field) => {
            const hash = Poseidon.hash([a]);
            hash.assertEquals(publicInput);
          },
          publicValue: Poseidon.hash([Field(1)]),
          privateValues: [Field(1)]
        },
        {
          name: '2 inputs',
          privateInputs: [Field, Field],
          method: (publicInput: Field, a: Field, b: Field) => {
            const hash = Poseidon.hash([a, b]);
            hash.assertEquals(publicInput);
          },
          publicValue: Poseidon.hash([Field(1), Field(2)]),
          privateValues: [Field(1), Field(2)]
        },
        {
          name: '3 inputs',
          privateInputs: [Field, Field, Field],
          method: (publicInput: Field, a: Field, b: Field, c: Field) => {
            const hash = Poseidon.hash([a, b, c]);
            hash.assertEquals(publicInput);
          },
          publicValue: Poseidon.hash([Field(1), Field(2), Field(3)]),
          privateValues: [Field(1), Field(2), Field(3)]
        },
        {
          name: '4 inputs',
          privateInputs: [Field, Field, Field, Field],
          method: (publicInput: Field, a: Field, b: Field, c: Field, d: Field) => {
            const hash = Poseidon.hash([a, b, c, d]);
            hash.assertEquals(publicInput);
          },
          publicValue: Poseidon.hash([Field(1), Field(2), Field(3), Field(4)]),
          privateValues: [Field(1), Field(2), Field(3), Field(4)]
        },
        {
          name: '5 inputs',
          privateInputs: [Field, Field, Field, Field, Field],
          method: (publicInput: Field, a: Field, b: Field, c: Field, d: Field, e: Field) => {
            const hash = Poseidon.hash([a, b, c, d, e]);
            hash.assertEquals(publicInput);
          },
          publicValue: Poseidon.hash([Field(1), Field(2), Field(3), Field(4), Field(5)]),
          privateValues: [Field(1), Field(2), Field(3), Field(4), Field(5)]
        }
      ];

      for (const testCase of testCases) {
        const program = ZkProgram({
          name: `Test${testCase.name.replace(' ', '')}`,
          publicInput: Field,
          methods: {
            test: {
              privateInputs: testCase.privateInputs,
              method: testCase.method as any
            }
          }
        });

        // Compile
        const { verificationKey } = await program.compile();
        expect(verificationKey).toBeDefined();
        expect(verificationKey.data).toBeTruthy();
        expect(verificationKey.hash).toBeTruthy();

        // Generate proof
        const proof = await program.test(testCase.publicValue, ...testCase.privateValues);
        expect(proof).toBeDefined();

        // Verify proof
        const isValid = await program.verify(proof);
        expect(isValid).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    const edgeCaseInputCounts = [0, 1, 2, 5, 6, 15];

    edgeCaseInputCounts.forEach(inputCount => {
      it(`should handle programs with ${inputCount} private inputs`, async () => {
        const privateInputs = Array(inputCount).fill(Field);
        
        const program = ZkProgram({
          name: `EdgeCase${inputCount}Inputs`,
          publicInput: Field,
          methods: {
            test: {
              privateInputs,
              method(publicInput: Field, ...inputs: Field[]) {
                if (inputs.length === 0) {
                  publicInput.assertEquals(Field(42));
                } else {
                  const hash = Poseidon.hash(inputs);
                  hash.assertEquals(publicInput);
                }
              }
            }
          }
        });

        // Should compile without errors
        const { verificationKey } = await program.compile();
        expect(verificationKey).toBeDefined();
        
        // Should generate and verify proofs
        const privateValues = Array(inputCount).fill(null).map((_, i) => Field(i + 1));
        const publicValue = inputCount === 0 ? Field(42) : Poseidon.hash(privateValues);
        
        const proof = await program.test(publicValue, ...privateValues);
        expect(proof).toBeDefined();
        
        const isValid = await program.verify(proof);
        expect(isValid).toBe(true);
      });
    });

    it('should handle very large number of private inputs', async () => {
      const largeInputCount = 20;
      const privateInputs = Array(largeInputCount).fill(Field);
      
      const program = ZkProgram({
        name: 'LargeInputProgram',
        publicInput: Field,
        methods: {
          test: {
            privateInputs,
            method(publicInput: Field, ...inputs: Field[]) {
              // Just sum all inputs for simplicity
              let sum = Field(0);
              for (const input of inputs) {
                sum = sum.add(input);
              }
              sum.assertEquals(publicInput);
            }
          }
        }
      });

      const { verificationKey } = await program.compile();
      expect(verificationKey).toBeDefined();
      
      // Test with actual values
      const privateValues = Array(largeInputCount).fill(null).map((_, i) => Field(i));
      const expectedSum = Field(largeInputCount * (largeInputCount - 1) / 2); // Sum of 0 to n-1
      
      const proof = await program.test(expectedSum, ...privateValues);
      const isValid = await program.verify(proof);
      expect(isValid).toBe(true);
    });
  });

  describe('Cross-Backend Proof Verification', () => {
    it('should verify proofs generated by one backend with the other backend', async () => {
      const program = ZkProgram({
        name: 'CrossBackendTest',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field, Field],
            method(publicInput: Field, a: Field, b: Field, c: Field) {
              const hash = Poseidon.hash([a, b, c]);
              hash.assertEquals(publicInput);
            }
          }
        }
      });

      // Compile with Sparky
      await switchBackend('sparky');
      const { verificationKey: sparkyVK } = await program.compile();
      
      // Generate proof with Sparky
      const inputs = [Field(1), Field(2), Field(3)];
      const publicValue = Poseidon.hash(inputs);
      const sparkyProof = await program.test(publicValue, ...inputs);
      
      // Switch to Snarky and compile
      await switchBackend('snarky');
      const { verificationKey: snarkyVK } = await program.compile();
      
      // VKs should match
      expect(JSON.stringify(sparkyVK)).toBe(JSON.stringify(snarkyVK));
      
      // Verify Sparky proof with Snarky backend
      const isValidInSnarky = await program.verify(sparkyProof);
      expect(isValidInSnarky).toBe(true);
      
      // Generate proof with Snarky
      const snarkyProof = await program.test(publicValue, ...inputs);
      
      // Switch back to Sparky
      await switchBackend('sparky');
      
      // Verify Snarky proof with Sparky backend
      const isValidInSparky = await program.verify(snarkyProof);
      expect(isValidInSparky).toBe(true);
    });
  });
});