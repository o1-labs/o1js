/**
 * Parallel Test Runner Orchestrator
 * 
 * Coordinates backend-isolated worker processes to achieve parallel execution:
 * - Spawns separate Node.js processes for each backend
 * - Manages process lifecycle and communication
 * - Aggregates results and provides unified reporting
 * - Handles failures and timeouts gracefully
 */

import { spawn, ChildProcess } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EnvironmentConfig, SparkyTestConfig } from './EnvironmentConfig.js';

type Backend = 'snarky' | 'sparky';

interface ProcessConfig {
  id: string;
  backend?: Backend;
  worker: 'backend-isolated' | 'integration';
  suites: string[];
  args: string[];
}

interface ProcessResult {
  processId: string;
  backend?: Backend;
  worker: string;
  success: boolean;
  results: any[];
  duration: number;
  memoryReport?: string;
  error?: string;
}

interface ProcessProgress {
  processId: string;
  backend?: Backend;
  currentSuite: string;
  completedSuites: number;
  totalSuites: number;
  success: boolean;
}

export class ParallelTestRunner {
  private config: SparkyTestConfig;
  private processes = new Map<string, ChildProcess>();
  private processResults = new Map<string, ProcessResult>();
  private processProgress = new Map<string, ProcessProgress>();
  private startTime: number = 0;

  constructor() {
    this.config = EnvironmentConfig.getConfig();
  }

  /**
   * Main entry point - run all tests based on configuration
   */
  async runTests(): Promise<{
    success: boolean;
    results: ProcessResult[];
    totalDuration: number;
    summary: any;
  }> {
    // Validate and display configuration
    EnvironmentConfig.validateAndLog();

    // Choose execution mode
    if (this.config.executionMode === 'sequential') {
      return this.runSequentialForDebugging();
    }

    return this.runParallelBackendIsolated();
  }

  /**
   * Run tests in parallel with backend isolation
   */
  private async runParallelBackendIsolated(): Promise<any> {
    this.startTime = Date.now();
    
    console.log('🚀 Starting parallel backend-isolated testing...');
    console.log('');

    try {
      // Create process configurations
      const processConfigs = await this.createProcessConfigurations();
      
      // Spawn all processes
      const processPromises = processConfigs.map(config => 
        this.spawnWorkerProcess(config)
      );

      // Start real-time progress monitoring
      this.startProgressMonitoring();

      // Wait for all processes to complete
      const results = await Promise.all(processPromises);

      // Aggregate and report results
      return this.aggregateResults(results);

    } catch (error) {
      console.error('❌ Parallel test execution failed:', (error as Error).message);
      
      // Kill any remaining processes
      this.killAllProcesses();
      
      throw new Error(
        `Parallel test execution failed: ${(error as Error).message}\n` +
        `To debug: SPARKY_TEST_MODE=sequential npm run test:sparky`
      );
    }
  }

  /**
   * Create process configurations based on environment settings
   */
  private async createProcessConfigurations(): Promise<ProcessConfig[]> {
    const configs: ProcessConfig[] = [];
    const processCount = this.config.processCount;
    
    // Backend-isolated processes (split by backend)
    const snarkyProcesses = Math.ceil(processCount / 2);
    const sparkyProcesses = Math.floor(processCount / 2);

    // Create snarky processes
    for (let i = 0; i < snarkyProcesses; i++) {
      const suites = await this.distributeSuitesForBackend('snarky', i, snarkyProcesses);
      configs.push({
        id: `snarky-${i + 1}`,
        backend: 'snarky',
        worker: 'backend-isolated',
        suites,
        args: [
          'snarky',
          suites.join(','),
          this.config.memoryLimitMB.toString(),
          this.config.maxExecutionTimeMs.toString(),
          EnvironmentConfig.getVerbose().toString()
        ]
      });
    }

    // Create sparky processes
    for (let i = 0; i < sparkyProcesses; i++) {
      const suites = await this.distributeSuitesForBackend('sparky', i, sparkyProcesses);
      configs.push({
        id: `sparky-${i + 1}`,
        backend: 'sparky',
        worker: 'backend-isolated',
        suites,
        args: [
          'sparky',
          suites.join(','),
          this.config.memoryLimitMB.toString(),
          this.config.maxExecutionTimeMs.toString(),
          EnvironmentConfig.getVerbose().toString()
        ]
      });
    }

    // Add integration process if needed
    if (this.needsIntegrationTests()) {
      configs.push({
        id: 'integration',
        worker: 'integration',
        suites: ['switching-reliability', 'state-isolation', 'parity-comparison'],
        args: [
          'switching-reliability,state-isolation,parity-comparison',
          this.config.memoryLimitMB.toString(),
          this.config.maxExecutionTimeMs.toString(),
          EnvironmentConfig.getVerbose().toString()
        ]
      });
    }

    return configs;
  }

