/**
 * Gate Test Framework Validation Runner
 * 
 * This test validates the GateTestFramework's integration with o1js infrastructure
 * and identifies concrete issues that need to be resolved.
 * 
 * Created: July 4, 2025, 11:15 AM PST
 * Last Modified: July 4, 2025, 11:15 AM PST
 */

import { Field, Bool, ZkProgram } from '../../index.js';
import { randomBytes } from '../../bindings/crypto/random.js';
import { constraintSystem, ifNotAllConstant, equals, contains } from '../../lib/testing/constraint-system.js';
import { GateTestFramework, GateOperation, MathProperties, InputGenerators } from './suites/gates/framework/GateTestFramework.js';
import { xor } from '../../lib/provable/gadgets/bitwise.js';

// Initialize backend switching functionality
import { initializeBindings, switchBackend, getCurrentBackend } from '../../bindings.js';

interface ValidationResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

interface FrameworkValidationReport {
  overallStatus: 'PASS' | 'FAIL';
  results: ValidationResult[];
  criticalIssues: string[];
  recommendations: string[];
}

/**
 * Test runner for comprehensive framework validation
 */
export class FrameworkValidator {
  private results: ValidationResult[] = [];
  private criticalIssues: string[] = [];
  private recommendations: string[] = [];

  /**
   * Run all validation tests
   */
  async runValidation(): Promise<FrameworkValidationReport> {
    console.log('🔍 Starting GateTestFramework validation...');
    
    try {
      // Initialize bindings first
      await initializeBindings();
      
      // Test 1: Import path validation
      await this.testImportPaths();
      
      // Test 2: Framework instantiation
      await this.testFrameworkInstantiation();
      
      // Test 3: Input generators
      await this.testInputGenerators();
      
      // Test 4: Mathematical property validators
      await this.testMathematicalProperties();
      
      // Test 5: Constraint system integration
      await this.testConstraintSystemIntegration();
      
      // Test 6: Backend switching
      await this.testBackendSwitching();
      
      // Test 7: Simple field operations
      await this.testSimpleFieldOperations();
      
      // Test 8: ZkProgram integration
      await this.testZkProgramIntegration();
      
    } catch (error) {
      this.addResult('framework_validation', false, error instanceof Error ? error.message : String(error));
      this.criticalIssues.push('Framework validation failed with critical error: ' + error);
    }
    
    return this.generateReport();
  }

  /**
   * Test 1: Validate import paths
   */
  private async testImportPaths(): Promise<void> {
    try {
      console.log('  📦 Testing import paths...');
      
      // Test Field import
      const testField = Field(42);
      if (!testField.toBigInt) {
        throw new Error('Field import incomplete - missing toBigInt method');
      }
      
      // Test Bool import  
      const testBool = Bool(true);
      if (!testBool.toField) {
        throw new Error('Bool import incomplete - missing toField method');
      }
      
      // Test randomBytes import
      const testRandomBytes = randomBytes(32);
      if (!testRandomBytes || testRandomBytes.length !== 32) {
        throw new Error('randomBytes import issue - randomBytes not working');
      }
      
      // Test constraint system DSL
      if (!constraintSystem || !equals || !contains) {
        throw new Error('Constraint system DSL imports incomplete');
      }
      
      this.addResult('import_paths', true);
      
    } catch (error) {
      this.addResult('import_paths', false, error instanceof Error ? error.message : String(error));
      this.criticalIssues.push('Import paths are incorrect, preventing framework usage');
    }
  }

  /**
   * Test 2: Framework instantiation
   */
  private async testFrameworkInstantiation(): Promise<void> {
    try {
      console.log('  🏗️  Testing framework instantiation...');
      
      const config = {
        name: 'test-framework',
        tier: 'core' as const,
        backend: 'sparky' as const,
        timeout: 30000,
        iterations: 5
      };
      
      const framework = new GateTestFramework(config);
      
      if (!framework) {
        throw new Error('Framework instantiation failed');
      }
      
      // Test that framework has required methods
      const requiredMethods = ['runGateTest', 'testConstraintPattern', 'testBackendParity'];
      for (const method of requiredMethods) {
        if (!(method in framework)) {
          throw new Error(`Framework missing required method: ${method}`);
        }
      }
      
      this.addResult('framework_instantiation', true);
      
    } catch (error) {
      this.addResult('framework_instantiation', false, error instanceof Error ? error.message : String(error));
      this.criticalIssues.push('Framework cannot be instantiated');
    }
  }

