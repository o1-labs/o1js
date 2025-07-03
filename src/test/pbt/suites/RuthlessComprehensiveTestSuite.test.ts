/**
 * RUTHLESS COMPREHENSIVE TEST SUITE
 * 
 * Integrates all ruthless backend parity tests into a systematic, easy-to-run
 * test suite. This is the main entry point for running comprehensive PBT
 * testing of Snarky vs Sparky backend compatibility.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import fc from 'fast-check';
import { switchBackend, getCurrentBackend } from '../../../../dist/node/index.js';
import { ruthlessBackendParityProperties, RuthlessBackendParityProperties } from '../properties/RuthlessBackendParityProperties.js';

/**
 * Test execution result tracker
 */
interface TestExecutionResult {
  propertyName: string;
  category: string;
  numRuns: number;
  passed: boolean;
  duration: number;
  error?: string;
  successRate?: number;
}

/**
 * Comprehensive test suite results
 */
class RuthlessTestSuiteResults {
  private results: TestExecutionResult[] = [];
  
  recordResult(result: TestExecutionResult): void {
    this.results.push(result);
  }
  
  generateReport(): void {
    const categories = [...new Set(this.results.map(r => r.category))];
    
    console.log('\n🔥 RUTHLESS COMPREHENSIVE TEST SUITE RESULTS');
    console.log('=============================================');
    
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.passed).length;
      const total = categoryResults.length;
      const percentage = ((passed / total) * 100).toFixed(1);
      
      console.log(`\n📊 ${category}: ${percentage}% (${passed}/${total})`);
      
      categoryResults.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        const duration = result.duration.toFixed(0);
        console.log(`   ${status} ${result.propertyName} (${duration}ms, ${result.numRuns} runs)`);
        if (!result.passed && result.error) {
          console.log(`      Error: ${result.error.substring(0, 100)}...`);
        }
      });
    });
    
    const totalPassed = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    const overallPercentage = ((totalPassed / totalTests) * 100).toFixed(1);
    
    console.log(`\n🎯 OVERALL RUTHLESS TEST SUITE SUCCESS RATE: ${overallPercentage}%`);
    console.log(`📊 Total Properties Tested: ${totalTests}`);
    console.log(`✅ Passing Properties: ${totalPassed}`);
    console.log(`❌ Failing Properties: ${totalTests - totalPassed}`);
    
    // Provide assessment
    if (parseFloat(overallPercentage) >= 90) {
      console.log('\n🎉 EXCELLENT: Sparky shows high compatibility with Snarky');
    } else if (parseFloat(overallPercentage) >= 70) {
      console.log('\n👍 GOOD: Sparky shows strong compatibility with some issues to address');
    } else if (parseFloat(overallPercentage) >= 50) {
      console.log('\n⚠️  MIXED: Sparky has partial compatibility with significant work needed');
    } else {
      console.log('\n🚨 POOR: Sparky has major compatibility issues requiring immediate attention');
    }
  }
}

const suiteResults = new RuthlessTestSuiteResults();

/**
 * Execute a property-based test with proper error handling and reporting
 */
async function executeProperty(
  propertyName: string,
  category: string,
  property: fc.IAsyncProperty<any>,
  config: { numRuns: number; timeout: number }
): Promise<void> {
  const startTime = performance.now();
  let passed = false;
  let error: string | undefined;
  
  try {
    await fc.assert(property, {
      numRuns: config.numRuns,
      timeout: config.timeout,
      verbose: false
    });
    passed = true;
  } catch (e) {
    error = (e as Error).message;
    passed = false;
  }
  
  const duration = performance.now() - startTime;
  
  suiteResults.recordResult({
    propertyName,
    category,
    numRuns: config.numRuns,
    passed,
    duration,
    error
  });
  
  if (!passed) {
    console.log(`❌ ${propertyName} failed: ${error?.substring(0, 150)}...`);
  } else {
    console.log(`✅ ${propertyName} passed (${config.numRuns} runs, ${duration.toFixed(0)}ms)`);
  }
}

