#!/usr/bin/env node
/**
 * Integration Worker Process
 * 
 * This worker process handles backend switching tests:
 * - Tests backend switching reliability
 * - Verifies state isolation between backends
 * - Performs direct snarky vs sparky comparisons
 * - Runs integration tests that require both backends
 */

import { MemoryManager } from '../shared/MemoryManager.js';
import { fileURLToPath } from 'url';
import { argv } from 'process';

type Backend = 'snarky' | 'sparky';

interface IntegrationWorkerConfig {
  suites: string[];
  memoryLimitMB: number;
  maxExecutionTimeMs: number;
  verbose: boolean;
}

interface IntegrationTestResult {
  testName: string;
  success: boolean;
  duration: number;
  backends: Backend[];
  results: { [backend: string]: any };
  comparison?: {
    match: boolean;
    snarkyResult: any;
    sparkyResult: any;
    difference?: string;
  };
  error?: string;
}

interface IntegrationSuiteResult {
  suiteName: string;
  results: IntegrationTestResult[];
  totalDuration: number;
  memoryStats: any;
  success: boolean;
  backendSwitches: number;
}

class IntegrationWorker {
  private config: IntegrationWorkerConfig;
  private memoryManager: MemoryManager;
  private startTime: number;
  private backendSwitchCount = 0;
  private o1js: any = null;

  constructor(config: IntegrationWorkerConfig) {
    this.config = config;
    this.startTime = Date.now();
    
    // Setup memory management
    this.memoryManager = new MemoryManager(
      config.memoryLimitMB,
      true, // aggressive mode
      (usage) => this.handleMemoryExceeded(usage)
    );

    // Setup timeout
    setTimeout(() => {
      this.handleTimeout();
    }, config.maxExecutionTimeMs);

    this.memoryManager.startMonitoring();
  }

  /**
   * Main entry point - run integration test suites
   */
  async run(): Promise<void> {
    try {
      this.log('🔄 Integration worker starting (backend switching tests)', true);
      this.log(`📋 Assigned suites: ${this.config.suites.join(', ')}`, true);
      
      // Initialize o1js imports
      await this.initializeO1js();
      
      // Run all assigned integration test suites
      const results: IntegrationSuiteResult[] = [];
      for (const suiteName of this.config.suites) {
        const suiteResult = await this.runIntegrationSuite(suiteName);
        results.push(suiteResult);
        
        this.sendProgressUpdate(suiteName, suiteResult.success);
      }

      // Send final results
      this.sendFinalResults(results);
      
      this.log(`✅ Integration worker completed in ${this.getElapsedTime()}ms`);
      this.log(`🔄 Total backend switches: ${this.backendSwitchCount}`);
      process.exit(0);
      
    } catch (error) {
      this.handleWorkerError(error);
    }
  }

  /**
   * Initialize o1js imports
   */
  private async initializeO1js(): Promise<void> {
    try {
      this.log('📦 Loading real o1js with backend switching support...');
      
      // Import o1js with real backend switching
      const o1jsModule = await import('../../../index.js');
      
      this.o1js = {
        switchBackend: async (backend: string) => {
          this.log(`🔄 Real backend switch to: ${backend}`);
          await o1jsModule.switchBackend(backend as Backend);
          this.backendSwitchCount++;
        },
        getCurrentBackend: () => o1jsModule.getCurrentBackend(),
        Field: o1jsModule.Field,
        Provable: o1jsModule.Provable,
        ZkProgram: o1jsModule.ZkProgram
      };
      
      // Store o1js reference globally for tests
      (global as any).o1js = o1jsModule;
      
      this.log('✅ Real o1js initialized with backend switching');
      
    } catch (error) {
      throw new Error(`Failed to initialize o1js: ${(error as Error).message}`);
    }
  }

