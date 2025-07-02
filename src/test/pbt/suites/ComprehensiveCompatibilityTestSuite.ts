/**
 * Comprehensive PBT Test Suite for Snarky-Sparky Backend Compatibility
 * 
 * This test suite systematically runs all property tests against real backends
 * to quantify exact compatibility state and provide actionable insights for
 * achieving 100% backend parity.
 * 
 * ULTRATHINKING: This suite orchestrates all existing test frameworks to provide
 * systematic, comprehensive compatibility analysis with graceful failure handling
 * and detailed reporting to track progress toward 100% VK parity.
 */

import fc from 'fast-check';
import type { IAsyncProperty } from 'fast-check';

// Core o1js imports
import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend } from '../../../index.js';

// Existing test infrastructure
import { FieldProperties, createFieldProperties } from '../properties/FieldProperties.js';
import { RealBackendIntegration, realBackendIntegration, type Backend, type BackendResult } from '../integration/RealBackendIntegration.js';
import { VKParityAnalysis, createVKParityAnalysis, type VKAnalysisResult, type VKParityReport } from '../analysis/VKParityAnalysis.js';
import { CircuitShrinker, formatShrinkResult, type Circuit, type ShrinkResult } from '../utils/CircuitShrinker.js';
import { BackendCompatibilityTestRunner, type TestConfig, type TestResult } from '../infrastructure/BackendCompatibilityTestRunner.js';
import { BackendTestFramework, type ParityTestResult } from '../../framework/backend-test-framework.js';

/**
 * Test severity levels for progressive testing
 */
export enum TestSeverity {
  MINIMAL = 'minimal',        // Basic field operations
  BASIC = 'basic',           // Simple arithmetic
  INTERMEDIATE = 'intermediate', // Complex expressions
  ADVANCED = 'advanced',     // VK generation and comparison
  COMPREHENSIVE = 'comprehensive' // Full constraint analysis
}

/**
 * Configuration for the comprehensive test suite
 */
export interface ComprehensiveTestConfig {
  // Test selection
  severityLevels: TestSeverity[];
  skipKnownFailures: boolean;
  gracefulFailureHandling: boolean;
  
  // Execution parameters
  timeoutMs: number;
  maxRetries: number;
  parallelExecution: boolean;
  
  // Property test parameters
  numRuns: number;
  shrinkingEnabled: boolean;
  
  // Backend configuration
  testBothBackends: boolean;
  startingBackend: Backend;
  
  // VK parity configuration
  enableVKTesting: boolean;
  vkTimeoutMs: number;
  
  // Performance benchmarking
  enablePerformanceTesting: boolean;
  performanceThresholds: {
    executionTimeRatio: number;
    memoryRatio: number;
    constraintRateRatio: number;
  };
  
  // Reporting
  verboseLogging: boolean;
  generateDetailedReport: boolean;
  trackProgressOverTime: boolean;
}

/**
 * Individual test case result
 */
export interface TestCaseResult {
  name: string;
  severity: TestSeverity;
  category: string;
  passed: boolean;
  duration: number;
  
  // Backend-specific results
  snarkyResult?: any;
  sparkyResult?: any;
  backendComparison?: {
    resultsEqual: boolean;
    constraintsEqual: boolean;
    performanceRatio: number;
    differences: string[];
  };
  
  // VK parity results
  vkParity?: {
    hashesEqual: boolean;
    snarkyVK?: string;
    sparkyVK?: string;
  };
  
  // Performance metrics
  performance?: {
    snarkyTime: number;
    sparkyTime: number;
    memoryUsage: number;
    constraintGeneration: number;
  };
  
  // Error information
  error?: {
    message: string;
    backend?: Backend;
    phase: 'setup' | 'execution' | 'comparison' | 'vk_generation';
    recoverable: boolean;
  };
  
  // Shrinking information
  shrinkResult?: ShrinkResult;
  
  // Metadata
  metadata: {
    timestamp: number;
    attemptNumber: number;
    skipped: boolean;
    skipReason?: string;
  };
}

/**
 * Aggregated compatibility report
 */
export interface CompatibilityReport {
  // Overall metrics
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  compatibilityPercentage: number;
  
  // Breakdown by category
  categoryBreakdown: {
    [category: string]: {
      total: number;
      passed: number;
      failed: number;
      percentage: number;
    };
  };
  
  // Breakdown by severity
  severityBreakdown: {
    [severity in TestSeverity]: {
      total: number;
      passed: number;
      failed: number;
      percentage: number;
    };
  };
  
  // VK parity analysis
  vkParityAnalysis: {
    totalVKTests: number;
    vkHashMatches: number;
    vkParityPercentage: number;
    identicalHashBugDetected: boolean;
    sparkyVKDiversityScore: number;
  };
  
  // Performance analysis
  performanceAnalysis: {
    averagePerformanceRatio: number;
    withinThresholds: number;
    exceedsThresholds: number;
    performanceRegressions: string[];
  };
  
