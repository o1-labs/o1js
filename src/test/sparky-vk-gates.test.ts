/**
 * Gate-specific VK Compatibility Tests
 * Tests individual gate operations to isolate VK differences
 */

import { 
  Field, 
  Bool,
  Group,
  Scalar,
  ZkProgram, 
  Provable,
  switchBackend,
  Gadgets,
  UInt64,
  UInt32
} from 'o1js';

interface GateTestResult {
  gateName: string;
  snarkyConstraints: any;
  sparkyConstraints: any;
  vkMatch: boolean;
  constraintMatch: boolean;
}

const gateResults: GateTestResult[] = [];

async function testGate(name: string, program: any) {
  console.log(`\nTesting gate: ${name}`);
  
  try {
    // Analyze with Snarky
    await switchBackend('snarky');
    const { verificationKey: snarkyVK } = await program.compile();
    const snarkyCs = await program.analyzeMethods();
    const snarkyConstraints = Object.values(snarkyCs)[0];
    
    // Analyze with Sparky
    await switchBackend('sparky');
    const { verificationKey: sparkyVK } = await program.compile();
    const sparkyCs = await program.analyzeMethods();
    const sparkyConstraints = Object.values(sparkyCs)[0];
    
    const vkMatch = snarkyVK.hash.toString() === sparkyVK.hash.toString();
    const constraintMatch = JSON.stringify(snarkyConstraints) === JSON.stringify(sparkyConstraints);
    
    console.log(`  Snarky: ${snarkyConstraints?.gates || 0} gates, VK: ${snarkyVK.hash.toString().substring(0, 20)}...`);
    console.log(`  Sparky: ${sparkyConstraints?.gates || 0} gates, VK: ${sparkyVK.hash.toString().substring(0, 20)}...`);
    console.log(`  VK Match: ${vkMatch ? '✅' : '❌'}`);
    console.log(`  Constraint Match: ${constraintMatch ? '✅' : '❌'}`);
    
    gateResults.push({
      gateName: name,
      snarkyConstraints,
      sparkyConstraints,
      vkMatch,
      constraintMatch
    });
    
  } catch (error) {
    console.log(`  ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
    gateResults.push({
      gateName: name,
      snarkyConstraints: null,
      sparkyConstraints: null,
      vkMatch: false,
      constraintMatch: false
    });
  } finally {
    await switchBackend('snarky');
  }
}

describe('Gate-specific VK Tests', () => {
  
  describe('Zero Gate', () => {
    it('should test zero gate directly', async () => {
      const program = ZkProgram({
        name: 'ZeroGate',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [],
            async method(pub) {
              // The zero gate constrains: 0 * 0 = 0
              const zero = Field(0);
              zero.mul(zero).assertEquals(zero);
            }
          }
        }
      });
      await testGate('zero', program);
    });
  });

  describe('Generic Gate', () => {
    it('should test generic gate patterns', async () => {
      // Pattern 1: Simple linear combination
      const linear = ZkProgram({
        name: 'GenericLinear',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field],
            async method(pub, x, y) {
              // Generic gate: a*x + b*y = c
              x.mul(2).add(y.mul(3)).assertEquals(pub);
            }
          }
        }
      });
      await testGate('generic_linear', linear);

      // Pattern 2: Complex expression
      const complex = ZkProgram({
        name: 'GenericComplex',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field, Field],
            async method(pub, x, y, z) {
              // More complex: x*y + z = pub
              x.mul(y).add(z).assertEquals(pub);
            }
          }
        }
      });
      await testGate('generic_complex', complex);
    });
  });

  describe('Poseidon Gate', () => {
    it('should test poseidon permutation', async () => {
      const program = ZkProgram({
        name: 'PoseidonPermutation',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field, Field],
            async method(pub, x, y, z) {
              // Direct poseidon permutation on 3 elements
              const hash = Gadgets.Poseidon.permutation([x, y, z])[0];
              hash.assertEquals(pub);
            }
          }
        }
      });
      await testGate('poseidon_permutation', program);
    });
  });

  describe('EC Gates', () => {
    it('should test EC double', async () => {
      const program = ZkProgram({
        name: 'ECDouble',
        publicInput: Group,
        methods: {
          test: {
            privateInputs: [Group],
            async method(pub, g) {
              // Point doubling: 2*g
              g.add(g).assertEquals(pub);
            }
          }
        }
      });
      await testGate('ec_double', program);
    });

    it('should test EC mixed addition', async () => {
      const program = ZkProgram({
        name: 'ECMixedAdd',
        publicInput: Group,
        methods: {
          test: {
            privateInputs: [Group],
            async method(pub, g) {
              // Add generator point
              g.add(Group.generator).assertEquals(pub);
            }
          }
        }
      });
      await testGate('ec_mixed_add', program);
    });

    it('should test EC scalar multiplication patterns', async () => {
      const program = ZkProgram({
        name: 'ECScalarMul',
        publicInput: Group,
        methods: {
          test: {
            privateInputs: [Scalar],
            async method(pub, s) {
              // Scalar multiplication of generator
              Group.generator.scale(s).assertEquals(pub);
            }
          }
        }
      });
      await testGate('ec_scalar_mul', program);
    });
  });

  describe('Range Check Gates', () => {
    it('should test 64-bit range check', async () => {
      const program = ZkProgram({
        name: 'RangeCheck64',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [UInt64],
            async method(pub, x) {
              x.value.assertEquals(pub);
            }
          }
        }
      });
      await testGate('range_check_64', program);
    });

    it('should test 32-bit range check', async () => {
      const program = ZkProgram({
        name: 'RangeCheck32',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [UInt32],
            async method(pub, x) {
              x.value.assertEquals(pub);
            }
          }
        }
      });
      await testGate('range_check_32', program);
    });

    it('should test multi-range check', async () => {
      const program = ZkProgram({
        name: 'MultiRangeCheck',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [UInt64, UInt64],
            async method(pub, x, y) {
              x.value.add(y.value).assertEquals(pub);
            }
          }
        }
      });
      await testGate('multi_range_check', program);
    });
  });

  describe('Rotate Gate', () => {
    it('should test rotate operations', async () => {
      const program = ZkProgram({
        name: 'RotateGate',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub, x) {
              // Use rotation gadget if available
              const rotated = Gadgets.rotate64(x, 1, 'left');
              rotated.assertEquals(pub);
            }
          }
        }
      });
      await testGate('rotate', program);
    });
  });

  describe('XOR Gate', () => {
    it('should test XOR operations', async () => {
      const program = ZkProgram({
        name: 'XORGate',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field],
            async method(pub, x, y) {
              // Use XOR gadget
              const result = Gadgets.xor(x, y, 16);
              result.assertEquals(pub);
            }
          }
        }
      });
      await testGate('xor', program);
    });
  });

  describe('Constraint Patterns', () => {
    it('should test constraint reduction', async () => {
      const program = ZkProgram({
        name: 'ConstraintReduction',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub, x) {
              // This should reduce to a single constraint: 10*x = pub
              let sum = x;
              for (let i = 1; i < 10; i++) {
                sum = sum.add(x);
              }
              sum.assertEquals(pub);
            }
          }
        }
      });
      await testGate('constraint_reduction', program);
    });

    it('should test nested operations', async () => {
      const program = ZkProgram({
        name: 'NestedOps',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field],
            async method(pub, x, y) {
              // Nested: ((x + y) * (x - y))^2
              const sum = x.add(y);
              const diff = x.sub(y);
              const prod = sum.mul(diff);
              prod.square().assertEquals(pub);
            }
          }
        }
      });
      await testGate('nested_operations', program);
    });
  });

  afterAll(() => {
    console.log('\n=== GATE TEST SUMMARY ===\n');
    
    const vkMatches = gateResults.filter(r => r.vkMatch).length;
    const constraintMatches = gateResults.filter(r => r.constraintMatch).length;
    
    console.log(`Total gate tests: ${gateResults.length}`);
    console.log(`VK matches: ${vkMatches}/${gateResults.length}`);
    console.log(`Constraint matches: ${constraintMatches}/${gateResults.length}`);
    
    console.log('\nGate breakdown:');
    gateResults.forEach(r => {
      const vk = r.vkMatch ? '✅' : '❌';
      const cs = r.constraintMatch ? '✅' : '❌';
      console.log(`  ${r.gateName}: VK ${vk}, Constraints ${cs}`);
    });
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync(
      'vk-gate-test-results.json',
      JSON.stringify(gateResults, null, 2)
    );
    console.log('\nDetailed gate results saved to vk-gate-test-results.json');
  });
});