  /**
   * Test 3: Input generators
   */
  private async testInputGenerators(): Promise<void> {
    try {
      console.log('  🎲 Testing input generators...');
      
      // Test Field generator
      const randomField = InputGenerators.randomField();
      if (!randomField || typeof randomField.toBigInt !== 'function') {
        throw new Error('randomField generator failed');
      }
      
      // Test Field pair generator
      const fieldPair = InputGenerators.randomFieldPair();
      if (!Array.isArray(fieldPair) || fieldPair.length !== 2) {
        throw new Error('randomFieldPair generator failed');
      }
      
      // Test Bool generator
      const randomBool = InputGenerators.randomBool();
      if (!randomBool || typeof randomBool.toField !== 'function') {
        throw new Error('randomBool generator failed');
      }
      
      // Test Bool pair generator
      const boolPair = InputGenerators.randomBoolPair();
      if (!Array.isArray(boolPair) || boolPair.length !== 2) {
        throw new Error('randomBoolPair generator failed');
      }
      
      // Test range generator
      const rangeGen = InputGenerators.randomInRange(8);
      const rangeValue = rangeGen();
      if (!rangeValue || typeof rangeValue.toBigInt !== 'function') {
        throw new Error('randomInRange generator failed');
      }
      
      // Test edge cases generator
      const edgeCase = InputGenerators.edgeCases();
      if (!edgeCase || typeof edgeCase.toBigInt !== 'function') {
        throw new Error('edgeCases generator failed');
      }
      
      this.addResult('input_generators', true);
      
    } catch (error) {
      this.addResult('input_generators', false, error instanceof Error ? error.message : String(error));
      this.criticalIssues.push('Input generators are not working correctly');
    }
  }

  /**
   * Test 4: Mathematical property validators
   */
  private async testMathematicalProperties(): Promise<void> {
    try {
      console.log('  🔢 Testing mathematical property validators...');
      
      // Test field addition commutativity
      const a = Field(10);
      const b = Field(20);
      const sum = a.add(b);
      
      const commutativeProperty = MathProperties.fieldAdditionCommutative;
      if (!commutativeProperty.validate([a, b], sum)) {
        throw new Error('Field addition commutative property failed');
      }
      
      // Test field multiplication commutativity
      const product = a.mul(b);
      const multCommutativeProperty = MathProperties.fieldMultiplicationCommutative;
      if (!multCommutativeProperty.validate([a, b], product)) {
        throw new Error('Field multiplication commutative property failed');
      }
      
      // Test boolean value property
      const boolValue = Bool(true);
      const boolProperty = MathProperties.booleanValue;
      if (!boolProperty.validate([Field(1)], boolValue)) {
        throw new Error('Boolean value property failed');
      }
      
      // Test XOR truth table
      const xorProperty = MathProperties.xorTruthTable;
      const bool1 = Bool(true);
      const bool2 = Bool(false);
      const xorResult = xor(bool1.toField(), bool2.toField(), 1).equals(Field(1));
      if (!xorProperty.validate([bool1, bool2], xorResult)) {
        throw new Error('XOR truth table property failed');
      }
      
      // Test range check property
      const rangeProperty = MathProperties.rangeCheck(8);
      const smallValue = Field(100);
      const rangeResult = Bool(true); // Assuming 100 < 2^8
      if (!rangeProperty.validate([smallValue], rangeResult)) {
        throw new Error('Range check property failed');
      }
      
      this.addResult('mathematical_properties', true);
      
    } catch (error) {
      this.addResult('mathematical_properties', false, error instanceof Error ? error.message : String(error));
      this.criticalIssues.push('Mathematical property validators are not working correctly');
    }
  }

  /**
   * Test 5: Constraint system integration
   */
  private async testConstraintSystemIntegration(): Promise<void> {
    try {
      console.log('  🔗 Testing constraint system integration...');
      
      // Create a simple constraint system test
      const testResult = constraintSystem(
        'simple_addition_test',
        { from: [Field, Field] },
        (a: Field, b: Field) => {
          return a.add(b);
        },
        equals(['Generic'])
      );
      
      // Note: The actual constraint system test may not run synchronously
      // This just tests that the DSL can be called without errors
      
      this.addResult('constraint_system_integration', true);
      
    } catch (error) {
      this.addResult('constraint_system_integration', false, error instanceof Error ? error.message : String(error));
      this.recommendations.push('Constraint system integration needs work - may need async handling');
    }
  }

  /**
   * Test 6: Backend switching
   */
  private async testBackendSwitching(): Promise<void> {
    try {
      console.log('  ⚡ Testing backend switching...');
      
      // Test current backend detection
      const currentBackend = getCurrentBackend();
      console.log(`    Current backend: ${currentBackend}`);
      
      // Test switching to Sparky
      await switchBackend('sparky');
      const sparkyBackend = getCurrentBackend();
      
      if (sparkyBackend !== 'sparky') {
        throw new Error(`Expected sparky backend, got ${sparkyBackend}`);
      }
      
      // Test switching to Snarky
      await switchBackend('snarky');
      const snarkyBackend = getCurrentBackend();
      
      if (snarkyBackend !== 'snarky') {
        throw new Error(`Expected snarky backend, got ${snarkyBackend}`);
      }
      
      // Switch back to original
      await switchBackend(currentBackend as 'sparky' | 'snarky');
      
      this.addResult('backend_switching', true);
      
    } catch (error) {
      this.addResult('backend_switching', false, error instanceof Error ? error.message : String(error));
      this.recommendations.push('Backend switching may need additional setup or different API');
    }
  }