  /**
   * Distribute test suites for a specific backend across processes using automatic discovery
   */
  private async distributeSuitesForBackend(backend: Backend, processIndex: number, totalProcesses: number): Promise<string[]> {
    try {
      // Import test discovery
      const { TestDiscovery } = await import('../shared/TestDiscovery.js');
      const discovery = new TestDiscovery();

      // Get all suites for this backend
      const backendSuites = discovery.discoverBackendSuites(backend);
      
      // Filter by enabled tiers
      const filteredSuites = backendSuites.filter(suite => 
        this.config.testTiers.some(tier => 
          suite.tier === tier || 
          (tier === 'core' && suite.tier === 'smoke') ||
          (tier === 'comprehensive')
        )
      );

      if (filteredSuites.length === 0) {
        console.warn(`⚠️  No ${backend} suites found for tiers: ${this.config.testTiers.join(', ')}`);
        return [];
      }

      // Distribute across processes
      const suitesPerProcess = Math.ceil(filteredSuites.length / totalProcesses);
      const startIndex = processIndex * suitesPerProcess;
      const endIndex = Math.min(startIndex + suitesPerProcess, filteredSuites.length);

      const assignedSuites = filteredSuites.slice(startIndex, endIndex);
      
      // Return suite names for the worker
      return assignedSuites.map(suite => suite.name);
      
    } catch (error) {
      console.error(`❌ Failed to discover ${backend} suites: ${(error as Error).message}`);
      // Fallback to basic smoke test
      return ['simple-smoke'];
    }
  }

  /**
   * Check if integration tests are needed
   */
  private needsIntegrationTests(): boolean {
    // Only run integration tests for comprehensive tier or when explicitly requested
    return this.config.testTiers.includes('comprehensive') || 
           process.env.SPARKY_TEST_INCLUDE_INTEGRATION === 'true';
  }

  /**
   * Spawn a worker process
   */
  private async spawnWorkerProcess(config: ProcessConfig): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      // ES module equivalent of __dirname
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const workerPath = join(__dirname, '..', 'workers', `${config.worker}-worker.js`);
      
      console.log(`🔧 Spawning ${config.id}: ${config.worker} (${config.suites.join(', ')})`);
      