  /**
   * Run an integration test suite
   */
  private async runIntegrationSuite(suiteName: string): Promise<IntegrationSuiteResult> {
    const suiteStartTime = Date.now();
    this.log(`🧪 Running integration suite: ${suiteName}`);
    
    try {
      const suite = await this.loadIntegrationSuite(suiteName);
      const results: IntegrationTestResult[] = [];
      
      for (const test of suite.tests) {
        const testResult = await this.runIntegrationTest(test);
        results.push(testResult);
        
        this.memoryManager.checkMemoryUsage();
      }
      
      const totalDuration = Date.now() - suiteStartTime;
      const success = results.every(r => r.success);
      
      return {
        suiteName,
        results,
        totalDuration,
        memoryStats: this.memoryManager.getMemoryStats(),
        success,
        backendSwitches: this.backendSwitchCount
      };
      
    } catch (error) {
      return {
        suiteName,
        results: [],
        totalDuration: Date.now() - suiteStartTime,
        memoryStats: this.memoryManager.getMemoryStats(),
        success: false,
        backendSwitches: this.backendSwitchCount
      };
    }
  }

  /**
   * Load an integration test suite using automatic discovery
   */
  private async loadIntegrationSuite(suiteName: string): Promise<any> {
    try {
      // Import test discovery
      const { TestDiscovery } = await import('../shared/TestDiscovery.js');
      const discovery = new TestDiscovery();
      
      // Discover all integration suites
      const integrationSuites = discovery.discoverIntegrationSuites();
      
      // Find the requested suite (flexible matching)
      const targetSuite = integrationSuites.find(suite => 
        suite.name === suiteName || 
        suite.name.includes(suiteName) ||
        suiteName.includes(suite.name)
      );
      
      if (!targetSuite) {
        // Default to first available suite if specific not found
        if (integrationSuites.length > 0) {
          this.log(`⚠️  Suite '${suiteName}' not found, using: ${integrationSuites[0].name}`);
          const defaultSuite = integrationSuites[0];
          const jsPath = defaultSuite.path.replace(/\.ts$/, '.js');
          const suite = await import(jsPath);
          return suite.default || suite;
        }
        
        throw new Error(`No integration suites found. Expected: ${suiteName}`);
      }
      
      this.log(`📂 Loading integration suite: ${targetSuite.name} [${targetSuite.tier}] from ${targetSuite.path}`);
      
      // Convert .ts to .js for runtime import
      const jsPath = targetSuite.path.replace(/\.ts$/, '.js');
      const suite = await import(jsPath);
      return suite.default || suite;
      
    } catch (error) {
      throw new Error(`Failed to load integration suite ${suiteName}: ${(error as Error).message}`);
    }
  }

  /**
   * Run a single integration test (may involve backend switching)
   */
  private async runIntegrationTest(test: any): Promise<IntegrationTestResult> {
    const testStartTime = Date.now();
    
    try {
      this.log(`  🔄 ${test.name}...`);
      
      let testResult: IntegrationTestResult;
      
      if (test.type === 'switching') {
        testResult = await this.runBackendSwitchingTest(test);
      } else if (test.type === 'comparison') {
        testResult = await this.runBackendComparisonTest(test);
      } else if (test.type === 'isolation') {
        testResult = await this.runStateIsolationTest(test);
      } else {
        throw new Error(`Unknown integration test type: ${test.type}`);
      }
      
      testResult.duration = Date.now() - testStartTime;
      this.log(`    ${testResult.success ? '✅' : '❌'} ${test.name} (${testResult.duration}ms)`);
      
      return testResult;
      
    } catch (error) {
      const duration = Date.now() - testStartTime;
      this.log(`    ❌ ${test.name} (${duration}ms): ${(error as Error).message}`);
      
      return {
        testName: test.name,
        success: false,
        duration,
        backends: [],
        results: {},
        error: (error as Error).message
      };
    }
  }

