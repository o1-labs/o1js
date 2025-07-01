import { Field, ZkProgram, switchBackend, getCurrentBackend } from 'o1js';

describe('Sparky vs Snarky VK Comparison', () => {
  // Test different constraint patterns to identify VK differences
  const TestPrograms = {
    simple: ZkProgram({
      name: 'SimpleProgram',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [Field],
          async method(publicInput, privateInput) {
            privateInput.mul(2).assertEquals(publicInput);
          }
        }
      }
    }),

    linearCombination: ZkProgram({
      name: 'LinearCombinationProgram',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [Field],
          async method(publicInput, x) {
            // Test constraint reduction: x + 2*x + 3*x = 6*x
            const expr = x.add(x.mul(2)).add(x.mul(3));
            expr.assertEquals(publicInput);
          }
        }
      }
    }),

    complex: ZkProgram({
      name: 'ComplexProgram',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [Field, Field, Field],
          async method(publicInput, a, b, c) {
            const ab = a.mul(b);
            const bc = b.mul(c);
            const result = ab.add(bc);
            result.assertEquals(publicInput);
          }
        }
      }
    })
  };

  Object.entries(TestPrograms).forEach(([name, program]) => {
    describe(`${name} program`, () => {
      it('should generate identical VKs in both backends', async () => {
        // Compile with Snarky
        await switchBackend('snarky');
        console.log(`Compiling ${name} with Snarky...`);
        const { verificationKey: snarkyVK } = await program.compile();
        const snarkyHash = snarkyVK.hash.toString();
        
        // Compile with Sparky
        await switchBackend('sparky');
        console.log(`Compiling ${name} with Sparky...`);
        const { verificationKey: sparkyVK } = await program.compile();
        const sparkyHash = sparkyVK.hash.toString();
        
        // Compare VKs
        console.log(`${name} VK comparison:`);
        console.log(`  Snarky hash: ${snarkyHash.substring(0, 20)}...`);
        console.log(`  Sparky hash: ${sparkyHash.substring(0, 20)}...`);
        console.log(`  Data length match: ${snarkyVK.data.length === sparkyVK.data.length}`);
        
        // Find where data differs
        if (snarkyVK.data !== sparkyVK.data) {
          let diffIndex = -1;
          for (let i = 0; i < Math.min(snarkyVK.data.length, sparkyVK.data.length); i++) {
            if (snarkyVK.data[i] !== sparkyVK.data[i]) {
              diffIndex = i;
              break;
            }
          }
          console.log(`  Data differs at index: ${diffIndex}`);
        }
        
        // Test for VK parity
        const vksMatch = snarkyHash === sparkyHash;
        
        if (!vksMatch) {
          console.log(`  ❌ VK MISMATCH - This is the core issue preventing Sparky/Snarky compatibility`);
        }
        
        // This should fail until VK parity is achieved
        expect(sparkyHash).toBe(snarkyHash);
        expect(sparkyVK.data).toBe(snarkyVK.data);
        
        // Reset to snarky
        await switchBackend('snarky');
      }, 60000);
    });
  });

  describe('Constraint reduction impact', () => {
    it('should identify how constraint reduction affects VK generation', async () => {
      const ReductionTest = ZkProgram({
        name: 'ReductionTest',
        publicInput: Field,
        methods: {
          // Method that should benefit from reduction
          testReduction: {
            privateInputs: [Field],
            async method(publicInput, x) {
              // Build: x + x + x + x + x (should reduce to 5*x)
              let sum = x;
              for (let i = 1; i < 5; i++) {
                sum = sum.add(x);
              }
              sum.assertEquals(publicInput);
            }
          },
          // Method with no reduction opportunity
          testNoReduction: {
            privateInputs: [Field, Field, Field, Field, Field],
            async method(publicInput, a, b, c, d, e) {
              // Different variables, no reduction possible
              const sum = a.add(b).add(c).add(d).add(e);
              sum.assertEquals(publicInput);
            }
          }
        }
      });

      // Compare both methods
      for (const method of ['testReduction', 'testNoReduction']) {
        console.log(`\nTesting ${method}:`);
        
        await switchBackend('snarky');
        const snarkyCs = await ReductionTest.analyzeMethods();
        console.log(`  Snarky gates: ${snarkyCs[method as keyof typeof snarkyCs]?.gates || 'unknown'}`);
        
        await switchBackend('sparky');
        const sparkyCs = await ReductionTest.analyzeMethods();
        console.log(`  Sparky gates: ${sparkyCs[method as keyof typeof sparkyCs]?.gates || 'unknown'}`);
      }
      
      await switchBackend('snarky');
    });
  });
});