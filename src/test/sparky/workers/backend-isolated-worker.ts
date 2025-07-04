#!/usr/bin/env node
/**
 * Backend-Isolated Worker Process
 * 
 * This worker process runs in complete backend isolation:
 * - Sets backend ONCE at startup, never switches
 * - Runs multiple test suites with the same backend
 * - Aggressive memory management with fast failure
 * - Communicates results back to orchestrator via IPC
 */

import { MemoryManager } from '../shared/MemoryManager.js';
import { fileURLToPath } from 'url';
import { argv } from 'process';

// Backend type definition
type Backend = 'snarky' | 'sparky';

interface WorkerConfig {
  backend: Backend;
  suites: string[];
  memoryLimitMB: number;
  maxExecutionTimeMs: number;
  verbose: boolean;
}

interface TestResult {
  suiteName: string;
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  memoryUsage?: number;
}

interface SuiteResult {
  suiteName: string;
  backend: Backend;
  results: TestResult[];
  totalDuration: number;
  memoryStats: any;
  success: boolean;
}

class BackendIsolatedWorker {
  private config: WorkerConfig;
  private memoryManager: MemoryManager;
  private backendInitialized = false;
  private startTime: number;

  constructor(config: WorkerConfig) {
    this.config = config;
    this.startTime = Date.now();
    
    // Setup aggressive memory management
    this.memoryManager = new MemoryManager(
      config.memoryLimitMB,
      true, // aggressive mode
      (usage) => this.handleMemoryExceeded(usage)
    );

    // Setup process-level timeouts
    setTimeout(() => {
      this.handleTimeout();
    }, config.maxExecutionTimeMs);

    // Start memory monitoring immediately
    this.memoryManager.startMonitoring();
  }

  /**
   * Main entry point - run all assigned test suites
   */
  async run(): Promise<void> {
    try {
      this.log(`🚀 Backend-isolated worker starting: ${this.config.backend}`, true);
      this.log(`📋 Assigned suites: ${this.config.suites.join(', ') || '(none)'}`, true);
      
      // Check if we have any suites to run
      if (this.config.suites.length === 0) {
        this.log('⚠️  No test suites assigned to this worker', true);
        this.sendFinalResults([]);
        process.exit(0);
        return;
      }
      
      // Initialize backend ONCE at startup
      await this.initializeBackend();
      
      // Run all assigned test suites
      const results: SuiteResult[] = [];
      for (const suiteName of this.config.suites) {
        const suiteResult = await this.runTestSuite(suiteName);
        results.push(suiteResult);
        
        // Send progress update to orchestrator
        this.sendProgressUpdate(suiteName, suiteResult.success);
      }

      // Send final results to orchestrator
      this.sendFinalResults(results);
      
      this.log(`✅ Worker completed successfully in ${this.getElapsedTime()}ms`);
      process.exit(0);
      
    } catch (error) {
      this.handleWorkerError(error);
    }
  }

  /**
   * Initialize backend ONCE - never switch after this
   */
  private async initializeBackend(): Promise<void> {
    try {
      this.log(`🔧 Initializing ${this.config.backend} backend with real o1js...`);
      
      // Import o1js and switch to the target backend
      const o1jsModule = await import('../../../index.js');
      
      // Switch to the target backend ONCE
      await o1jsModule.switchBackend(this.config.backend);
      const currentBackend = o1jsModule.getCurrentBackend();
      
      if (currentBackend !== this.config.backend) {
        throw new Error(`Backend switch failed: expected ${this.config.backend}, got ${currentBackend}`);
      }
      
      // Store o1js reference for tests
      (global as any).o1js = o1jsModule;
      
      this.backendInitialized = true;
      this.log(`✅ Real backend initialized: ${currentBackend}`);
      
    } catch (error) {
      throw new Error(`Failed to initialize ${this.config.backend} backend: ${(error as Error).message}`);
    }
  }

  /**
   * Run a single test suite
   */
  private async runTestSuite(suiteName: string): Promise<SuiteResult> {
    const suiteStartTime = Date.now();
    this.log(`📝 Running suite: ${suiteName}`);
    
    try {
      // Load the test suite dynamically
      const suite = await this.loadTestSuite(suiteName);
      const results: TestResult[] = [];
      
      // Run each test in the suite
      for (const test of suite.tests) {
        const testResult = await this.runSingleTest(test);
        results.push(testResult);
        
        // Check memory after each test
        this.memoryManager.checkMemoryUsage();
      }
      
      const totalDuration = Date.now() - suiteStartTime;
      const success = results.every(r => r.success);
      
      return {
        suiteName,
        backend: this.config.backend,
        results,
        totalDuration,
        memoryStats: this.memoryManager.getMemoryStats(),
        success
      };
      
    } catch (error) {
      return {
        suiteName,
        backend: this.config.backend,
        results: [],
        totalDuration: Date.now() - suiteStartTime,
        memoryStats: this.memoryManager.getMemoryStats(),
        success: false
      };
    }
  }