describe('🔥 Ruthless Comprehensive Backend Parity Test Suite', () => {
  
  beforeAll(async () => {
    console.log('🔥 Starting Ruthless Comprehensive Test Suite...');
    console.log('This suite runs property-based tests to find every possible backend difference.');
    
    // Ensure we start with Snarky backend
    await switchBackend('snarky');
    const currentBackend = getCurrentBackend();
    console.log(`🔄 Starting backend: ${currentBackend}`);
  });

  afterAll(() => {
    suiteResults.generateReport();
  });

  describe('💚 Core Field Operations (Expected to Pass)', () => {
    
    test('Field Addition Properties', async () => {
      const properties = ruthlessBackendParityProperties.getBasicOperationProperties()
        .filter(p => p.name.includes('addition'));
      
      for (const { name, property, config } of properties) {
        await executeProperty(name, 'Core Field Operations', property, config);
      }
    });
    
    test('Field Multiplication Properties', async () => {
      const properties = ruthlessBackendParityProperties.getBasicOperationProperties()
        .filter(p => p.name.includes('multiplication'));
      
      for (const { name, property, config } of properties) {
        await executeProperty(name, 'Core Field Operations', property, config);
      }
    });
    
    test('Poseidon Hash Properties', async () => {
      const properties = ruthlessBackendParityProperties.getBasicOperationProperties()
        .filter(p => p.name.includes('poseidon'));
      
      for (const { name, property, config } of properties) {
        await executeProperty(name, 'Core Field Operations', property, config);
      }
    });
  });

  describe('⚡ Advanced Operations (Mixed Results Expected)', () => {
    
    test('Field Inversion Properties', async () => {
      const properties = ruthlessBackendParityProperties.getAllProperties()
        .filter(p => p.name.includes('inversion'));
      
      for (const { name, property, config } of properties) {
        await executeProperty(name, 'Advanced Operations', property, config);
      }
    });
    
    test('Complex Expression Properties', async () => {
      const properties = ruthlessBackendParityProperties.getAllProperties()
        .filter(p => p.name.includes('complex_expression'));
      
      for (const { name, property, config } of properties) {
        await executeProperty(name, 'Advanced Operations', property, config);
      }
    });
    
    test('Backend Switching Properties', async () => {
      const properties = ruthlessBackendParityProperties.getAllProperties()
        .filter(p => p.name.includes('switching'));
      
      for (const { name, property, config } of properties) {
        await executeProperty(name, 'Advanced Operations', property, config);
      }
    });
  });

  describe('🚨 VK Parity Testing (Known Issue Area)', () => {
    
    test('Simple Circuit VK Parity', async () => {
      const properties = ruthlessBackendParityProperties.getVKParityProperties();
      
      for (const { name, property, config } of properties) {
        await executeProperty(name, 'VK Parity', property, config);
      }
    });
    
    test('Additional VK Tests', async () => {
      const properties = ruthlessBackendParityProperties.getAllProperties()
        .filter(p => p.name.includes('vk') || p.name.includes('circuit'));
      
      for (const { name, property, config } of properties) {
        await executeProperty(name, 'VK Parity', property, config);
      }
    });
  });

  describe('🛡️ Error Handling & Edge Cases', () => {
    
    test('Error Consistency Properties', async () => {
      const properties = ruthlessBackendParityProperties.getAllProperties()
        .filter(p => p.name.includes('division_by_zero') || p.name.includes('error'));
      
      for (const { name, property, config } of properties) {
        await executeProperty(name, 'Error Handling', property, config);
      }
    });
    
    test('Performance Properties', async () => {
      const properties = ruthlessBackendParityProperties.getAllProperties()
        .filter(p => p.name.includes('performance'));
      
      for (const { name, property, config } of properties) {
        await executeProperty(name, 'Performance', property, config);
      }
    });
  });

  describe('🎯 Comprehensive Coverage', () => {
    
    test('All Remaining Properties', async () => {
      // Get any properties not covered in specific tests above
      const allProperties = ruthlessBackendParityProperties.getAllProperties();
      const coveredNames = new Set([
        'ruthless_field_addition_parity',
        'ruthless_field_multiplication_parity', 
        'ruthless_poseidon_hash_parity',
        'ruthless_field_inversion_parity',
        'ruthless_complex_expression_parity',
        'ruthless_backend_switching_consistency',
        'ruthless_simple_circuit_vk_parity',
        'ruthless_division_by_zero_consistency',
        'ruthless_performance_within_bounds'
      ]);
      
      const remainingProperties = allProperties.filter(p => !coveredNames.has(p.name));
      
      for (const { name, property, config } of remainingProperties) {
        await executeProperty(name, 'Comprehensive Coverage', property, config);
      }
    });
  });

  describe('🚀 Quick Smoke Tests', () => {
    
    test('Essential Operations Smoke Test', async () => {
      console.log('🚀 Running essential operations smoke test...');
      
      // Quick verification that basic operations work
      const testRunner = new RuthlessBackendParityProperties();
      
      try {
        // Test field addition with small number of runs
        await fc.assert(testRunner.fieldAdditionParity(), { numRuns: 10, timeout: 30000 });
        console.log('✅ Field addition smoke test passed');
        
        // Test field multiplication with small number of runs  
        await fc.assert(testRunner.fieldMultiplicationParity(), { numRuns: 10, timeout: 30000 });
        console.log('✅ Field multiplication smoke test passed');
        
        // Test Poseidon hash with small number of runs
        await fc.assert(testRunner.poseidonHashParity(), { numRuns: 5, timeout: 30000 });
        console.log('✅ Poseidon hash smoke test passed');
        
        suiteResults.recordResult({
          propertyName: 'smoke_test_essential_operations',
          category: 'Smoke Tests',
          numRuns: 25,
          passed: true,
          duration: 0
        });
        
      } catch (error) {
        console.log(`❌ Smoke test failed: ${(error as Error).message}`);
        suiteResults.recordResult({
          propertyName: 'smoke_test_essential_operations',
          category: 'Smoke Tests', 
          numRuns: 25,
          passed: false,
          duration: 0,
          error: (error as Error).message
        });
      }
    });
  });
});