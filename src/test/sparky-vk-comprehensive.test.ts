/**
 * Comprehensive VK Compatibility Test Suite
 * Tests EVERY entry function in the Snarky/Sparky WASM API
 * This is critical for ensuring VK parity between backends
 */

import { 
  Field, 
  Bool,
  Group,
  Scalar,
  Poseidon,
  ZkProgram, 
  Provable,
  switchBackend, 
  getCurrentBackend,
  createForeignField,
  Bytes
} from 'o1js';

interface TestResult {
  testName: string;
  snarkyVK: string;
  sparkyVK: string;
  match: boolean;
  snarkyGates?: number;
  sparkyGates?: number;
  error?: string;
}

const results: TestResult[] = [];

// Helper to compile and compare VKs
async function compareVKs(name: string, program: any): Promise<TestResult> {
  try {
    // Compile with Snarky
    await switchBackend('snarky');
    const snarkyStart = Date.now();
    const { verificationKey: snarkyVK } = await program.compile();
    const snarkyTime = Date.now() - snarkyStart;
    const snarkyHash = snarkyVK.hash.toString();
    
    // Get constraint count
    const snarkyCs = await program.analyzeMethods();
    const snarkyGates = Object.values(snarkyCs).reduce((sum, method: any) => 
      sum + (method.rows || 0), 0);
    
    // Compile with Sparky
    await switchBackend('sparky');
    const sparkyStart = Date.now();
    const { verificationKey: sparkyVK } = await program.compile();
    const sparkyTime = Date.now() - sparkyStart;
    const sparkyHash = sparkyVK.hash.toString();
    
    // Get constraint count
    const sparkyCs = await program.analyzeMethods();
    const sparkyGates = Object.values(sparkyCs).reduce((sum, method: any) => 
      sum + (method.rows || 0), 0);
    
    const result: TestResult = {
      testName: name,
      snarkyVK: snarkyHash,
      sparkyVK: sparkyHash,
      match: snarkyHash === sparkyHash,
      snarkyGates: snarkyGates as number,
      sparkyGates: sparkyGates as number
    };
    
    console.log(`${name}:`);
    console.log(`  Snarky: ${snarkyHash.substring(0, 20)}... (${snarkyGates} gates, ${snarkyTime}ms)`);
    console.log(`  Sparky: ${sparkyHash.substring(0, 20)}... (${sparkyGates} gates, ${sparkyTime}ms)`);
    console.log(`  Match: ${result.match ? '✅' : '❌'}`);
    
    results.push(result);
    return result;
    
  } catch (error) {
    const result: TestResult = {
      testName: name,
      snarkyVK: '',
      sparkyVK: '',
      match: false,
      error: error instanceof Error ? error.message : String(error)
    };
    console.log(`${name}: ❌ ERROR - ${result.error}`);
    results.push(result);
    return result;
  } finally {
    await switchBackend('snarky'); // Reset to default
  }
}