  // Error analysis
  errorAnalysis: {
    sparkyCompilationFailures: number;
    snarkyCompilationFailures: number;
    constraintMismatches: number;
    timeouts: number;
    criticalErrors: string[];
  };
  
  // Progress tracking
  progressTracking: {
    testsRun: number;
    estimatedTimeRemaining: number;
    currentSeverityLevel: TestSeverity;
    nextRecommendations: string[];
  };
  
  // Detailed results
  testResults: TestCaseResult[];
  
  // Summary
  summary: {
    currentState: string;
    criticalBlockers: string[];
    immediateActions: string[];
    progressToward100Percent: string;
  };
  
  // Report metadata
  reportMetadata: {
    generatedAt: string;
    duration: number;
    config: ComprehensiveTestConfig;
  };
}

/**
 * Comprehensive PBT test suite for backend compatibility
 */
export class ComprehensiveCompatibilityTestSuite {
  private config: ComprehensiveTestConfig;
  private fieldProperties: FieldProperties;
  private backendIntegration: RealBackendIntegration;
  private vkAnalysis: VKParityAnalysis;
  private testRunner: BackendCompatibilityTestRunner;
  private backendFramework: BackendTestFramework;
  private testResults: TestCaseResult[] = [];
  private startTime: number = 0;

  constructor(config?: Partial<ComprehensiveTestConfig>) {
    this.config = this.mergeWithDefaults(config);
    this.fieldProperties = createFieldProperties();
    this.backendIntegration = realBackendIntegration;
    this.vkAnalysis = createVKParityAnalysis();
    this.testRunner = new BackendCompatibilityTestRunner();
    this.backendFramework = new BackendTestFramework();
  }

  /**
   * Run the comprehensive compatibility test suite
   */
  async runComprehensiveTests(): Promise<CompatibilityReport> {
    this.startTime = Date.now();
    this.testResults = [];
    
    console.log('🚀 Starting Comprehensive Backend Compatibility Test Suite');
    console.log(`📋 Configuration: ${JSON.stringify(this.config, null, 2)}`);
    
    try {
      // Initialize backend state
      await this.initializeTestEnvironment();
      
      // Run tests in progressive severity levels
      for (const severity of this.config.severityLevels) {
        console.log(`\n📊 Running ${severity.toUpperCase()} severity tests...`);
        await this.runSeverityLevel(severity);
      }
      
      // Generate and return comprehensive report
      const report = await this.generateComprehensiveReport();
      
      console.log('\n✨ Comprehensive Test Suite Complete!');
      this.logReportSummary(report);
      
      return report;
    } catch (error) {
      console.error('❌ Comprehensive test suite failed:', error);
      throw error;
    }
  }

  /**
   * Run tests for a specific severity level
   */
  private async runSeverityLevel(severity: TestSeverity): Promise<void> {
    const testCases = this.getTestCasesForSeverity(severity);
    let completed = 0;
    
    console.log(`  📋 ${testCases.length} tests planned for ${severity} severity`);
    
    for (const testCase of testCases) {
      try {
        // Check if test should be skipped
        if (this.shouldSkipTest(testCase, severity)) {
          this.testResults.push(this.createSkippedResult(testCase, severity));
          continue;
        }
        
        console.log(`    🔄 Running: ${testCase.name}`);
        
        // Run test with retries and graceful failure handling
        const result = await this.runTestCaseWithRetries(testCase, severity);
        this.testResults.push(result);
        
        completed++;
        const progress = (completed / testCases.length * 100).toFixed(1);
        console.log(`    ${result.passed ? '✅' : '❌'} ${testCase.name} (${progress}%)`);
        
        // Early termination for critical failures if not in graceful mode
        if (!this.config.gracefulFailureHandling && this.isCriticalFailure(result)) {
          console.log(`    🛑 Critical failure detected, terminating ${severity} tests`);
          break;
        }
        
      } catch (error) {
        console.error(`    💥 Unexpected error in ${testCase.name}:`, error);
        this.testResults.push(this.createErrorResult(testCase, severity, error as Error));
      }
    }
  }

