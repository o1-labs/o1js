/**
 * VK Generation Test Suite for Snarky
 * 
 * Tests verification key generation with the snarky backend
 */

export interface TestCase {
  name: string;
  testFn: () => Promise<void>;
  timeout?: number;
}

export const tests: TestCase[] = [
  {
    name: 'simple-zkprogram-vk',
    testFn: async () => {
      const o1js = (global as any).o1js;
      const { Field, ZkProgram, Provable } = o1js;
      
      // Create a simple zkProgram
      const SimpleProgram = ZkProgram({
        name: 'simple-test',
        publicInput: Field,
        methods: {
          run: {
            privateInputs: [Field],
            async method(publicInput: Field, privateInput: Field) {
              publicInput.assertEquals(privateInput);
            }
          }
        }
      });
      
      // Compile and get VK
      const { verificationKey } = await SimpleProgram.compile();
      
      if (!verificationKey) {
        throw new Error('VK generation failed');
      }
      
      // Basic VK structure validation
      if (!verificationKey.data || !verificationKey.hash) {
        throw new Error('VK missing required fields');
      }
    },
    timeout: 30000
  },

  {
    name: 'zkprogram-with-assertions',
    testFn: async () => {
      const o1js = (global as any).o1js;
      const { Field, ZkProgram } = o1js;
      
      const AssertionProgram = ZkProgram({
        name: 'assertion-test',
        publicInput: Field,
        methods: {
          checkRange: {
            privateInputs: [Field],
            async method(publicInput: Field, privateInput: Field) {
              // Multiple assertions
              privateInput.assertGreaterThan(Field(0));
              privateInput.assertLessThan(Field(100));
              publicInput.assertEquals(privateInput.mul(2));
            }
          }
        }
      });
      
      const { verificationKey } = await AssertionProgram.compile();
      
      if (!verificationKey || !verificationKey.hash) {
        throw new Error('VK generation failed for assertion program');
      }
    },
    timeout: 30000
  },

  {
    name: 'poseidon-hash-vk',
    testFn: async () => {
      const o1js = (global as any).o1js;
      const { Field, ZkProgram, Poseidon } = o1js;
      
      const HashProgram = ZkProgram({
        name: 'poseidon-test',
        publicInput: Field,
        methods: {
          hash: {
            privateInputs: [Field, Field],
            async method(publicOutput: Field, a: Field, b: Field) {
              const hash = Poseidon.hash([a, b]);
              publicOutput.assertEquals(hash);
            }
          }
        }
      });
      
      const { verificationKey } = await HashProgram.compile();
      
      if (!verificationKey) {
        throw new Error('VK generation failed for Poseidon program');
      }
      
      // VK should be deterministic for same program
      const vkHash = verificationKey.hash;
      if (!vkHash || vkHash.length < 10) {
        throw new Error('Invalid VK hash');
      }
    },
    timeout: 30000
  },

  {
    name: 'complex-arithmetic-vk',
    testFn: async () => {
      const o1js = (global as any).o1js;
      const { Field, ZkProgram } = o1js;
      
      const ComplexProgram = ZkProgram({
        name: 'complex-arithmetic',
        publicInput: Field,
        methods: {
          compute: {
            privateInputs: [Field, Field, Field],
            async method(result: Field, a: Field, b: Field, c: Field) {
              // Complex computation: (a * b) + (b * c) - (a * c)
              const ab = a.mul(b);
              const bc = b.mul(c);
              const ac = a.mul(c);
              const sum = ab.add(bc);
              const final = sum.sub(ac);
              result.assertEquals(final);
            }
          }
        }
      });
      
      const { verificationKey } = await ComplexProgram.compile();
      
      if (!verificationKey) {
        throw new Error('VK generation failed for complex arithmetic');
      }
    },
    timeout: 45000
  },

  {
    name: 'conditional-logic-vk',
    testFn: async () => {
      const o1js = (global as any).o1js;
      const { Field, ZkProgram, Provable } = o1js;
      
      const ConditionalProgram = ZkProgram({
        name: 'conditional-test',
        publicInput: Field,
        methods: {
          selectMax: {
            privateInputs: [Field, Field],
            async method(max: Field, a: Field, b: Field) {
              const isGreater = a.greaterThan(b);
              const selected = Provable.if(isGreater, a, b);
              max.assertEquals(selected);
            }
          }
        }
      });
      
      const { verificationKey } = await ConditionalProgram.compile();
      
      if (!verificationKey) {
        throw new Error('VK generation failed for conditional program');
      }
    },
    timeout: 30000
  }
];

export default { tests };