  /**
   * Test 7: Simple field operations
   */
  private async testSimpleFieldOperations(): Promise<void> {
    try {
      console.log('  ➕ Testing simple field operations...');
      
      const config = {
        name: 'simple-field-test',
        tier: 'core' as const,
        backend: 'sparky' as const,
        iterations: 3
      };
      
      const framework = new GateTestFramework(config);
      
      const simpleAddition: GateOperation<[Field, Field], Field> = {
        name: 'simple_addition',
        operation: (a, b) => a.add(b),
        properties: [
          {
            name: 'addition_result',
            description: 'Addition should produce a Field',
            validate: ([a, b], result) => {
              return typeof result.toBigInt === 'function';
            }
          }
        ]
      };
      
      const result = await framework.runGateTest(
        simpleAddition,
        () => [Field(5), Field(3)] as [Field, Field]
      );
      
      if (!result.passed) {
        throw new Error('Simple field operations test failed: ' + JSON.stringify(result.failures));
      }
      
      this.addResult('simple_field_operations', true, undefined, result);
      
    } catch (error) {
      this.addResult('simple_field_operations', false, error instanceof Error ? error.message : String(error));
      this.criticalIssues.push('Framework cannot execute simple field operations');
    }
  }

  /**
   * Test 8: ZkProgram integration
   */
  private async testZkProgramIntegration(): Promise<void> {
    try {
      console.log('  🧪 Testing ZkProgram integration...');
      
      const SimpleTestProgram = ZkProgram({
        name: 'simple-test-program',
        methods: {
          simpleAdd: {
            privateInputs: [Field, Field],
            async method(a: Field, b: Field): Promise<void> {
              const sum = a.add(b);
              sum.assertEquals(Field(8));
            }
          }
        }
      });
      
      // Test compilation
      await SimpleTestProgram.compile();
      
      // Test execution
      const { proof } = await SimpleTestProgram.simpleAdd(Field(5), Field(3));
      
      if (!proof) {
        throw new Error('ZkProgram failed to generate proof');
      }
      
      // Test verification
      const verified = await SimpleTestProgram.verify(proof);
      if (!verified) {
        throw new Error('ZkProgram proof verification failed');
      }
      
      this.addResult('zkprogram_integration', true);
      
    } catch (error) {
      this.addResult('zkprogram_integration', false, error instanceof Error ? error.message : String(error));
      this.recommendations.push('ZkProgram integration may need additional setup or different approach');
    }
  }

  /**
   * Helper methods
   */
  private addResult(test: string, passed: boolean, error?: string, details?: any): void {
    this.results.push({
      test,
      passed,
      error,
      details
    });
  }

  private generateReport(): FrameworkValidationReport {
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    const overallStatus = passedTests === totalTests ? 'PASS' : 'FAIL';
    
    // Add general recommendations
    if (this.criticalIssues.length === 0) {
      this.recommendations.push('Framework appears to be working correctly');
    }
    
    if (this.results.some(r => r.test === 'constraint_system_integration' && !r.passed)) {
      this.recommendations.push('Implement proper constraint counting integration');
    }
    
    if (this.results.some(r => r.test === 'backend_switching' && !r.passed)) {
      this.recommendations.push('Fix backend switching implementation in framework');
    }
    
    return {
      overallStatus,
      results: this.results,
      criticalIssues: this.criticalIssues,
      recommendations: this.recommendations
    };
  }
}

/**
 * Main validation runner
 */
export async function validateGateTestFramework(): Promise<FrameworkValidationReport> {
  const validator = new FrameworkValidator();
  return await validator.runValidation();
}

// Export for standalone execution
if (require.main === module) {
  validateGateTestFramework().then(report => {
    console.log('\n📋 VALIDATION REPORT');
    console.log('===================');
    console.log(`Overall Status: ${report.overallStatus}`);
    console.log(`Tests: ${report.results.filter(r => r.passed).length}/${report.results.length} passed`);
    
    if (report.criticalIssues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES:');
      report.criticalIssues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
    console.log('\n📊 DETAILED RESULTS:');
    report.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`  ${status} ${result.test}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
    
    process.exit(report.overallStatus === 'PASS' ? 0 : 1);
  }).catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}