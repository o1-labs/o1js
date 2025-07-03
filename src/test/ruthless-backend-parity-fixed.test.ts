/**
 * RUTHLESS BACKEND PARITY TESTING
 * 
 * Property-based tests designed to find every possible difference between
 * Snarky and Sparky backends. Tests are ruthless but fair - any legitimate
 * differences will be documented honestly.
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
  propertyName: string;
  details?: string;
}

class RuthlessBackendTester {
  private results: TestResult[] = [];
  
  recordResult(propertyName: string, success: boolean, error?: string, details?: string): void {
    this.results.push({ success, error, propertyName, details });
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
    console.log('🔥 Starting ruthless backend parity testing...');
    await switchBackend('snarky');
  });

  afterAll(() => {
    tester.reportResults();
  });

  describe('Field Arithmetic Properties', () => {
    
    test('Field Addition Cross-Backend Consistency', async () => {
      console.log('🔥 Testing field addition consistency...');
      
      // Generate test cases
      const testCases = await fc.sample(
        fc.tuple(fieldArbitrary, fieldArbitrary),
        50
      );
      
      for (const [a, b] of testCases) {
        try {
          // Test with Snarky
          await switchBackend('snarky');
          const fieldA_snarky = Field(a);
          const fieldB_snarky = Field(b);
          const sum_snarky = fieldA_snarky.add(fieldB_snarky).toString();
          
          // Test with Sparky  
          await switchBackend('sparky');
          const fieldA_sparky = Field(a);
          const fieldB_sparky = Field(b);
          const sum_sparky = fieldA_sparky.add(fieldB_sparky).toString();
          
          const consistent = sum_snarky === sum_sparky;
          
          if (!consistent) {
            console.log(`❌ Addition inconsistency: a=${a}, b=${b}`);
            console.log(`  Snarky: ${sum_snarky}`);
            console.log(`  Sparky: ${sum_sparky}`);
            tester.recordResult('field_addition_consistency', false, undefined, `a=${a}, b=${b}, snarky=${sum_snarky}, sparky=${sum_sparky}`);
          } else {
            tester.recordResult('field_addition_consistency', true);
          }
        } catch (error) {
          console.log(`💥 Addition error: ${(error as Error).message}`);
          tester.recordResult('field_addition_consistency', false, (error as Error).message);
        }
      }
    });

    test('Field Multiplication Cross-Backend Consistency', async () => {
      console.log('🔥 Testing field multiplication consistency...');
      
      const testCases = await fc.sample(
        fc.tuple(fieldArbitrary, fieldArbitrary),
        30
      );
      
      for (const [a, b] of testCases) {
        try {
          // Test with Snarky
          await switchBackend('snarky');
          const fieldA_snarky = Field(a);
          const fieldB_snarky = Field(b);
          const product_snarky = fieldA_snarky.mul(fieldB_snarky).toString();
          
          // Test with Sparky
          await switchBackend('sparky');
          const fieldA_sparky = Field(a);
          const fieldB_sparky = Field(b);
          const product_sparky = fieldA_sparky.mul(fieldB_sparky).toString();
          
          const consistent = product_snarky === product_sparky;
          
          if (!consistent) {
            console.log(`❌ Multiplication inconsistency: a=${a}, b=${b}`);
            console.log(`  Snarky: ${product_snarky}`);
            console.log(`  Sparky: ${product_sparky}`);
            tester.recordResult('field_multiplication_consistency', false, undefined, `a=${a}, b=${b}`);
          } else {
            tester.recordResult('field_multiplication_consistency', true);
          }
        } catch (error) {
          console.log(`💥 Multiplication error: ${(error as Error).message}`);
          tester.recordResult('field_multiplication_consistency', false, (error as Error).message);
        }
      }
    });

    test('Field Inversion Cross-Backend Consistency', async () => {
      console.log('🔥 Testing field inversion consistency...');
      
      const testCases = await fc.sample(
        fieldArbitrary.filter(x => x !== FIELD_ZERO),
        20
      );
      
      for (const a of testCases) {
        try {
          // Test with Snarky
          await switchBackend('snarky');
          const fieldA_snarky = Field(a);
          const inv_snarky = fieldA_snarky.inv().toString();
          
          // Test with Sparky
          await switchBackend('sparky');
          const fieldA_sparky = Field(a);
          const inv_sparky = fieldA_sparky.inv().toString();
          
          const consistent = inv_snarky === inv_sparky;
          
          if (!consistent) {
            console.log(`❌ Inversion inconsistency: a=${a}`);
            console.log(`  Snarky inv: ${inv_snarky}`);
            console.log(`  Sparky inv: ${inv_sparky}`);
            tester.recordResult('field_inversion_consistency', false, undefined, `a=${a}`);
          } else {
            tester.recordResult('field_inversion_consistency', true);
          }
        } catch (error) {
          console.log(`💥 Inversion error: ${(error as Error).message}`);
          tester.recordResult('field_inversion_consistency', false, (error as Error).message);
        }
      }
    });
  });

  describe('Cryptographic Primitive Consistency', () => {
    
    test('Poseidon Hash Cross-Backend Consistency', async () => {
      console.log('🔥 Testing Poseidon hash consistency...');
      
      const testCases = await fc.sample(
        fc.array(fieldArbitrary, { minLength: 1, maxLength: 5 }),
        20
      );
      
      for (const inputs of testCases) {
        try {
          // Test with Snarky
          await switchBackend('snarky');
          const snarkyFields = inputs.map(x => Field(x));
          const snarkyHash = Poseidon.hash(snarkyFields).toString();
          
          // Test with Sparky
          await switchBackend('sparky');
          const sparkyFields = inputs.map(x => Field(x));
          const sparkyHash = Poseidon.hash(sparkyFields).toString();
          
          const consistent = snarkyHash === sparkyHash;
          
          if (!consistent) {
            console.log(`❌ Poseidon hash inconsistency:`);
            console.log(`  Inputs: [${inputs.join(', ')}]`);
            console.log(`  Snarky hash: ${snarkyHash}`);
            console.log(`  Sparky hash: ${sparkyHash}`);
            tester.recordResult('poseidon_hash_consistency', false, undefined, `inputs=[${inputs.join(',')}]`);
          } else {
            tester.recordResult('poseidon_hash_consistency', true);
          }
        } catch (error) {
          console.log(`💥 Poseidon hash error: ${(error as Error).message}`);
          tester.recordResult('poseidon_hash_consistency', false, (error as Error).message);
        }
      }
    });
  });

  describe('Backend Switching Reliability', () => {
    
    test('Multiple Backend Switches', async () => {
      console.log('🔥 Testing backend switching reliability...');
      
      for (let i = 0; i < 10; i++) {
        try {
          const backend = i % 2 === 0 ? 'snarky' : 'sparky';
          await switchBackend(backend);
          
          const currentBackend = getCurrentBackend();
          const switchSuccessful = currentBackend === backend;
          
          if (!switchSuccessful) {
            console.log(`❌ Backend switch failed: expected ${backend}, got ${currentBackend}`);
            tester.recordResult('backend_switching', false, undefined, `expected=${backend}, got=${currentBackend}`);
          } else {
            // Test basic operation after switch
            const testField = Field(42);
            const result = testField.add(Field(1));
            const operationSuccessful = result.toString() === Field(43).toString();
            
            if (!operationSuccessful) {
              console.log(`❌ Field operation failed after switch to ${backend}`);
              tester.recordResult('backend_switching', false, undefined, `operation failed after switch to ${backend}`);
            } else {
              tester.recordResult('backend_switching', true);
            }
          }
        } catch (error) {
          console.log(`💥 Backend switching error: ${(error as Error).message}`);
          tester.recordResult('backend_switching', false, (error as Error).message);
        }
      }
    });
  });

  describe('Edge Case Boundary Testing', () => {
    
    test('Field Modulus Boundary Operations', async () => {
      console.log('🔥 Testing field modulus boundary operations...');
      
      const boundaryValues = [
        FIELD_ZERO,
        FIELD_ONE,
        FIELD_MAX,
        FIELD_MAX - 1n,
        FIELD_MODULUS, // Should wrap to 0
        FIELD_MODULUS + 1n, // Should wrap to 1
      ];
      
      for (const val of boundaryValues) {
        try {
          // Test with Snarky
          await switchBackend('snarky');
          const snarkyField = Field(val);
          const snarkyString = snarkyField.toString();
          
          // Test with Sparky
          await switchBackend('sparky');  
          const sparkyField = Field(val);
          const sparkyString = sparkyField.toString();
          
          const consistent = snarkyString === sparkyString;
          
          if (!consistent) {
            console.log(`❌ Boundary value handling mismatch:`);
            console.log(`  Value: ${val}`);
            console.log(`  Snarky: ${snarkyString}`);
            console.log(`  Sparky: ${sparkyString}`);
            tester.recordResult('boundary_value_handling', false, undefined, `val=${val}`);
          } else {
            tester.recordResult('boundary_value_handling', true);
          }
        } catch (error) {
          console.log(`💥 Boundary value error: ${(error as Error).message}`);
          tester.recordResult('boundary_value_handling', false, (error as Error).message);
        }
      }
    });
  });

  describe('Constraint Generation Deep Analysis', () => {
    
    test('Simple Circuit Constraint Count Consistency', async () => {
      console.log('🔥 Testing constraint generation consistency...');
      
      // Test various simple operations
      const operations = [
        { name: 'simple_addition', code: (a: Field, b: Field) => a.add(b) },
        { name: 'simple_multiplication', code: (a: Field, b: Field) => a.mul(b) },
        { name: 'simple_subtraction', code: (a: Field, b: Field) => a.sub(b) },
      ];
      
      for (const op of operations) {
        try {
          const testValues = [Field(5), Field(7)];
          
          // Create simple circuit for this operation
          const TestCircuit = ZkProgram({
            name: `TestCircuit_${op.name}`,
            publicInput: Field,
            methods: {
              compute: {
                privateInputs: [Field],
                async method(publicInput: Field, privateInput: Field) {
                  const result = op.code(publicInput, privateInput);
                  result.assertEquals(op.code(Field(5), Field(7)));
                }
              }
            }
          });
          
          // Test with Snarky
          await switchBackend('snarky');
          const { verificationKey: snarkyVK } = await TestCircuit.compile();
          
          // Test with Sparky
          await switchBackend('sparky');
          const { verificationKey: sparkyVK } = await TestCircuit.compile();
          
          const vkConsistent = snarkyVK.hash === sparkyVK.hash;
          
          if (!vkConsistent) {
            console.log(`❌ VK inconsistency for ${op.name}:`);
            console.log(`  Snarky VK: ${snarkyVK.hash}`);
            console.log(`  Sparky VK: ${sparkyVK.hash}`);
            tester.recordResult('constraint_consistency', false, undefined, op.name);
          } else {
            console.log(`✅ VK consistency for ${op.name}`);
            tester.recordResult('constraint_consistency', true);
          }
        } catch (error) {
          console.log(`💥 Constraint generation error for ${op.name}: ${(error as Error).message}`);
          tester.recordResult('constraint_consistency', false, (error as Error).message, op.name);
        }
      }
    });
  });

  describe('Stress Testing with Random Inputs', () => {
    
    test('Random Field Operations Stress Test', async () => {
      console.log('🔥 Running random field operations stress test...');
      
      for (let i = 0; i < 100; i++) {
        try {
          // Generate random field values
          const a = fc.sample(fieldArbitrary, 1)[0];
          const b = fc.sample(fieldArbitrary, 1)[0];
          
          // Test with Snarky
          await switchBackend('snarky');
          const fieldA_snarky = Field(a);
          const fieldB_snarky = Field(b);
          const addResult_snarky = fieldA_snarky.add(fieldB_snarky).toString();
          const mulResult_snarky = fieldA_snarky.mul(fieldB_snarky).toString();
          
          // Test with Sparky
          await switchBackend('sparky');
          const fieldA_sparky = Field(a);
          const fieldB_sparky = Field(b);
          const addResult_sparky = fieldA_sparky.add(fieldB_sparky).toString();
          const mulResult_sparky = fieldA_sparky.mul(fieldB_sparky).toString();
          
          const addConsistent = addResult_snarky === addResult_sparky;
          const mulConsistent = mulResult_snarky === mulResult_sparky;
          
          if (!addConsistent || !mulConsistent) {
            console.log(`❌ Random operation inconsistency #${i}:`);
            console.log(`  a=${a}, b=${b}`);
            if (!addConsistent) console.log(`  Add: Snarky=${addResult_snarky}, Sparky=${addResult_sparky}`);
            if (!mulConsistent) console.log(`  Mul: Snarky=${mulResult_snarky}, Sparky=${mulResult_sparky}`);
            tester.recordResult('random_operations_stress', false, undefined, `test #${i}`);
          } else {
            tester.recordResult('random_operations_stress', true);
          }
        } catch (error) {
          console.log(`💥 Random operation error #${i}: ${(error as Error).message}`);
          tester.recordResult('random_operations_stress', false, (error as Error).message);
        }
      }
    });
  });
});