  /**
   * Run a backend switching reliability test
   */
  private async runBackendSwitchingTest(test: any): Promise<IntegrationTestResult> {
    const results: { [backend: string]: any } = {};
    
    // Test multiple switches to ensure reliability
    const switchSequence: Backend[] = ['snarky', 'sparky', 'snarky', 'sparky'];
    
    for (const backend of switchSequence) {
      await this.switchToBackend(backend);
      const result = await test.testFn(backend);
      results[`${backend}_${this.backendSwitchCount}`] = result;
    }
    
    // Verify consistency - snarky results should be identical
    const snarkyResults = Object.entries(results)
      .filter(([key]) => key.startsWith('snarky'))
      .map(([, value]) => value);
    
    const snarkyConsistent = snarkyResults.length > 1 && 
      snarkyResults.every(result => JSON.stringify(result) === JSON.stringify(snarkyResults[0]));
    
    return {
      testName: test.name,
      success: snarkyConsistent,
      duration: 0, // Will be filled by caller
      backends: switchSequence,
      results,
      comparison: snarkyConsistent ? undefined : {
        match: false,
        snarkyResult: snarkyResults[0],
        sparkyResult: snarkyResults[1],
        difference: 'Snarky results inconsistent across switches'
      }
    };
  }

  /**
   * Run a direct backend comparison test
   */
  private async runBackendComparisonTest(test: any): Promise<IntegrationTestResult> {
    const results: { [backend: string]: any } = {};
    
    // Run with snarky backend
    await this.switchToBackend('snarky');
    const snarkyResult = await test.testFn('snarky');
    results.snarky = snarkyResult;
    
    // Run with sparky backend  
    await this.switchToBackend('sparky');
    const sparkyResult = await test.testFn('sparky');
    results.sparky = sparkyResult;
    
    // Compare results
    const comparison = this.compareResults(snarkyResult, sparkyResult, test.compareBy);
    
    return {
      testName: test.name,
      success: comparison.match,
      duration: 0, // Will be filled by caller
      backends: ['snarky', 'sparky'],
      results,
      comparison
    };
  }

  /**
   * Run a state isolation test
   */
  private async runStateIsolationTest(test: any): Promise<IntegrationTestResult> {
    const results: { [backend: string]: any } = {};
    
    // Run complex operation with snarky
    await this.switchToBackend('snarky');
    await test.setupFn('snarky'); // Setup complex state
    results.snarky_setup = 'completed';
    
    // Switch to sparky and run clean test
    await this.switchToBackend('sparky');
    const sparkyCleanResult = await test.testFn('sparky');
    results.sparky_clean = sparkyCleanResult;
    
    // Switch back to snarky and verify clean state
    await this.switchToBackend('snarky');
    const snarkyCleanResult = await test.testFn('snarky');
    results.snarky_clean = snarkyCleanResult;
    
    // Check if both backends give identical results (indicating clean state)
    const comparison = this.compareResults(snarkyCleanResult, sparkyCleanResult, test.compareBy);
    
    return {
      testName: test.name,
      success: comparison.match,
      duration: 0, // Will be filled by caller
      backends: ['snarky', 'sparky', 'snarky'],
      results,
      comparison
    };
  }

  /**
   * Switch to a specific backend and track switches
   */
  private async switchToBackend(backend: Backend): Promise<void> {
    const currentBackend = this.o1js.getCurrentBackend();
    if (currentBackend === backend) {
      return; // Already on correct backend
    }
    
    this.log(`    🔄 Switching: ${currentBackend} → ${backend}`);
    await this.o1js.switchBackend(backend);
    this.backendSwitchCount++;
    
    // Verify switch succeeded
    const newBackend = this.o1js.getCurrentBackend();
    if (newBackend !== backend) {
      throw new Error(`Backend switch failed: expected ${backend}, got ${newBackend}`);
    }
  }