  /**
   * Load a test suite dynamically using automatic discovery
   */
  private async loadTestSuite(suiteName: string): Promise<any> {
    try {
      // Import test discovery
      const { TestDiscovery } = await import('../shared/TestDiscovery.js');
      const discovery = new TestDiscovery();
      
      // Discover all suites for this backend
      const backendSuites = discovery.discoverBackendSuites(this.config.backend);
      
      // Find the requested suite
      const targetSuite = backendSuites.find(suite => 
        suite.name === suiteName || 
        suite.name.includes(suiteName) ||
        suiteName.includes(suite.name)
      );
      
      if (!targetSuite) {
        throw new Error(`Test suite '${suiteName}' not found. Available: ${backendSuites.map(s => s.name).join(', ')}`);
      }
      
      this.log(`📂 Loading suite: ${targetSuite.name} [${targetSuite.tier}] from ${targetSuite.path}`);
      
      // Convert .ts to .js for runtime import
      const jsPath = targetSuite.path.replace(/\.ts$/, '.js');
      const suite = await import(jsPath);
      return suite.default || suite;
      
    } catch (error) {
      throw new Error(`Failed to load test suite ${suiteName}: ${(error as Error).message}`);
    }
  }

  /**
   * Run a single test
   */
  private async runSingleTest(test: any): Promise<TestResult> {
    const testStartTime = Date.now();
    
    try {
      this.log(`  🧪 ${test.name}...`);
      
      // Record memory before test
      const memoryBefore = this.memoryManager.checkMemoryUsage();
      
      // Run the test function
      await test.testFn();
      
      // Record memory after test
      const memoryAfter = this.memoryManager.checkMemoryUsage();
      const memoryDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;
      
      const duration = Date.now() - testStartTime;
      this.log(`    ✅ ${test.name} (${duration}ms)`);
      
      return {
        suiteName: '', // Will be filled by caller
        testName: test.name,
        success: true,
        duration,
        memoryUsage: memoryDelta
      };
      
    } catch (error) {
      const duration = Date.now() - testStartTime;
      this.log(`    ❌ ${test.name} (${duration}ms): ${(error as Error).message}`);
      
      return {
        suiteName: '', // Will be filled by caller
        testName: test.name,
        success: false,
        duration,
        error: (error as Error).message
      };
    }
  }

  /**
   * Handle memory limit exceeded
   */
  private handleMemoryExceeded(usage: any): void {
    const memoryMB = usage.heapUsed / 1024 / 1024;
    
    this.sendErrorToOrchestrator({
      type: 'MEMORY_EXCEEDED',
      backend: this.config.backend,
      memoryUsageMB: memoryMB,
      memoryLimitMB: this.config.memoryLimitMB,
      suggestion: `Consider increasing memory limit: SPARKY_TEST_MEMORY_LIMIT_MB=${this.config.memoryLimitMB + 200}`
    });
    
    process.exit(1);
  }

  /**
   * Handle process timeout
   */
  private handleTimeout(): void {
    this.sendErrorToOrchestrator({
      type: 'TIMEOUT_EXCEEDED',
      backend: this.config.backend,
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
      backend: this.config.backend,
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    
    process.exit(1);
  }

  /**
   * Send progress update to orchestrator
   */
  private sendProgressUpdate(suiteName: string, success: boolean): void {
    if (process.send) {
      process.send({
        type: 'PROGRESS_UPDATE',
        backend: this.config.backend,
        suiteName,
        success,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Send final results to orchestrator
   */
  private sendFinalResults(results: SuiteResult[]): void {
    if (process.send) {
      // Flatten suite results to test results for orchestrator
      const allTestResults = results.flatMap(suite => suite.results);
      
      process.send({
        type: 'result',
        success: results.every(r => r.success),
        results: allTestResults,
        memoryReport: this.memoryManager.getMemoryReport(),
        duration: this.getElapsedTime(),
        error: results.some(r => !r.success) ? 'Some tests failed' : undefined
      });
    }
  }

  /**
   * Send error to orchestrator
   */
  private sendErrorToOrchestrator(error: any): void {
    if (process.send) {
      process.send({
        type: 'WORKER_ERROR',
        backend: this.config.backend,
        error,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get elapsed time since worker start
   */
  private getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Log with backend prefix
   */
  private log(message: string, forceLog: boolean = false): void {
    if (this.config.verbose || forceLog) {
      console.log(`[${this.config.backend.toUpperCase()}] ${message}`);
    }
  }
}

// Main entry point when run as a separate process
// Main execution when run directly
const isMainModule = argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  // Parse command line arguments
  const args = argv.slice(2);
  const config: WorkerConfig = {
    backend: (args[0] as Backend) || 'snarky',
    suites: args[1] && args[1].trim() ? args[1].split(',').filter(s => s.trim()) : ['smoke'],
    memoryLimitMB: parseInt(args[2]) || 600,
    maxExecutionTimeMs: parseInt(args[3]) || 600000,
    verbose: args[4] === 'true'
  };

  // Create and run worker
  const worker = new BackendIsolatedWorker(config);
  worker.run().catch(error => {
    console.error(`Worker failed: ${error.message}`);
    process.exit(1);
  });
}

export { BackendIsolatedWorker, WorkerConfig, TestResult, SuiteResult };