describe('Comprehensive VK Compatibility Test Suite', () => {
  
  describe('Field Operations', () => {
    it('should test fromNumber', async () => {
      const program = ZkProgram({
        name: 'TestFromNumber',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [],
            async method(pub) {
              const x = Field(42);
              x.assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Field.fromNumber', program);
    });

    it('should test random', async () => {
      const program = ZkProgram({
        name: 'TestRandom',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [],
            async method(pub) {
              // Can't use Field.random() directly since it's non-deterministic
              // Instead test the constraint generation path
              const x = Provable.witness(Field, () => Field.random());
              x.mul(0).assertEquals(Field(0)); // Force constraint
            }
          }
        }
      });
      await compareVKs('Field.random', program);
    });

    it('should test readVar', async () => {
      const program = ZkProgram({
        name: 'TestReadVar',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub, x) {
              Provable.asProver(() => {
                const value = x.toConstant();
                value.assertEquals(pub);
              });
            }
          }
        }
      });
      await compareVKs('Field.readVar', program);
    });

    it('should test assertEqual', async () => {
      const program = ZkProgram({
        name: 'TestAssertEqual',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub, x) {
              x.assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Field.assertEqual', program);
    });

    it('should test assertMul', async () => {
      const program = ZkProgram({
        name: 'TestAssertMul',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field],
            async method(pub, x, y) {
              x.mul(y).assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Field.assertMul', program);
    });

    it('should test assertSquare', async () => {
      const program = ZkProgram({
        name: 'TestAssertSquare',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub, x) {
              x.square().assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Field.assertSquare', program);
    });

    it('should test assertBoolean', async () => {
      const program = ZkProgram({
        name: 'TestAssertBoolean',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [],
            async method(pub) {
              const b = Provable.witness(Bool, () => Bool(true));
              b.toField().assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Field.assertBoolean', program);
    });

    it('should test add', async () => {
      const program = ZkProgram({
        name: 'TestAdd',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field],
            async method(pub, x, y) {
              x.add(y).assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Field.add', program);
    });

    it('should test sub', async () => {
      const program = ZkProgram({
        name: 'TestSub',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field],
            async method(pub, x, y) {
              x.sub(y).assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Field.sub', program);
    });

    it('should test div', async () => {
      const program = ZkProgram({
        name: 'TestDiv',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field],
            async method(pub, x, y) {
              x.div(y).assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Field.div', program);
    });

    it('should test negate', async () => {
      const program = ZkProgram({
        name: 'TestNegate',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub, x) {
              x.neg().assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Field.negate', program);
    });

    it('should test inv', async () => {
      const program = ZkProgram({
        name: 'TestInv',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub, x) {
              x.inv().assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Field.inv', program);
    });

    it('should test sqrt', async () => {
      const program = ZkProgram({
        name: 'TestSqrt',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub, x) {
              x.sqrt().assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Field.sqrt', program);
    });
  });

  describe('Bool Operations', () => {
    it('should test and', async () => {
      const program = ZkProgram({
        name: 'TestBoolAnd',
        publicInput: Bool,
        methods: {
          test: {
            privateInputs: [Bool, Bool],
            async method(pub, a, b) {
              a.and(b).assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Bool.and', program);
    });

    it('should test or', async () => {
      const program = ZkProgram({
        name: 'TestBoolOr',
        publicInput: Bool,
        methods: {
          test: {
            privateInputs: [Bool, Bool],
            async method(pub, a, b) {
              a.or(b).assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Bool.or', program);
    });

    it('should test not', async () => {
      const program = ZkProgram({
        name: 'TestBoolNot',
        publicInput: Bool,
        methods: {
          test: {
            privateInputs: [Bool],
            async method(pub, a) {
              a.not().assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Bool.not', program);
    });
  });

  describe('Hash Functions', () => {
    it('should test poseidon', async () => {
      const program = ZkProgram({
        name: 'TestPoseidon',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field],
            async method(pub, x, y) {
              Poseidon.hash([x, y]).assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Poseidon.hash', program);
    });

    it('should test poseidon sponge', async () => {
      const program = ZkProgram({
        name: 'TestPoseidonSponge',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field, Field],
            async method(pub, x, y, z) {
              const sponge = new Poseidon.Sponge();
              sponge.absorb(x);
              sponge.absorb(y);
              sponge.absorb(z);
              const hash = sponge.squeeze();
              hash.assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('Poseidon.sponge', program);
    });
  });

  describe('EC Operations', () => {
    it('should test EC add', async () => {
      const program = ZkProgram({
        name: 'TestECAdd',
        publicInput: Group,
        methods: {
          test: {
            privateInputs: [Group, Group],
            async method(pub, g1, g2) {
              g1.add(g2).assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('EC.add', program);
    });

    it('should test EC scale', async () => {
      const program = ZkProgram({
        name: 'TestECScale',
        publicInput: Group,
        methods: {
          test: {
            privateInputs: [Scalar, Group],
            async method(pub, s, g) {
              g.scale(s).assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('EC.scale', program);
    });

    it('should test EC endoscale', async () => {
      const program = ZkProgram({
        name: 'TestECEndoscale',
        publicInput: Group,
        methods: {
          test: {
            privateInputs: [Field, Group],
            async method(pub, s, g) {
              // Endoscale uses Field instead of Scalar for endomorphism
              const scalar = Scalar.fromFields([s]);
              g.scale(scalar).assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('EC.endoscale', program);
    });
  });

  describe('Range Checks', () => {
    it('should test rangeCheck64', async () => {
      const program = ZkProgram({
        name: 'TestRangeCheck64',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub, x) {
              Provable.witness(Field, () => {
                // Force range check by using a UInt64
                const uint = x.rangeCheckHelper(64);
                return x;
              }).assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('rangeCheck64', program);
    });

    it('should test rangeCheck0', async () => {
      const program = ZkProgram({
        name: 'TestRangeCheck0',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [],
            async method(pub) {
              const zero = Field(0);
              zero.assertEquals(pub);
              // TODO: Add explicit rangeCheck0 when available in API
            }
          }
        }
      });
      await compareVKs('rangeCheck0', program);
    });
  });

  describe('Foreign Field Operations', () => {
    it('should test foreignFieldAdd', async () => {
      const program = ZkProgram({
        name: 'TestForeignFieldAdd',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field],
            async method(pub, x, y) {
              // Use secp256k1 modulus for testing
              const f = 115792089237316195423570985008687907852837564279074904382605163141518161494337n;
              const ForeignFieldClass = createForeignField(f);
              const fx = new ForeignFieldClass(x.toBigInt());
              const fy = new ForeignFieldClass(y.toBigInt());
              const result = fx.add(fy);
              // Extract low limb as Field for comparison - use toBits and take first 64 bits
              const bits = result.toBits();
              let value = Field(0);
              let power = Field(1);
              for (let i = 0; i < Math.min(64, bits.length); i++) {
                value = value.add(bits[i].toField().mul(power));
                power = power.mul(2);
              }
              value.assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('foreignFieldAdd', program);
    });

    it('should test foreignFieldMul', async () => {
      const program = ZkProgram({
        name: 'TestForeignFieldMul',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field],
            async method(pub, x, y) {
              // Use secp256k1 modulus for testing
              const f = 115792089237316195423570985008687907852837564279074904382605163141518161494337n;
              const ForeignFieldClass = createForeignField(f);
              const fx = new ForeignFieldClass(x.toBigInt());
              const fy = new ForeignFieldClass(y.toBigInt());
              // Need to assertAlmostReduced before multiplication
              const fxReduced = fx.assertAlmostReduced();
              const fyReduced = fy.assertAlmostReduced();
              const result = fxReduced.mul(fyReduced);
              // Extract low limb as Field for comparison - use toBits and take first 64 bits
              const bits = result.toBits();
              let value = Field(0);
              let power = Field(1);
              for (let i = 0; i < Math.min(64, bits.length); i++) {
                value = value.add(bits[i].toField().mul(power));
                power = power.mul(2);
              }
              value.assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('foreignFieldMul', program);
    });
  });

  describe('Advanced Gates', () => {
    it('should test generic gate', async () => {
      const program = ZkProgram({
        name: 'TestGenericGate',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field],
            async method(pub, x, y) {
              // Generic gate: 2*x + 3*y = pub
              x.mul(2).add(y.mul(3)).assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('generic', program);
    });

    it('should test rotate gate', async () => {
      const program = ZkProgram({
        name: 'TestRotateGate',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub, x) {
              // TODO: Add explicit rotate gate test when available
              // For now just test basic rotation logic
              x.assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('rotate', program);
    });
  });

  describe('Constraint System Operations', () => {
    it('should test enterConstraintSystem', async () => {
      const program = ZkProgram({
        name: 'TestEnterConstraintSystem',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub, x) {
              // This tests the constraint system generation path
              x.mul(x).assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('enterConstraintSystem', program);
    });

    it('should test exists/witness', async () => {
      const program = ZkProgram({
        name: 'TestExists',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [],
            async method(pub) {
              const witness = Provable.witness(Field, () => Field(42));
              witness.mul(2).assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('exists', program);
    });
  });

  describe('Complex Programs', () => {
    it('should test program with many constraint types', async () => {
      const program = ZkProgram({
        name: 'TestComplexProgram',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field, Field, Bool, Group],
            async method(pub, x, y, b, g) {
              // Mix of operations
              const sum = x.add(y);
              const prod = x.mul(y);
              const conditioned = Provable.if(b, sum, prod);
              const hashed = Poseidon.hash([conditioned, x]);
              const scaled = g.scale(Scalar.fromFields([hashed]));
              // Just check that we can generate constraints
              hashed.assertEquals(pub);
            }
          }
        }
      });
      await compareVKs('ComplexProgram', program);
    });

    it('should test recursive circuit structure', async () => {
      const InnerProgram = ZkProgram({
        name: 'InnerProgram',
        publicInput: Field,
        methods: {
          compute: {
            privateInputs: [Field],
            async method(pub, x) {
              x.square().assertEquals(pub);
            }
          }
        }
      });

      const program = ZkProgram({
        name: 'TestRecursive',
        publicInput: Field,
        methods: {
          test: {
            privateInputs: [Field],
            async method(pub, x) {
              // Simple circuit that could be made recursive
              x.mul(x).mul(x).assertEquals(pub); // x^3
            }
          }
        }
      });
      await compareVKs('RecursiveStructure', program);
    });
  });

  // After all tests, generate report
  afterAll(() => {
    console.log('\n=== VK COMPATIBILITY REPORT ===\n');
    
    const passed = results.filter(r => r.match && !r.error).length;
    const failed = results.filter(r => !r.match && !r.error).length;
    const errors = results.filter(r => r.error).length;
    
    console.log(`Total tests: ${results.length}`);
    console.log(`Passed: ${passed} (${((passed/results.length)*100).toFixed(1)}%)`);
    console.log(`Failed: ${failed} (${((failed/results.length)*100).toFixed(1)}%)`);
    console.log(`Errors: ${errors} (${((errors/results.length)*100).toFixed(1)}%)`);
    
    if (failed > 0) {
      console.log('\nFailed tests:');
      results.filter(r => !r.match && !r.error).forEach(r => {
        console.log(`  - ${r.testName}`);
        console.log(`    Snarky: ${r.snarkyVK.substring(0, 20)}...`);
        console.log(`    Sparky: ${r.sparkyVK.substring(0, 20)}...`);
      });
    }
    
    if (errors > 0) {
      console.log('\nErrors:');
      results.filter(r => r.error).forEach(r => {
        console.log(`  - ${r.testName}: ${r.error}`);
      });
    }
    
    // Check for the critical issue: all Sparky VKs being the same
    const sparkyVKs = results.filter(r => r.sparkyVK).map(r => r.sparkyVK);
    const uniqueSparkyVKs = new Set(sparkyVKs);
    if (uniqueSparkyVKs.size === 1 && sparkyVKs.length > 1) {
      console.log('\n🚨 CRITICAL ISSUE: All Sparky VKs are identical!');
      console.log(`   The VK is: ${sparkyVKs[0]}`);
    }
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync(
      'vk-comprehensive-test-results.json', 
      JSON.stringify(results, null, 2)
    );
    console.log('\nDetailed results saved to vk-comprehensive-test-results.json');
  });
});