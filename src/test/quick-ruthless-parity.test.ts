/**
 * QUICK RUTHLESS BACKEND PARITY TESTING
 * 
 * Focused, fast tests to identify critical parity issues between
 * Snarky and Sparky backends. Ruthless but efficient.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { Field, Bool, Poseidon, ZkProgram } from '../../dist/node/index.js';
import { switchBackend, getCurrentBackend } from '../../dist/node/index.js';

interface TestResult {
  test: string;
  success: boolean;
  details?: string;
  error?: string;
}

class QuickTester {
  private results: TestResult[] = [];
  
  record(test: string, success: boolean, details?: string, error?: string): void {
    this.results.push({ test, success, details, error });
    const status = success ? '✅' : '❌';
    console.log(`${status} ${test}${details ? ` - ${details}` : ''}${error ? ` (ERROR: ${error})` : ''}`);
  }
  
  report(): void {
    const total = this.results.length;
    const successes = this.results.filter(r => r.success).length;
    const failures = this.results.filter(r => !r.success && !r.error).length;
    const errors = this.results.filter(r => r.error).length;
    
    console.log('\n🔥 QUICK RUTHLESS BACKEND PARITY REPORT');
    console.log('========================================');
    console.log(`📊 Total Tests: ${total}`);
    console.log(`✅ Successes: ${successes} (${((successes/total)*100).toFixed(1)}%)`);
    console.log(`❌ Failures: ${failures} (${((failures/total)*100).toFixed(1)}%)`);
    console.log(`💥 Errors: ${errors} (${((errors/total)*100).toFixed(1)}%)`);
    console.log(`📈 Overall Success Rate: ${((successes/total)*100).toFixed(1)}%`);
    
    if (failures > 0 || errors > 0) {
      console.log('\n🚨 FAILED TESTS:');
      this.results.filter(r => !r.success).forEach(r => {
        console.log(`   ${r.test}${r.details ? ` - ${r.details}` : ''}${r.error ? ` (${r.error})` : ''}`);
      });
    }
  }
}

const tester = new QuickTester();

describe('🔥 Quick Ruthless Backend Parity', () => {
  
  beforeAll(async () => {
    console.log('🔥 Starting quick ruthless parity testing...');
    await switchBackend('snarky');
  });

  afterAll(() => {
    tester.report();
  });

  describe('Core Field Operations', () => {
    
    test('Field Addition Parity', async () => {
      console.log('🔥 Testing field addition parity...');
      
      const testCases = [
        [0n, 0n],
        [1n, 1n],
        [42n, 17n],
        [28948022309329048855892746252171976963363056481941560715954676764349967630336n, 1n], // FIELD_MAX
      ];
      
      for (const [a, b] of testCases) {
        try {
          await switchBackend('snarky');
          const snarkyResult = Field(a).add(Field(b)).toString();
          
          await switchBackend('sparky');
          const sparkyResult = Field(a).add(Field(b)).toString();
          
          const match = snarkyResult === sparkyResult;
          tester.record(
            'field_addition',
            match,
            match ? undefined : `a=${a}, b=${b}, snarky=${snarkyResult}, sparky=${sparkyResult}`
          );
        } catch (error) {
          tester.record('field_addition', false, `a=${a}, b=${b}`, (error as Error).message);
        }
      }
    });

    test('Field Multiplication Parity', async () => {
      console.log('🔥 Testing field multiplication parity...');
      
      const testCases = [
        [0n, 42n],
        [1n, 42n], 
        [2n, 3n],
        [17n, 42n],
      ];
      
      for (const [a, b] of testCases) {
        try {
          await switchBackend('snarky');
          const snarkyResult = Field(a).mul(Field(b)).toString();
          
          await switchBackend('sparky');
          const sparkyResult = Field(a).mul(Field(b)).toString();
          
          const match = snarkyResult === sparkyResult;
          tester.record(
            'field_multiplication', 
            match,
            match ? undefined : `a=${a}, b=${b}, snarky=${snarkyResult}, sparky=${sparkyResult}`
          );
        } catch (error) {
          tester.record('field_multiplication', false, `a=${a}, b=${b}`, (error as Error).message);
        }
      }
    });

    test('Field Inversion Parity', async () => {
      console.log('🔥 Testing field inversion parity...');
      
      const testCases = [1n, 2n, 42n, 17n];
      
      for (const a of testCases) {
        try {
          await switchBackend('snarky');
          const snarkyInv = Field(a).inv().toString();
          
          await switchBackend('sparky');
          const sparkyInv = Field(a).inv().toString();
          
          const match = snarkyInv === sparkyInv;
          tester.record(
            'field_inversion',
            match,
            match ? undefined : `a=${a}, snarky_inv=${snarkyInv}, sparky_inv=${sparkyInv}`
          );
        } catch (error) {
          tester.record('field_inversion', false, `a=${a}`, (error as Error).message);
        }
      }
    });
  });

  describe('Cryptographic Functions', () => {
    
    test('Poseidon Hash Parity', async () => {
      console.log('🔥 Testing Poseidon hash parity...');
      
      const testCases = [
        [Field(0)],
        [Field(1)], 
        [Field(42)],
        [Field(1), Field(2)],
        [Field(17), Field(42), Field(123)],
      ];
      
      for (const inputs of testCases) {
        try {
          await switchBackend('snarky');
          const snarkyHash = Poseidon.hash(inputs).toString();
          
          await switchBackend('sparky');
          const sparkyHash = Poseidon.hash(inputs).toString();
          
          const match = snarkyHash === sparkyHash;
          tester.record(
            'poseidon_hash',
            match,
            match ? undefined : `inputs=[${inputs.map(f => f.toString()).join(',')}], snarky=${snarkyHash}, sparky=${sparkyHash}`
          );
        } catch (error) {
          tester.record('poseidon_hash', false, `inputs=[${inputs.map(f => f.toString()).join(',')}]`, (error as Error).message);
        }
      }
    });
  });

  describe('Backend Infrastructure', () => {
    
    test('Backend Switching Reliability', async () => {
      console.log('🔥 Testing backend switching reliability...');
      
      for (let i = 0; i < 5; i++) {
        try {
          const targetBackend = i % 2 === 0 ? 'snarky' : 'sparky';
          await switchBackend(targetBackend);
          
          const currentBackend = getCurrentBackend();
          const switchSuccessful = currentBackend === targetBackend;
          
          if (switchSuccessful) {
            // Test basic operation
            const result = Field(42).add(Field(1));
            const operationWorked = result.toString() === Field(43).toString();
            
            tester.record(
              'backend_switching',
              operationWorked,
              operationWorked ? `switch to ${targetBackend}` : `operation failed after switch to ${targetBackend}`
            );
          } else {
            tester.record(
              'backend_switching',
              false, 
              `expected ${targetBackend}, got ${currentBackend}`
            );
          }
        } catch (error) {
          tester.record('backend_switching', false, `iteration ${i}`, (error as Error).message);
        }
      }
    });
  });

  describe('Constraint Generation', () => {
    
    test('Simple Circuit VK Consistency', async () => {
      console.log('🔥 Testing simple circuit VK consistency...');
      
      const operations = [
        { name: 'addition', fn: (a: Field, b: Field) => a.add(b) },
        { name: 'multiplication', fn: (a: Field, b: Field) => a.mul(b) },
      ];
      
      for (const op of operations) {
        try {
          const TestProgram = ZkProgram({
            name: `Test_${op.name}`,
            publicInput: Field,
            methods: {
              compute: {
                privateInputs: [Field],
                async method(publicInput: Field, privateInput: Field) {
                  const result = op.fn(publicInput, privateInput);
                  result.assertEquals(op.fn(Field(5), Field(7)));
                }
              }
            }
          });
          
          await switchBackend('snarky');
          const { verificationKey: snarkyVK } = await TestProgram.compile();
          
          await switchBackend('sparky');  
          const { verificationKey: sparkyVK } = await TestProgram.compile();
          
          const vkMatch = snarkyVK.hash === sparkyVK.hash;
          tester.record(
            'vk_consistency',
            vkMatch,
            vkMatch ? `${op.name} circuit` : `${op.name}: snarky=${snarkyVK.hash}, sparky=${sparkyVK.hash}`
          );
        } catch (error) {
          tester.record('vk_consistency', false, op.name, (error as Error).message);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    
    test('Boundary Value Handling', async () => {
      console.log('🔥 Testing boundary value handling...');
      
      const FIELD_MODULUS = 28948022309329048855892746252171976963363056481941560715954676764349967630337n;
      const boundaryValues = [
        0n,
        1n,
        FIELD_MODULUS - 1n,
        FIELD_MODULUS, // Should wrap to 0
        FIELD_MODULUS + 1n, // Should wrap to 1
      ];
      
      for (const val of boundaryValues) {
        try {
          await switchBackend('snarky');
          const snarkyField = Field(val).toString();
          
          await switchBackend('sparky');
          const sparkyField = Field(val).toString();
          
          const match = snarkyField === sparkyField;
          tester.record(
            'boundary_values',
            match,
            match ? `val=${val}` : `val=${val}, snarky=${snarkyField}, sparky=${sparkyField}`
          );
        } catch (error) {
          tester.record('boundary_values', false, `val=${val}`, (error as Error).message);
        }
      }
    });
  });
});