  /**
   * Run a single test case with retry logic
   */
  private async runTestCaseWithRetries(
    testCase: TestCaseDefinition, 
    severity: TestSeverity
  ): Promise<TestCaseResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.runSingleTestCase(testCase, severity, attempt);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.maxRetries) {
          console.log(`      🔄 Retry ${attempt}/${this.config.maxRetries - 1} for ${testCase.name}`);
          // Brief pause between retries
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // All retries failed
    return this.createErrorResult(testCase, severity, lastError!);
  }

  /**
   * Run a single test case
   */
  private async runSingleTestCase(
    testCase: TestCaseDefinition,
    severity: TestSeverity,
    attemptNumber: number
  ): Promise<TestCaseResult> {
    const startTime = Date.now();
    const result: TestCaseResult = {
      name: testCase.name,
      severity,
      category: testCase.category,
      passed: false,
      duration: 0,
      metadata: {
        timestamp: startTime,
        attemptNumber,
        skipped: false
      }
    };
    
    try {
      // Execute test based on type
      switch (testCase.type) {
        case 'property':
          await this.runPropertyTest(testCase, result);
          break;
        case 'vk_parity':
          await this.runVKParityTest(testCase, result);
          break;
        case 'constraint_analysis':
          await this.runConstraintAnalysisTest(testCase, result);
          break;
        case 'performance':
          await this.runPerformanceTest(testCase, result);
          break;
        case 'backend_integration':
          await this.runBackendIntegrationTest(testCase, result);
          break;
        default:
          throw new Error(`Unknown test type: ${(testCase as any).type}`);
      }
      
      result.duration = Date.now() - startTime;
      return result;
      
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.error = {
        message: (error as Error).message,
        phase: 'execution',
        recoverable: this.isRecoverableError(error as Error)
      };
      
      if (this.config.shrinkingEnabled && testCase.type === 'property') {
        result.shrinkResult = await this.attemptShrinking(testCase, error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Run property-based test
   */
  private async runPropertyTest(
    testCase: TestCaseDefinition,
    result: TestCaseResult
  ): Promise<void> {
    const property = testCase.propertyGenerator!();
    const testConfig: TestConfig = {
      numRuns: this.config.numRuns,
      timeout: this.config.timeoutMs,
      verbose: this.config.verboseLogging
    };
    
    const testResult = await this.testRunner.runPropertyTest(
      testCase.name,
      property,
      testConfig
    );
    
    result.passed = testResult.success;
    
    if (!testResult.success && testResult.counterexample) {
      // Run backend comparison on the failing example
      if (this.config.testBothBackends) {
        result.backendComparison = await this.compareBackendsOnInput(
          testCase,
          testResult.counterexample
        );
      }
    }
  }

  /**
   * Run VK parity test
   */
  private async runVKParityTest(
    testCase: TestCaseDefinition,
    result: TestCaseResult
  ): Promise<void> {
    if (!this.config.enableVKTesting) {
      result.metadata.skipped = true;
      result.metadata.skipReason = 'VK testing disabled';
      return;
    }
    
    const program = testCase.programGenerator!();
    
    try {
      // Test with Snarky
      const snarkyVK = await this.vkAnalysis.extractVKAnalysis(
        program,
        'snarky',
        1,
        testCase.name
      );
      
      // Test with Sparky (with graceful failure handling)
      let sparkyVK: VKAnalysisResult;
      try {
        sparkyVK = await this.vkAnalysis.extractVKAnalysis(
          program,
          'sparky',
          1,
          testCase.name
        );
      } catch (sparkyError) {
        if (this.config.gracefulFailureHandling) {
          result.error = {
            message: `Sparky VK generation failed: ${(sparkyError as Error).message}`,
            backend: 'sparky',
            phase: 'vk_generation',
            recoverable: true
          };
          result.passed = false;
          return;
        }
        throw sparkyError;
      }
      
      // Compare VK results
      const vkHashesEqual = snarkyVK.success && sparkyVK.success && 
                           snarkyVK.vkHash === sparkyVK.vkHash;
      
      result.vkParity = {
        hashesEqual: vkHashesEqual,
        snarkyVK: snarkyVK.vkHash,
        sparkyVK: sparkyVK.vkHash
      };
      
      result.passed = vkHashesEqual;
      
    } catch (error) {
      result.error = {
        message: (error as Error).message,
        phase: 'vk_generation',
        recoverable: false
      };
      throw error;
    }
  }

  /**
   * Run constraint analysis test
   */
  private async runConstraintAnalysisTest(
    testCase: TestCaseDefinition,
    result: TestCaseResult
  ): Promise<void> {
    const circuitFn = testCase.circuitGenerator!();
    
    const parityResult = await this.backendFramework.testConstraintParity(
      circuitFn,
      testCase.name
    );
    
    result.passed = parityResult.passed;
    result.backendComparison = {
      resultsEqual: true, // Not applicable for constraints
      constraintsEqual: parityResult.constraintCountMatch,
      performanceRatio: 1.0, // Not measured here
      differences: parityResult.issues
    };
  }

  /**
   * Run performance test
   */
  private async runPerformanceTest(
    testCase: TestCaseDefinition,
    result: TestCaseResult
  ): Promise<void> {
    if (!this.config.enablePerformanceTesting) {
      result.metadata.skipped = true;
      result.metadata.skipReason = 'Performance testing disabled';
      return;
    }
    
    const testFn = testCase.performanceTestFn!();
    
    const comparison = await this.backendIntegration.compareBackends(
      testFn,
      {
        timeoutMs: this.config.timeoutMs,
        captureConstraints: true
      }
    );
    
    result.backendComparison = comparison.comparison;
    result.performance = {
      snarkyTime: comparison.snarky.performance.executionTime,
      sparkyTime: comparison.sparky.performance.executionTime,
      memoryUsage: comparison.sparky.performance.memoryDelta,
      constraintGeneration: comparison.sparky.performance.constraintGenerationRate
    };
    
    // Check performance thresholds
    const withinThresholds = comparison.comparison.performanceRatio <= 
                            this.config.performanceThresholds.executionTimeRatio;
    
    result.passed = comparison.comparison.resultsEqual && withinThresholds;
  }

  /**
   * Run backend integration test
   */
  private async runBackendIntegrationTest(
    testCase: TestCaseDefinition,
    result: TestCaseResult
  ): Promise<void> {
    const testFn = testCase.integrationTestFn!();
    
    const backendResult = await this.backendFramework.testWithBothBackends(
      testFn,
      testCase.name,
      true
    );
    
    result.passed = backendResult.passed;
    result.snarkyResult = backendResult.snarky;
    result.sparkyResult = backendResult.sparky;
    result.backendComparison = {
      resultsEqual: backendResult.equal,
      constraintsEqual: true, // Not applicable
      performanceRatio: 1.0, // Not measured
      differences: backendResult.equal ? [] : ['Results differ']
    };
  }

  /**
   * Compare backends on specific input
   */
  private async compareBackendsOnInput(
    testCase: TestCaseDefinition,
    input: any
  ): Promise<any> {
    try {
      const comparison = await this.backendIntegration.compareBackends(
        (backend) => testCase.executeWithInput!(input, backend),
        {
          timeoutMs: this.config.timeoutMs / 2, // Shorter timeout for comparison
          captureConstraints: true
        }
      );
      
      return comparison.comparison;
    } catch (error) {
      return {
        resultsEqual: false,
        constraintsEqual: false,
        performanceRatio: 0,
        differences: [`Comparison failed: ${(error as Error).message}`]
      };
    }
  }

  /**
   * Attempt to shrink failing test case
   */
  private async attemptShrinking(
    testCase: TestCaseDefinition,
    error: Error
  ): Promise<ShrinkResult | undefined> {
    if (!testCase.shrinkable) return undefined;
    
    try {
      const shrinker = new CircuitShrinker(async (circuit: Circuit) => {
        // Mock shrinking test - replace with actual shrinking logic
        return Promise.resolve(false);
      });
      
      // Create a mock circuit for shrinking
      const mockCircuit: Circuit = {
        publicInputs: [],
        operations: [],
        assertions: []
      };
      
      return await shrinker.shrink(mockCircuit);
    } catch (shrinkError) {
      console.warn(`Shrinking failed for ${testCase.name}:`, shrinkError);
      return undefined;
    }
  }

  /**
   * Generate comprehensive compatibility report
   */
  private async generateComprehensiveReport(): Promise<CompatibilityReport> {
    const totalDuration = Date.now() - this.startTime;
    
    // Calculate basic metrics
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = this.testResults.filter(r => !r.passed && !r.metadata.skipped).length;
    const skippedTests = this.testResults.filter(r => r.metadata.skipped).length;
    const compatibilityPercentage = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    
    // Category breakdown
    const categoryBreakdown = this.calculateCategoryBreakdown();
    
    // Severity breakdown
    const severityBreakdown = this.calculateSeverityBreakdown();
    
    // VK parity analysis
    const vkParityAnalysis = await this.analyzeVKParity();
    
    // Performance analysis
    const performanceAnalysis = this.analyzePerformance();
    
    // Error analysis
    const errorAnalysis = this.analyzeErrors();
    
    // Progress tracking
    const progressTracking = this.calculateProgress();
    
    // Generate summary
    const summary = this.generateSummary(compatibilityPercentage, vkParityAnalysis);
    
    const report: CompatibilityReport = {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      compatibilityPercentage,
      categoryBreakdown,
      severityBreakdown,
      vkParityAnalysis,
      performanceAnalysis,
      errorAnalysis,
      progressTracking,
      testResults: this.testResults,
      summary,
      reportMetadata: {
        generatedAt: new Date().toISOString(),
        duration: totalDuration,
        config: this.config
      }
    };
    
    if (this.config.generateDetailedReport) {
      await this.writeDetailedReport(report);
    }
    
    return report;
  }

  /**
   * Initialize test environment
   */
  private async initializeTestEnvironment(): Promise<void> {
    console.log('🔧 Initializing test environment...');
    
    // Validate backend state
    const backendState = await this.backendIntegration.validateBackendState();
    if (!backendState.globalStateConsistent) {
      console.warn('⚠️  Backend state issues detected:', backendState.errors);
      if (!this.config.gracefulFailureHandling) {
        throw new Error(`Backend state validation failed: ${backendState.errors.join(', ')}`);
      }
    }
    
    // Switch to starting backend
    await this.backendIntegration.switchBackend(this.config.startingBackend);
    console.log(`✅ Environment initialized with ${this.config.startingBackend} backend`);
  }

  /**
   * Get test cases for severity level
   */
  private getTestCasesForSeverity(severity: TestSeverity): TestCaseDefinition[] {
    const testCases: TestCaseDefinition[] = [];
    
    switch (severity) {
      case TestSeverity.MINIMAL:
        testCases.push(...this.getMinimalTests());
        break;
      case TestSeverity.BASIC:
        testCases.push(...this.getBasicTests());
        break;
      case TestSeverity.INTERMEDIATE:
        testCases.push(...this.getIntermediateTests());
        break;
      case TestSeverity.ADVANCED:
        testCases.push(...this.getAdvancedTests());
        break;
      case TestSeverity.COMPREHENSIVE:
        testCases.push(...this.getComprehensiveTests());
        break;
    }
    
    return testCases;
  }

  /**
   * Get minimal test cases (basic field operations)
   */
  private getMinimalTests(): TestCaseDefinition[] {
    return [
      {
        name: 'field_addition_commutative_minimal',
        category: 'field_arithmetic',
        type: 'property',
        shrinkable: true,
        propertyGenerator: () => this.fieldProperties.additionCommutative(),
        executeWithInput: async (input, backend) => {
          await switchBackend(backend);
          const [a, b] = input;
          return a.add(b);
        }
      },
      {
        name: 'field_multiplication_minimal',
        category: 'field_arithmetic',
        type: 'property',
        shrinkable: true,
        propertyGenerator: () => this.fieldProperties.multiplicationCommutative(),
        executeWithInput: async (input, backend) => {
          await switchBackend(backend);
          const [a, b] = input;
          return a.mul(b);
        }
      },
      {
        name: 'backend_switching_basic',
        category: 'backend_infrastructure',
        type: 'backend_integration',
        shrinkable: false,
        integrationTestFn: () => async () => {
          const currentBackend = getCurrentBackend();
          const targetBackend = currentBackend === 'snarky' ? 'sparky' : 'snarky';
          await switchBackend(targetBackend);
          return getCurrentBackend() === targetBackend;
        }
      }
    ];
  }

  /**
   * Get basic test cases
   */
  private getBasicTests(): TestCaseDefinition[] {
    const fieldPropertyTests = this.fieldProperties.getAllProperties()
      .filter(prop => ['field_addition_commutative', 'field_addition_associative', 
                      'field_multiplication_commutative', 'field_additive_identity',
                      'field_multiplicative_identity'].includes(prop.name))
      .map(prop => ({
        name: prop.name,
        category: 'field_properties',
        type: 'property' as const,
        shrinkable: true,
        propertyGenerator: () => prop.property,
        executeWithInput: async (input: any, backend: Backend) => {
          await switchBackend(backend);
          return input; // Simplified for basic tests
        }
      }));
      
    return [
      ...fieldPropertyTests,
      {
        name: 'simple_circuit_constraint_count',
        category: 'constraint_analysis',
        type: 'constraint_analysis',
        shrinkable: false,
        circuitGenerator: () => () => {
          const x = Provable.witness(Field, () => Field(3));
          x.mul(x).assertEquals(Field(9));
        }
      }
    ];
  }

  /**
   * Get intermediate test cases
   */
  private getIntermediateTests(): TestCaseDefinition[] {
    const fieldPropertyTests = this.fieldProperties.getAllProperties()
      .filter(prop => ['field_square_consistency', 'field_division_inverse',
                      'field_complex_expression_consistency'].includes(prop.name))
      .map(prop => ({
        name: prop.name,
        category: 'field_properties',
        type: 'property' as const,
        shrinkable: true,
        propertyGenerator: () => prop.property,
        executeWithInput: async (input: any, backend: Backend) => {
          await switchBackend(backend);
          return input;
        }
      }));
      
    return [
      ...fieldPropertyTests,
      {
        name: 'poseidon_hash_performance',
        category: 'cryptographic_operations',
        type: 'performance',
        shrinkable: false,
        performanceTestFn: () => (backend: Backend) => {
          return async () => {
            const { Poseidon } = await import('../../../lib/provable/crypto/poseidon.js');
            const inputs = [Field(1), Field(2), Field(3)];
            return Poseidon.hash(inputs);
          };
        }
      }
    ];
  }

  /**
   * Get advanced test cases (VK parity focus)
   */
  private getAdvancedTests(): TestCaseDefinition[] {
    const vkParityTests = this.vkAnalysis.getComplexityLevels()
      .slice(0, 4) // First 4 complexity levels
      .map(level => ({
        name: `vk_parity_${level.name.toLowerCase()}`,
        category: 'vk_parity',
        type: 'vk_parity' as const,
        shrinkable: false,
        programGenerator: () => level.generator()
      }));
      
    return [
      ...vkParityTests,
      {
        name: 'constraint_count_tolerance_advanced',
        category: 'constraint_optimization',
        type: 'property',
        shrinkable: false,
        propertyGenerator: () => this.fieldProperties.constraintCountTolerance()
      }
    ];
  }

  /**
   * Get comprehensive test cases
   */
  private getComprehensiveTests(): TestCaseDefinition[] {
    const allFieldProperties = this.fieldProperties.getAllProperties()
      .map(prop => ({
        name: prop.name,
        category: 'field_properties_comprehensive',
        type: 'property' as const,
        shrinkable: true,
        propertyGenerator: () => prop.property,
        executeWithInput: async (input: any, backend: Backend) => {
          await switchBackend(backend);
          return input;
        }
      }));
      
    const allVKTests = this.vkAnalysis.getComplexityLevels()
      .map(level => ({
        name: `vk_comprehensive_${level.name.toLowerCase()}`,
        category: 'vk_parity_comprehensive',
        type: 'vk_parity' as const,
        shrinkable: false,
        programGenerator: () => level.generator()
      }));
      
    return [
      ...allFieldProperties,
      ...allVKTests,
      {
        name: 'backend_routing_comprehensive',
        category: 'backend_infrastructure',
        type: 'backend_integration',
        shrinkable: false,
        integrationTestFn: () => async () => {
          const routingResult = await this.backendFramework.testBackendRouting();
          return routingResult.passed;
        }
      }
    ];
  }

  // Analysis methods
  private calculateCategoryBreakdown(): { [category: string]: any } {
    const categories = new Map<string, { total: number; passed: number; failed: number }>();
    
    for (const result of this.testResults) {
      if (!categories.has(result.category)) {
        categories.set(result.category, { total: 0, passed: 0, failed: 0 });
      }
      
      const cat = categories.get(result.category)!;
      cat.total++;
      if (result.passed) cat.passed++;
      else if (!result.metadata.skipped) cat.failed++;
    }
    
    const breakdown: { [category: string]: any } = {};
    for (const [category, stats] of categories.entries()) {
      breakdown[category] = {
        ...stats,
        percentage: stats.total > 0 ? (stats.passed / stats.total) * 100 : 0
      };
    }
    
    return breakdown;
  }

  private calculateSeverityBreakdown(): { [severity in TestSeverity]: any } {
    const severities = new Map<TestSeverity, { total: number; passed: number; failed: number }>();
    
    // Initialize all severities
    for (const severity of Object.values(TestSeverity)) {
      severities.set(severity, { total: 0, passed: 0, failed: 0 });
    }
    
    for (const result of this.testResults) {
      const sev = severities.get(result.severity)!;
      sev.total++;
      if (result.passed) sev.passed++;
      else if (!result.metadata.skipped) sev.failed++;
    }
    
    const breakdown: { [severity in TestSeverity]: any } = {} as any;
    for (const [severity, stats] of severities.entries()) {
      breakdown[severity] = {
        ...stats,
        percentage: stats.total > 0 ? (stats.passed / stats.total) * 100 : 0
      };
    }
    
    return breakdown;
  }

  private async analyzeVKParity(): Promise<any> {
    const vkTests = this.testResults.filter(r => r.category.includes('vk_parity'));
    const totalVKTests = vkTests.length;
    const vkHashMatches = vkTests.filter(r => r.vkParity?.hashesEqual).length;
    
    // Detect identical hash bug
    const sparkyVKs = vkTests
      .filter(r => r.vkParity?.sparkyVK)
      .map(r => r.vkParity!.sparkyVK!);
    const uniqueSparkyVKs = new Set(sparkyVKs);
    const identicalHashBugDetected = uniqueSparkyVKs.size === 1 && sparkyVKs.length > 1;
    
    return {
      totalVKTests,
      vkHashMatches,
      vkParityPercentage: totalVKTests > 0 ? (vkHashMatches / totalVKTests) * 100 : 0,
      identicalHashBugDetected,
      sparkyVKDiversityScore: sparkyVKs.length > 0 ? uniqueSparkyVKs.size / sparkyVKs.length : 0
    };
  }

  private analyzePerformance(): any {
    const perfTests = this.testResults.filter(r => r.performance);
    
    if (perfTests.length === 0) {
      return {
        averagePerformanceRatio: 0,
        withinThresholds: 0,
        exceedsThresholds: 0,
        performanceRegressions: []
      };
    }
    
    const ratios = perfTests.map(r => r.performance!.sparkyTime / Math.max(r.performance!.snarkyTime, 1));
    const averageRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    
    const threshold = this.config.performanceThresholds.executionTimeRatio;
    const withinThresholds = ratios.filter(r => r <= threshold).length;
    const exceedsThresholds = ratios.filter(r => r > threshold).length;
    
    const regressions = perfTests
      .filter(r => (r.performance!.sparkyTime / Math.max(r.performance!.snarkyTime, 1)) > threshold)
      .map(r => `${r.name}: ${((r.performance!.sparkyTime / Math.max(r.performance!.snarkyTime, 1)) * 100).toFixed(1)}% slower`);
    
    return {
      averagePerformanceRatio: averageRatio,
      withinThresholds,
      exceedsThresholds,
      performanceRegressions: regressions
    };
  }

  private analyzeErrors(): any {
    const sparkyCompilationFailures = this.testResults.filter(r => 
      r.error?.backend === 'sparky' && r.error.phase === 'vk_generation'
    ).length;
    
    const snarkyCompilationFailures = this.testResults.filter(r => 
      r.error?.backend === 'snarky' && r.error.phase === 'vk_generation'
    ).length;
    
    const constraintMismatches = this.testResults.filter(r => 
      r.backendComparison && !r.backendComparison.constraintsEqual
    ).length;
    
    const timeouts = this.testResults.filter(r => 
      r.error?.message.includes('timeout')
    ).length;
    
    const criticalErrors = this.testResults
      .filter(r => r.error && !r.error.recoverable)
      .map(r => `${r.name}: ${r.error!.message}`);
    
    return {
      sparkyCompilationFailures,
      snarkyCompilationFailures,
      constraintMismatches,
      timeouts,
      criticalErrors
    };
  }

  private calculateProgress(): any {
    return {
      testsRun: this.testResults.length,
      estimatedTimeRemaining: 0, // TODO: Calculate based on remaining tests
      currentSeverityLevel: this.config.severityLevels[this.config.severityLevels.length - 1],
      nextRecommendations: this.generateNextRecommendations()
    };
  }

  private generateNextRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const sparkyFailures = this.testResults.filter(r => 
      r.error?.backend === 'sparky'
    ).length;
    
    const vkParityFailures = this.testResults.filter(r => 
      r.vkParity && !r.vkParity.hashesEqual
    ).length;
    
    if (sparkyFailures > 0) {
      recommendations.push('Focus on Sparky compilation stability and error handling');
    }
    
    if (vkParityFailures > 0) {
      recommendations.push('Investigate VK generation differences between backends');
    }
    
    const constraintMismatches = this.testResults.filter(r => 
      r.backendComparison && !r.backendComparison.constraintsEqual
    ).length;
    
    if (constraintMismatches > 0) {
      recommendations.push('Address constraint count differences (e.g., reduce_lincom optimization)');
    }
    
    return recommendations;
  }

  private generateSummary(compatibilityPercentage: number, vkParityAnalysis: any): any {
    let currentState: string;
    if (compatibilityPercentage >= 90) {
      currentState = 'Near-complete compatibility - focus on edge cases';
    } else if (compatibilityPercentage >= 70) {
      currentState = 'Good compatibility - address remaining systematic issues';
    } else if (compatibilityPercentage >= 50) {
      currentState = 'Moderate compatibility - significant work needed';
    } else if (compatibilityPercentage >= 25) {
      currentState = 'Low compatibility - fundamental issues present';
    } else {
      currentState = 'Critical compatibility issues - major architectural work required';
    }
    
    const criticalBlockers: string[] = [];
    if (vkParityAnalysis.identicalHashBugDetected) {
      criticalBlockers.push('Sparky generates identical VK hashes for all circuits');
    }
    
    const sparkyFailureRate = this.testResults.filter(r => 
      r.error?.backend === 'sparky'
    ).length / Math.max(this.testResults.length, 1);
    
    if (sparkyFailureRate > 0.3) {
      criticalBlockers.push('High Sparky compilation failure rate');
    }
    
    const immediateActions = [
      'Run VK parity debugging analysis',
      'Fix constraint routing bug in backend switching',
      'Implement missing reduce_lincom optimization in Sparky'
    ];
    
    const progressToward100Percent = `${compatibilityPercentage.toFixed(1)}% compatible. ` +
      `Estimated ${(100 - compatibilityPercentage).toFixed(1)}% work remaining for full parity.`;
    
    return {
      currentState,
      criticalBlockers,
      immediateActions,
      progressToward100Percent
    };
  }

  // Utility methods
  private mergeWithDefaults(config?: Partial<ComprehensiveTestConfig>): ComprehensiveTestConfig {
    return {
      severityLevels: [TestSeverity.MINIMAL, TestSeverity.BASIC, TestSeverity.INTERMEDIATE, TestSeverity.ADVANCED],
      skipKnownFailures: true,
      gracefulFailureHandling: true,
      timeoutMs: 60000,
      maxRetries: 2,
      parallelExecution: false,
      numRuns: 25,
      shrinkingEnabled: true,
      testBothBackends: true,
      startingBackend: 'snarky',
      enableVKTesting: true,
      vkTimeoutMs: 120000,
      enablePerformanceTesting: true,
      performanceThresholds: {
        executionTimeRatio: 1.5,
        memoryRatio: 2.0,
        constraintRateRatio: 0.5
      },
      verboseLogging: false,
      generateDetailedReport: true,
      trackProgressOverTime: true,
      ...config
    };
  }

  private shouldSkipTest(testCase: TestCaseDefinition, severity: TestSeverity): boolean {
    if (!this.config.skipKnownFailures) return false;
    
    // Skip VK tests if Sparky VK generation is known to be broken
    if (testCase.type === 'vk_parity' && !this.config.enableVKTesting) {
      return true;
    }
    
    // Skip performance tests if disabled
    if (testCase.type === 'performance' && !this.config.enablePerformanceTesting) {
      return true;
    }
    
    return false;
  }

  private isCriticalFailure(result: TestCaseResult): boolean {
    return result.error && !result.error.recoverable;
  }

  private isRecoverableError(error: Error): boolean {
    const recoverablePatterns = [
      'timeout',
      'sparky compilation',
      'vk generation failed',
      'memory',
      'temporary'
    ];
    
    return recoverablePatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  }

  private createSkippedResult(testCase: TestCaseDefinition, severity: TestSeverity): TestCaseResult {
    return {
      name: testCase.name,
      severity,
      category: testCase.category,
      passed: false,
      duration: 0,
      metadata: {
        timestamp: Date.now(),
        attemptNumber: 0,
        skipped: true,
        skipReason: 'Configured to skip'
      }
    };
  }

  private createErrorResult(testCase: TestCaseDefinition, severity: TestSeverity, error: Error): TestCaseResult {
    return {
      name: testCase.name,
      severity,
      category: testCase.category,
      passed: false,
      duration: 0,
      error: {
        message: error.message,
        phase: 'execution',
        recoverable: this.isRecoverableError(error)
      },
      metadata: {
        timestamp: Date.now(),
        attemptNumber: 1,
        skipped: false
      }
    };
  }

  private async writeDetailedReport(report: CompatibilityReport): Promise<void> {
    const reportPath = '/tmp/o1js_compatibility_report.json';
    const fs = await import('fs/promises');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report written to: ${reportPath}`);
  }

  private logReportSummary(report: CompatibilityReport): void {
    console.log('\n📊 COMPATIBILITY REPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`Overall Compatibility: ${report.compatibilityPercentage.toFixed(1)}%`);
    console.log(`Tests: ${report.passedTests}/${report.totalTests} passed (${report.failedTests} failed, ${report.skippedTests} skipped)`);
    console.log(`VK Parity: ${report.vkParityAnalysis.vkParityPercentage.toFixed(1)}% (${report.vkParityAnalysis.vkHashMatches}/${report.vkParityAnalysis.totalVKTests})`);
    console.log(`Performance: Avg ${report.performanceAnalysis.averagePerformanceRatio.toFixed(2)}x slower`);
    console.log(`\nCurrent State: ${report.summary.currentState}`);
    
    if (report.summary.criticalBlockers.length > 0) {
      console.log('\n🚨 Critical Blockers:');
      report.summary.criticalBlockers.forEach(blocker => console.log(`  - ${blocker}`));
    }
    
    console.log('\n🎯 Next Actions:');
    report.summary.immediateActions.forEach(action => console.log(`  - ${action}`));
    
    console.log(`\n⏱️  Duration: ${(report.reportMetadata.duration / 1000).toFixed(1)}s`);
  }
}

/**
 * Test case definition interface
 */
interface TestCaseDefinition {
  name: string;
  category: string;
  type: 'property' | 'vk_parity' | 'constraint_analysis' | 'performance' | 'backend_integration';
  shrinkable: boolean;
  
  // Property test specific
  propertyGenerator?: () => IAsyncProperty<any>;
  executeWithInput?: (input: any, backend: Backend) => Promise<any>;
  
  // VK parity specific
  programGenerator?: () => any;
  
  // Constraint analysis specific
  circuitGenerator?: () => () => void;
  
  // Performance test specific
  performanceTestFn?: () => (backend: Backend) => Promise<any>;
  
  // Backend integration specific
  integrationTestFn?: () => () => Promise<any>;
}

/**
 * Factory function to create and run comprehensive test suite
 */
export async function runComprehensiveCompatibilityTests(
  config?: Partial<ComprehensiveTestConfig>
): Promise<CompatibilityReport> {
  const suite = new ComprehensiveCompatibilityTestSuite(config);
  return await suite.runComprehensiveTests();
}

/**
 * Quick compatibility check with minimal configuration
 */
export async function quickCompatibilityCheck(): Promise<{
  compatibilityPercentage: number;
  criticalIssues: string[];
  summary: string;
}> {
  console.log('🚀 Running Quick Compatibility Check...');
  
  const suite = new ComprehensiveCompatibilityTestSuite({
    severityLevels: [TestSeverity.MINIMAL, TestSeverity.BASIC],
    numRuns: 10,
    timeoutMs: 30000,
    gracefulFailureHandling: true,
    verboseLogging: false
  });
  
  const report = await suite.runComprehensiveTests();
  
  return {
    compatibilityPercentage: report.compatibilityPercentage,
    criticalIssues: report.summary.criticalBlockers,
    summary: report.summary.progressToward100Percent
  };
}

// Export for use in other test files
export { ComprehensiveCompatibilityTestSuite };