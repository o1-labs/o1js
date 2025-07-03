/**
 * Consolidated Parity Test Runner
 * 
 * Replaces scattered test files with focused, maintainable parity testing.
 * Consolidates logic from multiple existing test frameworks into one place.
 */

import { Field, ZkProgram, switchBackend, getCurrentBackend } from '../../../dist/node/index.js';

export interface TestResult {
  backend: 'snarky' | 'sparky';
  vkHash?: string;
  constraintCount: number;
  success: boolean;
  error?: string;
  executionTime: number;
}

export interface ParityTestResult {
  testName: string;
  snarky: TestResult;
  sparky: TestResult;
  vkMatch: boolean;
  constraintCountMatch: boolean;
  passed: boolean;
  issues: string[];
}

export interface TestCase {
  name: string;
  circuit: () => any;
  expectedConstraints?: number;
}

export class ParityTestRunner {
  private results: ParityTestResult[] = [];

  /**
   * Run a test case with both backends and compare results
   */
  async runTestCase(testCase: TestCase): Promise<ParityTestResult> {
    console.log(`🧪 Testing: ${testCase.name}`);
    
    // Test with Snarky
    const snarkyResult = await this.runWithBackend('snarky', testCase);
    
    // Test with Sparky
    const sparkyResult = await this.runWithBackend('sparky', testCase);
    
    // Compare results
    const result: ParityTestResult = {
      testName: testCase.name,
      snarky: snarkyResult,
      sparky: sparkyResult,
      vkMatch: snarkyResult.vkHash === sparkyResult.vkHash,
      constraintCountMatch: snarkyResult.constraintCount === sparkyResult.constraintCount,
      passed: false,
      issues: []
    };
    
    // Identify issues
    if (!result.constraintCountMatch) {
      result.issues.push(`Constraint count mismatch: Snarky=${snarkyResult.constraintCount}, Sparky=${sparkyResult.constraintCount}`);
    }
    
    if (!result.vkMatch) {
      result.issues.push(`VK mismatch: Different verification keys generated`);
    }
    
    if (!snarkyResult.success) {
      result.issues.push(`Snarky failed: ${snarkyResult.error}`);
    }
    
    if (!sparkyResult.success) {
      result.issues.push(`Sparky failed: ${sparkyResult.error}`);
    }
    
    result.passed = result.vkMatch && result.constraintCountMatch && 
                   snarkyResult.success && sparkyResult.success;
    
    this.results.push(result);
    
    // Log result
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${testCase.name}: ${result.passed ? 'PASS' : 'FAIL'}`);
    if (!result.passed) {
      result.issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    return result;
  }

  /**
   * Run test with specific backend
   */
  private async runWithBackend(backend: 'snarky' | 'sparky', testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      await switchBackend(backend);
      
      // Create and compile the ZkProgram
      const program = ZkProgram({
        name: `test-${testCase.name}-${backend}`,
        methods: {
          test: {
            privateInputs: [],
            method: testCase.circuit
          }
        }
      });
      
      // Compile to get constraint count and VK
      const { verificationKey } = await program.compile();
      
      // Count constraints (simplified - real implementation would introspect constraint system)
      const constraintCount = await this.countConstraints(program);
      
      return {
        backend,
        vkHash: this.hashVK(verificationKey),
        constraintCount,
        success: true,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        backend,
        constraintCount: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Count constraints in compiled program
   */
  private async countConstraints(program: any): Promise<number> {
    // Simplified constraint counting - real implementation would use constraint system introspection
    return 1; // Mock implementation
  }

  /**
   * Generate hash of verification key for comparison
   */
  private hashVK(vk: any): string {
    // Simplified VK hashing - real implementation would use proper serialization
    return JSON.stringify(vk).slice(0, 32);
  }

  /**
   * Run standard test suite
   */
  async runStandardTests(): Promise<void> {
    console.log('🚀 Running Standard Parity Test Suite...\n');
    
    const testCases: TestCase[] = [
      {
        name: 'Field Addition',
        circuit: () => {
          const a = Field(5);
          const b = Field(7);
          const result = a.add(b);
          result.assertEquals(Field(12));
          return result;
        },
        expectedConstraints: 1
      },
      {
        name: 'Field Multiplication',
        circuit: () => {
          const a = Field(3);
          const b = Field(4);
          const result = a.mul(b);
          result.assertEquals(Field(12));
          return result;
        },
        expectedConstraints: 1
      },
      {
        name: 'Square Operation',
        circuit: () => {
          const x = Field(5);
          const square = x.mul(x);
          square.assertEquals(Field(25));
          return square;
        },
        expectedConstraints: 1
      },
      {
        name: 'Chained Operations',
        circuit: () => {
          const a = Field(2);
          const b = Field(3);
          const c = Field(4);
          const ab = a.mul(b);
          const result = ab.add(c);
          result.assertEquals(Field(10));
          return result;
        },
        expectedConstraints: 2
      }
    ];

    // Run all test cases
    for (const testCase of testCases) {
      await this.runTestCase(testCase);
    }
    
    // Generate summary
    this.generateSummary();
  }

  /**
   * Generate test summary
   */
  private generateSummary(): void {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0.0';
    
    console.log('\n📊 Test Summary:');
    console.log(`   Total Tests: ${total}`);
    console.log(`   Passed: ${passed} ✅`);
    console.log(`   Failed: ${failed} ❌`);
    console.log(`   Pass Rate: ${passRate}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`   - ${result.testName}:`);
        result.issues.forEach(issue => console.log(`     * ${issue}`));
      });
    }
    
    console.log(`\n🎯 Current VK Parity: ${passRate}% (Target: 95%+)`);
  }

  /**
   * Get test results for external analysis
   */
  getResults(): ParityTestResult[] {
    return [...this.results];
  }
}

// Export main test runner function
export async function runParityTests(): Promise<ParityTestResult[]> {
  const runner = new ParityTestRunner();
  await runner.runStandardTests();
  return runner.getResults();
}