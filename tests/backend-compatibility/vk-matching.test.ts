import { Field, ZkProgram, Poseidon, switchBackend, getCurrentBackend, initializeBindings } from '../../src/index.js';

describe('Backend VK Matching Tests', () => {
  beforeAll(async () => {
    await initializeBindings();
  });

  describe('Verification Key Compatibility', () => {
    it('should produce identical VKs between Snarky and Sparky backends for programs with 0-5 private inputs', async () => {
      const testCases = [
        { 
          name: 'ZeroInputs',
          privateInputCount: 0,
          program: ZkProgram({
            name: 'ZeroInputsVK',
            publicInput: Field,
            methods: {
              test: {
                privateInputs: [],
                method(publicInput) {
                  publicInput.assertEquals(Field(42));
                },
              },
            },
          })
        },
        {
          name: 'OneInput',
          privateInputCount: 1,
          program: ZkProgram({
            name: 'OneInputVK',
            publicInput: Field,
            methods: {
              test: {
                privateInputs: [Field],
                method(publicInput, privateField) {
                  const hash = Poseidon.hash([privateField, Field(100)]);
                  hash.assertEquals(publicInput);
                },
              },
            },
          })
        },
        {
          name: 'TwoInputs',
          privateInputCount: 2,
          program: ZkProgram({
            name: 'TwoInputsVK',
            publicInput: Field,
            methods: {
              test: {
                privateInputs: [Field, Field],
                method(publicInput, field1, field2) {
                  const hash = Poseidon.hash([field1, field2]);
                  hash.assertEquals(publicInput);
                },
              },
            },
          })
        },
        {
          name: 'ThreeInputs',
          privateInputCount: 3,
          program: ZkProgram({
            name: 'ThreeInputsVK',
            publicInput: Field,
            methods: {
              test: {
                privateInputs: [Field, Field, Field],
                method(publicInput, field1, field2, field3) {
                  const hash = Poseidon.hash([field1, field2, field3]);
                  hash.assertEquals(publicInput);
                },
              },
            },
          })
        },
        {
          name: 'FourInputs',
          privateInputCount: 4,
          program: ZkProgram({
            name: 'FourInputsVK',
            publicInput: Field,
            methods: {
              test: {
                privateInputs: [Field, Field, Field, Field],
                method(publicInput, f1, f2, f3, f4) {
                  const hash = Poseidon.hash([f1, f2, f3, f4]);
                  hash.assertEquals(publicInput);
                },
              },
            },
          })
        },
        {
          name: 'FiveInputs',
          privateInputCount: 5,
          program: ZkProgram({
            name: 'FiveInputsVK',
            publicInput: Field,
            methods: {
              test: {
                privateInputs: [Field, Field, Field, Field, Field],
                method(publicInput, f1, f2, f3, f4, f5) {
                  const hash = Poseidon.hash([f1, f2, f3, f4, f5]);
                  hash.assertEquals(publicInput);
                },
              },
            },
          })
        }
      ];

      const results = [];
      
      for (const testCase of testCases) {
        // Compile with Snarky backend
        await switchBackend('snarky');
        const { verificationKey: snarkyVK } = await testCase.program.compile();
        
        // Compile with Sparky backend
        await switchBackend('sparky');
        const { verificationKey: sparkyVK } = await testCase.program.compile();
        
        // Compare VKs
        const vksMatch = JSON.stringify(snarkyVK) === JSON.stringify(sparkyVK);
        
        results.push({
          name: testCase.name,
          privateInputCount: testCase.privateInputCount,
          vksMatch
        });
        
        expect(vksMatch).toBe(true);
      }
      
      // Verify pattern: both odd and even input counts should work
      const oddResults = results.filter(r => r.privateInputCount % 2 === 1);
      const evenResults = results.filter(r => r.privateInputCount % 2 === 0);
      
      const oddMatches = oddResults.filter(r => r.vksMatch).length;
      const evenMatches = evenResults.filter(r => r.vksMatch).length;
      
      expect(oddMatches).toBe(oddResults.length);
      expect(evenMatches).toBe(evenResults.length);
    });

    it('should handle backend switching correctly', async () => {
      const simpleProgram = ZkProgram({
        name: 'BackendSwitchTest',
        publicInput: Field,
        methods: {
          run: {
            privateInputs: [Field],
            method(publicInput, x) {
              x.square().assertEquals(publicInput);
            },
          },
        },
      });

      // Test switching between backends
      await switchBackend('snarky');
      expect(getCurrentBackend()).toBe('snarky');
      const { verificationKey: snarkyVK } = await simpleProgram.compile();
      
      await switchBackend('sparky');
      expect(getCurrentBackend()).toBe('sparky');
      const { verificationKey: sparkyVK } = await simpleProgram.compile();
      
      // Switch back to verify it works both ways
      await switchBackend('snarky');
      expect(getCurrentBackend()).toBe('snarky');
      const { verificationKey: snarkyVK2 } = await simpleProgram.compile();
      
      // VKs should match
      expect(JSON.stringify(snarkyVK)).toBe(JSON.stringify(sparkyVK));
      expect(JSON.stringify(snarkyVK)).toBe(JSON.stringify(snarkyVK2));
    });

    it('should produce identical VKs for Poseidon hash with odd private inputs', async () => {
      // This specifically tests the bug fix for odd private inputs
      const oddInputProgram = ZkProgram({
        name: 'OddPoseidonTest',
        publicInput: Field,
        methods: {
          hash3: {
            privateInputs: [Field, Field, Field],
            method(publicInput: Field, a: Field, b: Field, c: Field) {
              const hash = Poseidon.hash([a, b, c]);
              hash.assertEquals(publicInput);
            },
          },
        },
      });

      // Compile with both backends
      await switchBackend('snarky');
      const { verificationKey: snarkyVK } = await oddInputProgram.compile();
      
      await switchBackend('sparky');
      const { verificationKey: sparkyVK } = await oddInputProgram.compile();
      
      // VKs must match exactly
      expect(snarkyVK.data).toBe(sparkyVK.data);
      expect(snarkyVK.hash).toBe(sparkyVK.hash);
    });
  });

  describe('Odd vs Even Private Inputs', () => {
    it('should compile successfully for both odd and even private input counts', async () => {
      const oddInputProgram = ZkProgram({
        name: 'OddInputVK',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field], // 1 input = ODD
            method(publicInput, privateField) {
              const hash = Poseidon.hash([privateField, Field(42)]);
              hash.assertEquals(publicInput);
            },
          },
        },
      });

      const evenInputProgram = ZkProgram({
        name: 'EvenInputVK',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field], // 2 inputs = EVEN
            method(publicInput, field1, field2) {
              const hash = Poseidon.hash([field1, field2]);
              hash.assertEquals(publicInput);
            },
          },
        },
      });

      // Test with current backend (should handle both cases)
      await expect(oddInputProgram.compile()).resolves.toHaveProperty('verificationKey');
      await expect(evenInputProgram.compile()).resolves.toHaveProperty('verificationKey');
      
      // Verify the VKs are different (different programs should have different VKs)
      const { verificationKey: oddVK } = await oddInputProgram.compile();
      const { verificationKey: evenVK } = await evenInputProgram.compile();
      
      expect(JSON.stringify(oddVK)).not.toBe(JSON.stringify(evenVK));
    });
  });
});