  /**
   * Compare results from different backends
   */
  private compareResults(snarkyResult: any, sparkyResult: any, compareBy: string = 'value'): any {
    try {
      if (compareBy === 'value') {
        const match = JSON.stringify(snarkyResult) === JSON.stringify(sparkyResult);
        return {
          match,
          snarkyResult,
          sparkyResult,
          difference: match ? undefined : 'Values do not match'
        };
      } else if (compareBy === 'hash') {
        const match = snarkyResult.hash === sparkyResult.hash;
        return {
          match,
          snarkyResult: snarkyResult.hash,
          sparkyResult: sparkyResult.hash,
          difference: match ? undefined : `Hash mismatch: ${snarkyResult.hash} vs ${sparkyResult.hash}`
        };
      } else if (compareBy === 'constraints') {
        const match = snarkyResult.constraintCount === sparkyResult.constraintCount;
        return {
          match,
          snarkyResult: snarkyResult.constraintCount,
          sparkyResult: sparkyResult.constraintCount,
          difference: match ? undefined : `Constraint count: ${snarkyResult.constraintCount} vs ${sparkyResult.constraintCount}`
        };
      } else {
        throw new Error(`Unknown comparison method: ${compareBy}`);
      }
    } catch (error) {
      return {
        match: false,
        snarkyResult,
        sparkyResult,
        difference: `Comparison error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Handle memory exceeded
   */
  private handleMemoryExceeded(usage: any): void {
    this.sendErrorToOrchestrator({
      type: 'MEMORY_EXCEEDED',
      memoryUsageMB: usage.heapUsed / 1024 / 1024,
      memoryLimitMB: this.config.memoryLimitMB
    });
    process.exit(1);
  }

  /**
   * Handle timeout
   */
  private handleTimeout(): void {
    this.sendErrorToOrchestrator({
      type: 'TIMEOUT_EXCEEDED',
      timeoutMs: this.config.maxExecutionTimeMs,
      elapsedMs: this.getElapsedTime()
    });
    process.exit(1);
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(error: any): void {
    this.sendErrorToOrchestrator({
      type: 'WORKER_ERROR',
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    process.exit(1);
  }

  private sendProgressUpdate(suiteName: string, success: boolean): void {
    if (process.send) {
      process.send({
        type: 'PROGRESS_UPDATE',
        worker: 'integration',
        suiteName,
        success,
        backendSwitches: this.backendSwitchCount,
        timestamp: Date.now()
      });
    }
  }

  private sendFinalResults(results: IntegrationSuiteResult[]): void {
    if (process.send) {
      // Flatten suite results to test results for orchestrator
      const allTestResults = results.flatMap(suite => suite.results);
      
      process.send({
        type: 'result',
        success: results.every(r => r.success),
        results: allTestResults,
        memoryReport: this.memoryManager.getMemoryReport(),
        duration: this.getElapsedTime(),
        error: results.some(r => !r.success) ? 'Some integration tests failed' : undefined
      });
    }
  }

  private sendErrorToOrchestrator(error: any): void {
    if (process.send) {
      process.send({
        type: 'WORKER_ERROR',
        worker: 'integration',
        error,
        timestamp: Date.now()
      });
    }
  }

  private getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  private log(message: string, forceLog: boolean = false): void {
    if (this.config.verbose || forceLog) {
      console.log(`[INTEGRATION] ${message}`);
    }
  }
}

// Main entry point when run as a separate process
const isMainModule = argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const args = argv.slice(2);
  const config: IntegrationWorkerConfig = {
    suites: args[0] ? args[0].split(',') : ['switching-reliability'],
    memoryLimitMB: parseInt(args[1]) || 600,
    maxExecutionTimeMs: parseInt(args[2]) || 600000,
    verbose: args[3] === 'true'
  };

  const worker = new IntegrationWorker(config);
  worker.run().catch(error => {
    console.error(`Integration worker failed: ${error.message}`);
    process.exit(1);
  });
}

export { IntegrationWorker, IntegrationWorkerConfig, IntegrationTestResult, IntegrationSuiteResult };