/**
 * ESSENTIAL PARITY RESULTS
 * 
 * Run the most critical tests to determine actual backend parity status.
 * This provides a clear, honest assessment of where Sparky stands vs Snarky.
 */

import { describe, test, expect } from '@jest/globals';
import { Field, Poseidon, ZkProgram, switchBackend, getCurrentBackend } from '../../dist/node/index.js';

interface ParityResult {
  area: string;
  testName: string;
  success: boolean;
  snarkyResult?: string;
  sparkyResult?: string;
  error?: string;
}

class ParityReporter {
  private results: ParityResult[] = [];
  
  record(area: string, testName: string, success: boolean, snarkyResult?: string, sparkyResult?: string, error?: string): void {
    this.results.push({ area, testName, success, snarkyResult, sparkyResult, error });
  }
  
  generateReport(): void {
    const areas = [...new Set(this.results.map(r => r.area))];
    
    console.log('\n🎯 ESSENTIAL BACKEND PARITY ASSESSMENT');
    console.log('======================================');
    
    areas.forEach(area => {
      const areaResults = this.results.filter(r => r.area === area);
      const successes = areaResults.filter(r => r.success).length;
      const total = areaResults.length;
      const percentage = ((successes / total) * 100).toFixed(1);
      
      console.log(`\n📊 ${area}: ${percentage}% (${successes}/${total})`);
      
      areaResults.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${status} ${result.testName}`);
        if (!result.success && result.snarkyResult && result.sparkyResult) {
          console.log(`      Snarky: ${result.snarkyResult}`);
          console.log(`      Sparky: ${result.sparkyResult}`);
        }
        if (result.error) {
          console.log(`      Error: ${result.error}`);
        }
      });
    });
    
    const totalSuccesses = this.results.filter(r => r.success).length;
    const totalTests = this.results.length;
    const overallPercentage = ((totalSuccesses / totalTests) * 100).toFixed(1);
    
    console.log(`\n🎯 OVERALL BACKEND PARITY: ${overallPercentage}%`);
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Successes: ${totalSuccesses}`);
    console.log(`❌ Failures: ${totalTests - totalSuccesses}`);
    
    // Provide honest assessment
    if (parseFloat(overallPercentage) >= 90) {
      console.log('\n🎉 EXCELLENT: Sparky achieves high parity with Snarky');
    } else if (parseFloat(overallPercentage) >= 70) {
      console.log('\n👍 GOOD: Sparky shows strong compatibility with some issues');
    } else if (parseFloat(overallPercentage) >= 50) {
      console.log('\n⚠️  MIXED: Sparky has partial compatibility with significant gaps');
    } else {
      console.log('\n🚨 POOR: Sparky has major compatibility issues with Snarky');
    }
  }
}

const reporter = new ParityReporter();

describe('🎯 Essential Backend Parity Assessment', () => {
  
  test('Core Field Operations Parity', async () => {
    // Test basic field arithmetic
    const testCases = [
      { a: 0n, b: 0n },
      { a: 1n, b: 1n },
      { a: 42n, b: 17n },
    ];
    
    for (const { a, b } of testCases) {
      // Addition
      await switchBackend('snarky');
      const snarkyAdd = Field(a).add(Field(b)).toString();
      
      await switchBackend('sparky');
      const sparkyAdd = Field(a).add(Field(b)).toString();
      
      reporter.record('Field Operations', `Addition(${a},${b})`, snarkyAdd === sparkyAdd, snarkyAdd, sparkyAdd);
      
      // Multiplication
      await switchBackend('snarky');
      const snarkyMul = Field(a).mul(Field(b)).toString();
      
      await switchBackend('sparky');
      const sparkyMul = Field(a).mul(Field(b)).toString();
      
      reporter.record('Field Operations', `Multiplication(${a},${b})`, snarkyMul === sparkyMul, snarkyMul, sparkyMul);
    }
  });
  
  test('Poseidon Hash Parity', async () => {
    const inputs = [Field(1), Field(2), Field(3)];
    
    await switchBackend('snarky');
    const snarkyHash = Poseidon.hash(inputs).toString();
    
    await switchBackend('sparky');
    const sparkyHash = Poseidon.hash(inputs).toString();
    
    reporter.record('Cryptographic', 'Poseidon Hash', snarkyHash === sparkyHash, snarkyHash, sparkyHash);
  });
  
  test('Backend Switching Reliability', async () => {
    let allSwitchesSuccessful = true;
    
    for (let i = 0; i < 3; i++) {
      const target = i % 2 === 0 ? 'snarky' : 'sparky';
      await switchBackend(target);
      
      if (getCurrentBackend() !== target) {
        allSwitchesSuccessful = false;
        break;
      }
      
      // Test basic operation after switch
      try {
        const result = Field(42).add(Field(1));
        if (result.toString() !== Field(43).toString()) {
          allSwitchesSuccessful = false;
          break;
        }
      } catch (error) {
        allSwitchesSuccessful = false;
        break;
      }
    }
    
    reporter.record('Infrastructure', 'Backend Switching', allSwitchesSuccessful);
  });
  
  test('Simple Circuit VK Parity', async () => {
    try {
      const SimpleCircuit = ZkProgram({
        name: 'SimpleTest',
        publicInput: Field,
        methods: {
          add: {
            privateInputs: [Field],
            async method(a: Field, b: Field) {
              const sum = a.add(b);
              sum.assertEquals(Field(5).add(Field(7)));
            }
          }
        }
      });
      
      await switchBackend('snarky');
      const { verificationKey: snarkyVK } = await SimpleCircuit.compile();
      
      await switchBackend('sparky');
      const { verificationKey: sparkyVK } = await SimpleCircuit.compile();
      
      const vkMatch = snarkyVK.hash.toString() === sparkyVK.hash.toString();
      reporter.record('Circuit Generation', 'Simple Addition VK', vkMatch, snarkyVK.hash.toString(), sparkyVK.hash.toString());
      
    } catch (error) {
      reporter.record('Circuit Generation', 'Simple Addition VK', false, undefined, undefined, (error as Error).message);
    }
  });
  
  afterAll(() => {
    reporter.generateReport();
  });
});