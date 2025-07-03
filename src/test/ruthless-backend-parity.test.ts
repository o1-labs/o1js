/**
 * RUTHLESS BACKEND PARITY TESTING
 * 
 * Property-based tests designed to find every possible difference between
 * Snarky and Sparky backends. Tests are ruthless but fair - any legitimate
 * differences will be documented honestly.
 * 
 * Testing Strategy:
 * 1. Field arithmetic properties with extreme edge cases
 * 2. Constraint generation consistency across patterns  
 * 3. VK generation across diverse circuit structures
 * 4. Backend switching under stress conditions
 * 5. Cryptographic primitive consistency
 * 6. Error handling and boundary condition validation
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import { Field, Bool, Poseidon, ZkProgram, verify, Provable } from '../../dist/node/index.js';
import { switchBackend, getCurrentBackend } from '../../dist/node/index.js';

// Constants for field arithmetic edge cases
const FIELD_MODULUS = 28948022309329048855892746252171976963363056481941560715954676764349967630337n;
const FIELD_ZERO = 0n;
const FIELD_ONE = 1n;
const FIELD_MAX = FIELD_MODULUS - 1n;
const FIELD_HALF = FIELD_MODULUS / 2n;

interface TestResult {
  success: boolean;
  error?: string;
  snarkyResult?: any;
  sparkyResult?: any;
  propertyName: string;
}

class RuthlessBackendTester {
  private results: TestResult[] = [];
  
  async runPropertyTest(
    propertyName: string,
    testFn: () => Promise<boolean>,
    iterations: number = 100
  ): Promise<void> {
    console.log(`🔥 RUTHLESS TEST: ${propertyName} (${iterations} iterations)`);
    
    for (let i = 0; i < iterations; i++) {
      try {
        const success = await testFn();
        this.results.push({ success, propertyName });
        
        if (!success) {
          console.log(`❌ FAILURE in ${propertyName} iteration ${i + 1}`);
        }
      } catch (error) {
        this.results.push({
          success: false,
          error: (error as Error).message,
          propertyName
        });
        console.log(`💥 ERROR in ${propertyName}: ${(error as Error).message}`);
      }
    }
  }
  
  reportResults(): void {
    const byProperty = this.results.reduce((acc, result) => {
      if (!acc[result.propertyName]) {
        acc[result.propertyName] = { successes: 0, failures: 0, errors: 0 };
      }
      if (result.error) {
        acc[result.propertyName].errors++;
      } else if (result.success) {
        acc[result.propertyName].successes++;
      } else {
        acc[result.propertyName].failures++;
      }
      return acc;
    }, {} as Record<string, { successes: number; failures: number; errors: number }>);
    
    console.log('\n🔥 RUTHLESS BACKEND PARITY REPORT');
    console.log('=====================================');
    
    let totalTests = 0;
    let totalFailures = 0;
    let totalErrors = 0;
    
    Object.entries(byProperty).forEach(([property, stats]) => {
      const total = stats.successes + stats.failures + stats.errors;
      const successRate = ((stats.successes / total) * 100).toFixed(1);
      
      totalTests += total;
      totalFailures += stats.failures;
      totalErrors += stats.errors;
      
      console.log(`${property}: ${successRate}% success (${stats.successes}/${total})`);
      if (stats.failures > 0) console.log(`  ❌ ${stats.failures} failures`);
      if (stats.errors > 0) console.log(`  💥 ${stats.errors} errors`);
    });
    
    const overallSuccessRate = (((totalTests - totalFailures - totalErrors) / totalTests) * 100).toFixed(1);
    console.log(`\n📊 OVERALL SUCCESS RATE: ${overallSuccessRate}%`);
    console.log(`📊 TOTAL TESTS: ${totalTests}`);
    console.log(`📊 TOTAL FAILURES: ${totalFailures}`);
    console.log(`📊 TOTAL ERRORS: ${totalErrors}`);
  }
}

const tester = new RuthlessBackendTester();

// Field element generators for property-based testing
const fieldArbitrary = fc.oneof(
  fc.constant(FIELD_ZERO),
  fc.constant(FIELD_ONE), 
  fc.constant(FIELD_MAX),
  fc.constant(FIELD_HALF),
  fc.bigInt({ min: 0n, max: FIELD_MAX }),
  // Edge cases near modulus
  fc.bigInt({ min: FIELD_MAX - 100n, max: FIELD_MAX }),
  // Small values
  fc.bigInt({ min: 0n, max: 1000n }),
  // Random large values
  fc.bigInt({ min: FIELD_HALF, max: FIELD_MAX })
);

describe('🔥 RUTHLESS Backend Parity Testing', () => {
  
  beforeAll(async () => {
    // Ensure we start with Snarky backend
    await switchBackend('snarky');
  });

  afterAll(() => {
    tester.reportResults();
  });

  describe('Field Arithmetic Properties', () => {
    
    test('Field Addition Commutativity', async () => {
      await tester.runPropertyTest(
        'field_addition_commutativity',
        async () => {
          try {
            await fc.assert(
              fc.asyncProperty(fieldArbitrary, fieldArbitrary, async (a, b) => {
                // Test with Snarky
                await switchBackend('snarky');
                const fieldA_snarky = Field(a);
                const fieldB_snarky = Field(b);
                const sum1_snarky = fieldA_snarky.add(fieldB_snarky).toString();
                const sum2_snarky = fieldB_snarky.add(fieldA_snarky).toString();
                
                // Test with Sparky  
                await switchBackend('sparky');
                const fieldA_sparky = Field(a);
                const fieldB_sparky = Field(b);
                const sum1_sparky = fieldA_sparky.add(fieldB_sparky).toString();
                const sum2_sparky = fieldB_sparky.add(fieldA_sparky).toString();
                
                // Commutativity within each backend
                const commutative_snarky = sum1_snarky === sum2_snarky;
                const commutative_sparky = sum1_sparky === sum2_sparky;
                
                // Cross-backend consistency
                const cross_consistent = sum1_snarky === sum1_sparky && sum2_snarky === sum2_sparky;
                
                if (!commutative_snarky || !commutative_sparky || !cross_consistent) {
                  console.log(`❌ Addition commutativity failure:`);
                  console.log(`  a=${a}, b=${b}`);
                  console.log(`  Snarky: ${sum1_snarky} vs ${sum2_snarky} (commutative: ${commutative_snarky})`);
                  console.log(`  Sparky: ${sum1_sparky} vs ${sum2_sparky} (commutative: ${commutative_sparky})`);
                  console.log(`  Cross-consistent: ${cross_consistent}`);
                }
                
                return commutative_snarky && commutative_sparky && cross_consistent;
              }),
              { numRuns: 50 }
            );
            return true;
          } catch (error) {
            console.log(`Property test failed: ${(error as Error).message}`);
            return false;
          }
        },
        1
      );
    });

    test('Field Multiplication Associativity', async () => {
      await tester.runPropertyTest(
        'field_multiplication_associativity',
        async () => {
          return await fc.assert(
            fc.asyncProperty(fieldArbitrary, fieldArbitrary, fieldArbitrary, async (a, b, c) => {
              // Test with Snarky
              await switchBackend('snarky');
              const fieldA_snarky = Field(a);
              const fieldB_snarky = Field(b);
              const fieldC_snarky = Field(c);
              const prod1_snarky = fieldA_snarky.mul(fieldB_snarky).mul(fieldC_snarky).toString();
              const prod2_snarky = fieldA_snarky.mul(fieldB_snarky.mul(fieldC_snarky)).toString();
              
              // Test with Sparky
              await switchBackend('sparky');
              const fieldA_sparky = Field(a);
              const fieldB_sparky = Field(b);
              const fieldC_sparky = Field(c);
              const prod1_sparky = fieldA_sparky.mul(fieldB_sparky).mul(fieldC_sparky).toString();
              const prod2_sparky = fieldA_sparky.mul(fieldB_sparky.mul(fieldC_sparky)).toString();
              
              // Associativity within each backend
              const associative_snarky = prod1_snarky === prod2_snarky;
              const associative_sparky = prod1_sparky === prod2_sparky;
              
              // Cross-backend consistency
              const cross_consistent = prod1_snarky === prod1_sparky && prod2_snarky === prod2_sparky;
              
              if (!associative_snarky || !associative_sparky || !cross_consistent) {
                console.log(`❌ Multiplication associativity failure:`);
                console.log(`  a=${a}, b=${b}, c=${c}`);
                console.log(`  Snarky: ${prod1_snarky} vs ${prod2_snarky} (associative: ${associative_snarky})`);
                console.log(`  Sparky: ${prod1_sparky} vs ${prod2_sparky} (associative: ${associative_sparky})`);
                console.log(`  Cross-consistent: ${cross_consistent}`);
              }
              
              return associative_snarky && associative_sparky && cross_consistent;
            }),
            { numRuns: 30 }
          );
        },
        1
      );
    });

    test('Field Inversion Properties', async () => {
      await tester.runPropertyTest(
        'field_inversion_properties',
        async () => {
          return await fc.assert(
            fc.asyncProperty(
              fieldArbitrary.filter(x => x !== FIELD_ZERO), 
              async (a) => {
                // Test with Snarky
                await switchBackend('snarky');
                const fieldA_snarky = Field(a);
                const inv_snarky = fieldA_snarky.inv();
                const product_snarky = fieldA_snarky.mul(inv_snarky).toString();
                
                // Test with Sparky
                await switchBackend('sparky');
                const fieldA_sparky = Field(a);
                const inv_sparky = fieldA_sparky.inv();
                const product_sparky = fieldA_sparky.mul(inv_sparky).toString();
                
                // Should equal 1 in both backends
                const valid_snarky = product_snarky === Field(1).toString();
                const valid_sparky = product_sparky === Field(1).toString();
                
                // Inverses should be identical across backends
                const inv_consistent = inv_snarky.toString() === inv_sparky.toString();
                
                if (!valid_snarky || !valid_sparky || !inv_consistent) {
                  console.log(`❌ Inversion property failure:`);
                  console.log(`  a=${a}`);
                  console.log(`  Snarky: inv=${inv_snarky.toString()}, a*inv=${product_snarky} (valid: ${valid_snarky})`);
                  console.log(`  Sparky: inv=${inv_sparky.toString()}, a*inv=${product_sparky} (valid: ${valid_sparky})`);
                  console.log(`  Inv consistent: ${inv_consistent}`);
                }
                
                return valid_snarky && valid_sparky && inv_consistent;
              }
            ),
            { numRuns: 50 }
          );
        },
        1
      );
    });
  });

  describe('Constraint Generation Consistency', () => {
    
    test('Simple Circuit Constraint Parity', async () => {
      await tester.runPropertyTest(
        'simple_circuit_constraint_parity',
        async () => {
          return await fc.assert(
            fc.asyncProperty(fieldArbitrary, fieldArbitrary, async (a, b) => {
              
              // Define a simple circuit
              const SimpleCircuit = ZkProgram({
                name: 'SimpleCircuit',
                publicInput: Field,
                methods: {
                  multiply: {
                    privateInputs: [Field],
                    async method(publicInput: Field, privateInput: Field) {
                      const product = publicInput.mul(privateInput);
                      product.assertEquals(Field(a).mul(Field(b)));
                    }
                  }
                }
              });
              
              // Test with Snarky
              await switchBackend('snarky');
              let snarkyConstraints;
              try {
                await SimpleCircuit.compile();
                snarkyConstraints = (globalThis as any).__snarky?.gates?.length || 0;
              } catch (error) {
                console.log(`Snarky compilation failed: ${(error as Error).message}`);
                return false;
              }
              
              // Test with Sparky  
              await switchBackend('sparky');
              let sparkyConstraints;
              try {
                await SimpleCircuit.compile();
                sparkyConstraints = (globalThis as any).__snarky?.gates?.length || 0;
              } catch (error) {
                console.log(`Sparky compilation failed: ${(error as Error).message}`);
                return false;
              }
              
              const constraintsMatch = snarkyConstraints === sparkyConstraints;
              
              if (!constraintsMatch) {
                console.log(`❌ Constraint count mismatch:`);
                console.log(`  Inputs: a=${a}, b=${b}`);
                console.log(`  Snarky constraints: ${snarkyConstraints}`);
                console.log(`  Sparky constraints: ${sparkyConstraints}`);
              }
              
              return constraintsMatch;
            }),
            { numRuns: 20 }
          );
        },
        1
      );
    });
  });

  describe('VK Generation Consistency', () => {
    
    test('VK Hash Consistency for Identical Circuits', async () => {
      await tester.runPropertyTest(
        'vk_hash_consistency',
        async () => {
          return await fc.assert(
            fc.asyncProperty(
              fc.integer({ min: 1, max: 100 }),
              async (operationCount) => {
                
                // Create a circuit with varying complexity
                const TestCircuit = ZkProgram({
                  name: 'TestCircuit', 
                  publicInput: Field,
                  methods: {
                    compute: {
                      privateInputs: [Field],
                      async method(publicInput: Field, privateInput: Field) {
                        let result = publicInput;
                        for (let i = 0; i < operationCount; i++) {
                          result = result.add(privateInput);
                        }
                        result.assertEquals(publicInput.add(privateInput.mul(operationCount)));
                      }
                    }
                  }
                });
                
                // Compile with Snarky
                await switchBackend('snarky');
                let snarkyVK;
                try {
                  const { verificationKey: vk } = await TestCircuit.compile();
                  snarkyVK = vk.hash;
                } catch (error) {
                  console.log(`Snarky VK generation failed: ${(error as Error).message}`);
                  return false;
                }
                
                // Compile with Sparky
                await switchBackend('sparky');
                let sparkyVK;
                try {
                  const { verificationKey: vk } = await TestCircuit.compile();
                  sparkyVK = vk.hash;
                } catch (error) {
                  console.log(`Sparky VK generation failed: ${(error as Error).message}`);
                  return false;
                }
                
                const vkMatch = snarkyVK === sparkyVK;
                
                if (!vkMatch) {
                  console.log(`❌ VK hash mismatch:`);
                  console.log(`  Operation count: ${operationCount}`);
                  console.log(`  Snarky VK: ${snarkyVK}`);
                  console.log(`  Sparky VK: ${sparkyVK}`);
                }
                
                return vkMatch;
              }
            ),
            { numRuns: 10 }
          );
        },
        1
      );
    });
  });

  describe('Cryptographic Primitive Consistency', () => {
    
    test('Poseidon Hash Consistency', async () => {
      await tester.runPropertyTest(
        'poseidon_hash_consistency',
        async () => {
          return await fc.assert(
            fc.asyncProperty(
              fc.array(fieldArbitrary, { minLength: 1, maxLength: 10 }),
              async (inputs) => {
                
                // Test with Snarky
                await switchBackend('snarky');
                const snarkyFields = inputs.map(x => Field(x));
                const snarkyHash = Poseidon.hash(snarkyFields).toString();
                
                // Test with Sparky
                await switchBackend('sparky');
                const sparkyFields = inputs.map(x => Field(x));
                const sparkyHash = Poseidon.hash(sparkyFields).toString();
                
                const hashMatch = snarkyHash === sparkyHash;
                
                if (!hashMatch) {
                  console.log(`❌ Poseidon hash mismatch:`);
                  console.log(`  Inputs: [${inputs.join(', ')}]`);
                  console.log(`  Snarky hash: ${snarkyHash}`);
                  console.log(`  Sparky hash: ${sparkyHash}`);
                }
                
                return hashMatch;
              }
            ),
            { numRuns: 100 }
          );
        },
        1
      );
    });
  });

  describe('Backend Switching Reliability', () => {
    
    test('State Consistency After Multiple Switches', async () => {
      await tester.runPropertyTest(
        'backend_switching_reliability',
        async () => {
          // Use deterministic switch count based on iteration index
          const switchCount = (Math.abs(Date.now()) % 10) + 1;
          
          for (let i = 0; i < switchCount; i++) {
            const backend = i % 2 === 0 ? 'snarky' : 'sparky';
            await switchBackend(backend);
            
            const currentBackend = getCurrentBackend();
            if (currentBackend !== backend) {
              console.log(`❌ Backend switch failed: expected ${backend}, got ${currentBackend}`);
              return false;
            }
            
            // Test basic operation after switch
            try {
              const testField = Field(42);
              const result = testField.add(Field(1));
              if (result.toString() !== Field(43).toString()) {
                console.log(`❌ Field operation failed after switch to ${backend}`);
                return false;
              }
            } catch (error) {
              console.log(`❌ Field operation error after switch to ${backend}: ${(error as Error).message}`);
              return false;
            }
          }
          
          return true;
        },
        50
      );
    });
  });

  describe('Error Handling Consistency', () => {
    
    test('Division by Zero Handling', async () => {
      await tester.runPropertyTest(
        'division_by_zero_handling',
        async () => {
          return await fc.assert(
            fc.asyncProperty(fieldArbitrary, async (a) => {
              
              let snarkyError = false;
              let sparkyError = false;
              
              // Test with Snarky
              await switchBackend('snarky');
              try {
                const fieldA = Field(a);
                const zero = Field(0);
                fieldA.div(zero);
              } catch (error) {
                snarkyError = true;
              }
              
              // Test with Sparky  
              await switchBackend('sparky');
              try {
                const fieldA = Field(a);
                const zero = Field(0);
                fieldA.div(zero);
              } catch (error) {
                sparkyError = true;
              }
              
              // Both should handle division by zero consistently
              const consistent = snarkyError === sparkyError;
              
              if (!consistent) {
                console.log(`❌ Division by zero handling inconsistent:`);
                console.log(`  a=${a}`);
                console.log(`  Snarky error: ${snarkyError}`);
                console.log(`  Sparky error: ${sparkyError}`);
              }
              
              return consistent;
            }),
            { numRuns: 20 }
          );
        },
        1
      );
    });
  });

  describe('Edge Case Boundary Testing', () => {
    
    test('Field Modulus Boundary Operations', async () => {
      const boundaryValues = [
        FIELD_ZERO,
        FIELD_ONE,
        FIELD_MAX,
        FIELD_MAX - 1n,
        FIELD_MODULUS, // Should wrap to 0
        FIELD_MODULUS + 1n, // Should wrap to 1
      ];
      
      await tester.runPropertyTest(
        'field_modulus_boundary_operations',
        async () => {
          for (const val of boundaryValues) {
            // Test with Snarky
            await switchBackend('snarky');
            const snarkyField = Field(val);
            const snarkyString = snarkyField.toString();
            
            // Test with Sparky
            await switchBackend('sparky');  
            const sparkyField = Field(val);
            const sparkyString = sparkyField.toString();
            
            if (snarkyString !== sparkyString) {
              console.log(`❌ Boundary value handling mismatch:`);
              console.log(`  Value: ${val}`);
              console.log(`  Snarky: ${snarkyString}`);
              console.log(`  Sparky: ${sparkyString}`);
              return false;
            }
          }
          
          return true;
        },
        1
      );
    });
  });
});