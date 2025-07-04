#!/usr/bin/env node
/**
 * Sparky Parallel Test Runner - Main Entry Point
 * 
 * This is the main entry point for the new parallel testing infrastructure.
 * It can be called from package.json scripts or directly from the command line.
 */

import { ParallelTestRunner } from './orchestrator/ParallelTestRunner.js';
import { fileURLToPath } from 'url';
import { argv } from 'process';

interface RunnerOptions {
  tier?: 'smoke' | 'core' | 'comprehensive';
  processes?: number;
  mode?: 'parallel' | 'sequential';
  memoryLimit?: number;
  verbose?: boolean;
}

class SparkyTestCLI {
  /**
   * Main entry point
   */
  async run(options: RunnerOptions = {}): Promise<void> {
    try {
      // Set environment variables based on options
      this.setEnvironmentFromOptions(options);
      
      // Display banner
      this.displayBanner();
      
      // Create and run the parallel test runner
      const runner = new ParallelTestRunner();
      const results = await runner.runTests();
      
      // Exit with appropriate code
      process.exit(results.success ? 0 : 1);
      
    } catch (error) {
      console.error('❌ Test runner failed:', (error as Error).message);
      
      if ((error as Error).message.includes('Parallel test execution failed')) {
        console.error('');
        console.error('💡 Try debugging with sequential mode:');
        console.error('   SPARKY_TEST_MODE=sequential npm run test:sparky');
      }
      
      process.exit(1);
    }
  }

  /**
   * Set environment variables from CLI options
   */
  private setEnvironmentFromOptions(options: RunnerOptions): void {
    if (options.processes !== undefined) {
      process.env.SPARKY_TEST_PROCESSES = options.processes.toString();
    }
    
    if (options.mode) {
      process.env.SPARKY_TEST_MODE = options.mode;
    }
    
    if (options.memoryLimit) {
      process.env.SPARKY_TEST_MEMORY_LIMIT_MB = options.memoryLimit.toString();
    }
    
    if (options.verbose) {
      process.env.SPARKY_TEST_VERBOSE = 'true';
    }
    
    if (options.tier) {
      const tierMap = {
        smoke: 'smoke',
        core: 'smoke,core',
        comprehensive: 'smoke,core,comprehensive'
      };
      process.env.SPARKY_TEST_TIERS = tierMap[options.tier];
    }
  }

  /**
   * Display startup banner
   */
  private displayBanner(): void {
    console.log('🎯 SPARKY PARALLEL TESTING INFRASTRUCTURE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Backend-isolated parallel execution for 5x speedup');
    console.log('');
  }

  /**
   * Parse command line arguments
   */
  static parseArgs(args: string[]): RunnerOptions {
    const options: RunnerOptions = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--tier':
          options.tier = args[++i] as any;
          break;
        case '--processes':
          options.processes = parseInt(args[++i]);
          break;
        case '--mode':
          options.mode = args[++i] as any;
          break;
        case '--memory-limit':
          options.memoryLimit = parseInt(args[++i]);
          break;
        case '--verbose':
          options.verbose = true;
          break;
        case '--help':
          SparkyTestCLI.displayHelp();
          process.exit(0);
          break;
      }
    }
    
    return options;
  }

  /**
   * Display help information
   */
  static displayHelp(): void {
    console.log('🎯 Sparky Parallel Test Runner');
    console.log('');
    console.log('Usage:');
    console.log('  npm run test:sparky [options]');
    console.log('  node dist/test/sparky/run-parallel-tests.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --tier <smoke|core|comprehensive>  Test tier to run (default: core)');
    console.log('  --processes <number>               Number of parallel processes (default: 4)');
    console.log('  --mode <parallel|sequential>       Execution mode (default: parallel)');
    console.log('  --memory-limit <mb>                Memory limit per process (default: 600)');
    console.log('  --verbose                          Enable verbose output');
    console.log('  --help                             Show this help');
    console.log('');
    console.log('Environment Variables:');
    console.log('  SPARKY_TEST_PROCESSES=4            Number of parallel processes');
    console.log('  SPARKY_TEST_MODE=parallel          Execution mode');
    console.log('  SPARKY_TEST_TIERS=smoke,core       Test tiers to run');
    console.log('  SPARKY_TEST_MEMORY_LIMIT_MB=600    Memory limit per process');
    console.log('  SPARKY_TEST_VERBOSE=true           Enable verbose output');
    console.log('');
    console.log('Examples:');
    console.log('  npm run test:sparky                         # Default: 4 processes, core tier');
    console.log('  npm run test:sparky -- --tier smoke         # Quick smoke tests only');
    console.log('  npm run test:sparky -- --processes 8        # 8 parallel processes');
    console.log('  npm run test:sparky -- --mode sequential    # Sequential for debugging');
    console.log('  SPARKY_TEST_PROCESSES=2 npm run test:sparky # CI-friendly 2 processes');
    console.log('');
    console.log('Performance:');
    console.log('  Smoke:         ~30s  (basic health check)');
    console.log('  Core:          ~2min (VK parity focus)');
    console.log('  Comprehensive: ~10min (full test suite)');
  }
}

// Main execution when run directly
const isMainModule = argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const args = argv.slice(2);
  const options = SparkyTestCLI.parseArgs(args);
  
  const cli = new SparkyTestCLI();
  cli.run(options);
}

export { SparkyTestCLI, RunnerOptions };