      const childProcess = spawn('node', [
        '--experimental-vm-modules',
        workerPath,
        ...config.args
      ], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: { ...process.env }
      });

      this.processes.set(config.id, childProcess);

      // Track process progress
      this.processProgress.set(config.id, {
        processId: config.id,
        backend: config.backend,
        currentSuite: config.suites[0] || 'unknown',
        completedSuites: 0,
        totalSuites: config.suites.length,
        success: false
      });

      // Handle process messages
      childProcess.on('message', (message: any) => {
        this.handleProcessMessage(config.id, message);
      });

      // Handle process completion
      childProcess.on('close', (code) => {
        const result = this.processResults.get(config.id);
        if (result) {
          resolve(result);
        } else {
          // Process exited without sending results
          resolve({
            processId: config.id,
            backend: config.backend,
            worker: config.worker,
            success: false,
            results: [],
            duration: 0,
            error: `Process exited with code ${code} without sending results`
          });
        }
      });

      // Handle process errors
      childProcess.on('error', (error) => {
        reject(new Error(`Process ${config.id} failed: ${error.message}`));
      });

      // Set up process timeout
      setTimeout(() => {
        if (this.processes.has(config.id)) {
          childProcess.kill('SIGTERM');
          reject(new Error(`Process ${config.id} timed out`));
        }
      }, this.config.maxExecutionTimeMs + 30000); // 30s grace period
    });
  }

  /**
   * Handle messages from worker processes
   */
  private handleProcessMessage(processId: string, message: any): void {
    switch (message.type) {
      case 'PROGRESS_UPDATE':
        this.updateProcessProgress(processId, message);
        break;

      case 'result':
        this.processResults.set(processId, {
          processId,
          backend: message.backend,
          worker: message.worker || (message.backend ? 'backend-isolated' : 'integration'),
          success: message.success,
          results: message.results,
          duration: message.duration,
          memoryReport: message.memoryReport,
          error: message.error
        });
        break;

      case 'WORKER_ERROR':
        this.processResults.set(processId, {
          processId,
          backend: message.backend,
          worker: message.worker || 'unknown',
          success: false,
          results: [],
          duration: 0,
          error: JSON.stringify(message.error)
        });
        break;
    }
  }

  /**
   * Update process progress tracking
   */
  private updateProcessProgress(processId: string, message: any): void {
    const progress = this.processProgress.get(processId);
    if (progress) {
      progress.currentSuite = message.suiteName;
      progress.completedSuites += 1;
      progress.success = message.success;
      this.processProgress.set(processId, progress);
    }
  }

  /**
   * Start real-time progress monitoring
   */
  private startProgressMonitoring(): void {
    const progressInterval = setInterval(() => {
      this.displayProgressUpdate();
    }, 5000); // Update every 5 seconds

    // Stop monitoring when all processes complete
    const checkCompletion = setInterval(() => {
      if (this.processResults.size >= this.processes.size) {
        clearInterval(progressInterval);
        clearInterval(checkCompletion);
      }
    }, 1000);
  }

  /**
   * Display real-time progress update
   */
  private displayProgressUpdate(): void {
    console.clear();
    console.log('🎯 SPARKY PARALLEL TESTING IN PROGRESS...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    this.processProgress.forEach((progress) => {
      const progressBar = '█'.repeat(Math.floor((progress.completedSuites / progress.totalSuites) * 20));
      const emptyBar = '░'.repeat(20 - progressBar.length);
      const percentage = Math.floor((progress.completedSuites / progress.totalSuites) * 100);
      
      const statusIcon = progress.success ? '✅' : '⏳';
      const backendLabel = progress.backend ? ` (${progress.backend})` : '';
      
      console.log(`${statusIcon} ${progress.processId}${backendLabel}: [${progressBar}${emptyBar}] ${percentage}%`);
      console.log(`   Current: ${progress.currentSuite} | Completed: ${progress.completedSuites}/${progress.totalSuites}`);
      console.log('');
    });

    const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
    console.log(`⏱️  Elapsed: ${elapsedTime}s | Processes: ${this.processResults.size}/${this.processes.size} completed`);
  }

  /**
   * Aggregate results from all processes
   */
  private aggregateResults(results: ProcessResult[]): any {
    const totalDuration = Date.now() - this.startTime;
    const success = results.every(r => r.success);
    
    // Clear final progress display
    console.clear();
    
    // Generate summary
    const summary = this.generateTestSummary(results, totalDuration);
    
    // Display results
    this.displayFinalResults(results, summary);

    return {
      success,
      results,
      totalDuration,
      summary
    };
  }

  /**
   * Generate test summary
   */
  private generateTestSummary(results: ProcessResult[], totalDuration: number): any {
    const summary = {
      totalDuration,
      processCount: results.length,
      successfulProcesses: results.filter(r => r.success).length,
      failedProcesses: results.filter(r => !r.success).length,
      backends: {
        snarky: results.filter(r => r.backend === 'snarky'),
        sparky: results.filter(r => r.backend === 'sparky'),
        integration: results.filter(r => !r.backend)
      },
      totalTests: results.reduce((sum, r) => sum + r.results.length, 0),
      passedTests: results.reduce((sum, r) => sum + r.results.filter((t: any) => t.success).length, 0)
    };

    const summaryCopy = { ...summary, failedTests: summary.totalTests - summary.passedTests };
    
    return summaryCopy;
  }

  /**
   * Display final results
   */
  private displayFinalResults(results: ProcessResult[], summary: any): void {
    console.log('🎯 SPARKY PARALLEL TESTING COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Overall status
    const statusIcon = summary.failedProcesses === 0 ? '✅' : '❌';
    console.log(`${statusIcon} Overall Status: ${summary.successfulProcesses}/${summary.processCount} processes successful`);
    console.log(`⏱️  Total Duration: ${(summary.totalDuration / 1000).toFixed(1)}s`);
    console.log(`🧪 Tests: ${summary.passedTests}/${summary.totalTests} passed`);
    console.log('');

    // Backend results
    console.log('📊 BACKEND RESULTS:');
    if (summary.backends.snarky.length > 0) {
      const snarkySuccess = summary.backends.snarky.every((r: ProcessResult) => r.success);
      console.log(`  ${snarkySuccess ? '✅' : '❌'} Snarky: ${summary.backends.snarky.length} processes`);
    }
    if (summary.backends.sparky.length > 0) {
      const sparkySuccess = summary.backends.sparky.every((r: ProcessResult) => r.success);
      console.log(`  ${sparkySuccess ? '✅' : '❌'} Sparky: ${summary.backends.sparky.length} processes`);
    }
    if (summary.backends.integration.length > 0) {
      const integrationSuccess = summary.backends.integration.every((r: ProcessResult) => r.success);
      console.log(`  ${integrationSuccess ? '✅' : '❌'} Integration: ${summary.backends.integration.length} processes`);
    }
    console.log('');

    // Failed processes details
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0) {
      console.log('❌ FAILED PROCESSES:');
      failedResults.forEach(result => {
        console.log(`  • ${result.processId}: ${result.error || 'Unknown error'}`);
      });
      console.log('');
    }

    // Memory reports
    const memoryReports = results.filter(r => r.memoryReport);
    if (memoryReports.length > 0) {
      console.log('🧠 MEMORY USAGE:');
      memoryReports.forEach(result => {
        console.log(`  ${result.processId}:`);
        console.log(`    ${result.memoryReport?.split('\n')[2] || 'No memory data'}`); // Current usage line
      });
      console.log('');
    }

    // Performance comparison (if both backends ran)
    const snarkyDuration = summary.backends.snarky.reduce((sum: number, r: ProcessResult) => sum + r.duration, 0);
    const sparkyDuration = summary.backends.sparky.reduce((sum: number, r: ProcessResult) => sum + r.duration, 0);
    
    if (snarkyDuration > 0 && sparkyDuration > 0) {
      const ratio = sparkyDuration / snarkyDuration;
      console.log('⚡ PERFORMANCE COMPARISON:');
      console.log(`  Snarky: ${(snarkyDuration / 1000).toFixed(1)}s`);
      console.log(`  Sparky: ${(sparkyDuration / 1000).toFixed(1)}s`);
      console.log(`  Ratio: ${ratio.toFixed(2)}x ${ratio > 1 ? '(sparky slower)' : '(sparky faster)'}`);
      console.log('');
    }
  }

  /**
   * Run sequential execution for debugging
   */
  private async runSequentialForDebugging(): Promise<any> {
    console.log('🐛 Running in sequential mode for debugging...');
    console.log('This mode disables parallel execution to help debug issues.');
    console.log('');

    this.startTime = Date.now();
    const results: ProcessResult[] = [];

    try {
      // Create process configurations
      const processConfigs = await this.createProcessConfigurations();
      
      console.log(`📋 Will run ${processConfigs.length} processes sequentially:`);
      processConfigs.forEach(config => {
        console.log(`  • ${config.id}: ${config.suites.join(', ')}`);
      });
      console.log('');

      // Run each process sequentially
      for (const config of processConfigs) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🚀 Starting ${config.id} (${config.worker})`);
        console.log(`📦 Suites: ${config.suites.join(', ')}`);
        console.log(`${'='.repeat(60)}\n`);

        try {
          const result = await this.spawnWorkerProcessWithOutput(config);
          results.push(result);
          
          const icon = result.success ? '✅' : '❌';
          console.log(`\n${icon} Process ${config.id} completed`);
          console.log(`⏱️  Duration: ${(result.duration / 1000).toFixed(1)}s`);
          console.log(`🧪 Tests: ${result.results.filter((r: any) => r.success).length}/${result.results.length} passed`);
          
          if (!result.success && result.error) {
            console.log(`❌ Error: ${result.error}`);
          }
        } catch (error) {
          const errorResult: ProcessResult = {
            processId: config.id,
            backend: config.backend,
            worker: config.worker,
            success: false,
            results: [],
            duration: Date.now() - this.startTime,
            error: (error as Error).message
          };
          results.push(errorResult);
          
          console.log(`\n❌ Process ${config.id} failed: ${(error as Error).message}`);
        }
      }

      // Generate summary
      const totalDuration = Date.now() - this.startTime;
      const summary = this.generateTestSummary(results, totalDuration);
      
      console.log(`\n${'='.repeat(60)}`);
      this.displayFinalResults(results, summary);

      return {
        success: summary.failedProcesses === 0,
        results,
        totalDuration,
        summary
      };

    } catch (error) {
      console.error(`\n❌ Sequential test runner failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Spawn a worker process with full output for debugging
   */
  private async spawnWorkerProcessWithOutput(config: ProcessConfig): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      // ES module equivalent of __dirname
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const workerPath = join(__dirname, '..', 'workers', `${config.worker}-worker.js`);
      
      console.log(`🔧 Worker path: ${workerPath}`);
      console.log(`🔧 Args: ${config.args.join(' ')}`);
      
      const childProcess = spawn('node', [
        '--experimental-vm-modules',
        workerPath,
        ...config.args
      ], {
        stdio: ['pipe', 'inherit', 'inherit', 'ipc'], // inherit stdout/stderr for debugging
        env: { ...process.env }
      });

      this.processes.set(config.id, childProcess);

      let processResult: ProcessResult | null = null;

      // Handle process messages
      childProcess.on('message', (message: any) => {
        if (message.type === 'progress') {
          console.log(`📊 Progress: ${message.completedSuites}/${message.totalSuites} suites`);
        } else if (message.type === 'suite-complete') {
          console.log(`✅ Suite complete: ${message.suiteName} (${message.duration}ms)`);
        } else if (message.type === 'result') {
          processResult = {
            processId: config.id,
            backend: config.backend,
            worker: config.worker,
            success: message.success,
            results: message.results,
            duration: message.duration,
            memoryReport: message.memoryReport,
            error: message.error
          };
        }
      });

      // Handle process completion
      childProcess.on('close', (code) => {
        this.processes.delete(config.id);
        
        if (processResult) {
          resolve(processResult);
        } else {
          // Process exited without sending results
          resolve({
            processId: config.id,
            backend: config.backend,
            worker: config.worker,
            success: false,
            results: [],
            duration: Date.now() - this.startTime,
            error: `Process exited with code ${code} without sending results`
          });
        }
      });

      // Handle process errors
      childProcess.on('error', (error) => {
        this.processes.delete(config.id);
        reject(new Error(`Process ${config.id} failed to start: ${error.message}`));
      });

      // Set up process timeout
      setTimeout(() => {
        if (this.processes.has(config.id)) {
          console.log(`⏱️  Process ${config.id} timed out after ${this.config.maxExecutionTimeMs}ms`);
          childProcess.kill('SIGTERM');
          reject(new Error(`Process ${config.id} timed out`));
        }
      }, this.config.maxExecutionTimeMs + 30000); // 30s grace period
    });
  }

  /**
   * Kill all running processes
   */
  private killAllProcesses(): void {
    this.processes.forEach((process, id) => {
      if (!process.killed) {
        console.log(`🔪 Killing process ${id}`);
        process.kill('SIGTERM');
      }
    });
  }
}