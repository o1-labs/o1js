/**
 * Environment Configuration for Sparky Parallel Testing Infrastructure
 * 
 * Handles all environment variable configuration for:
 * - Process count control (CI-friendly)
 * - Execution mode (parallel vs sequential for debugging)
 * - Memory management settings
 * - Test tier selection
 */

export interface SparkyTestConfig {
  processCount: number;
  executionMode: 'parallel' | 'sequential';
  aggressiveMemory: boolean;
  memoryLimitMB: number;
  comprehensiveMemoryLimitMB: number;
  testTiers: string[];
  maxExecutionTimeMs: number;
  comprehensiveTimeoutMs: number;
}

export class EnvironmentConfig {
  /**
   * Get the number of parallel processes to spawn
   * Default: 4 processes (good for dev machines)
   * CI can override: SPARKY_TEST_PROCESSES=2
   */
  static getProcessCount(): number {
    const envValue = process.env.SPARKY_TEST_PROCESSES;
    if (envValue) {
      const parsed = parseInt(envValue, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 16) {
        throw new Error(`Invalid SPARKY_TEST_PROCESSES: ${envValue}. Must be 1-16.`);
      }
      return parsed;
    }
    return 4; // Default: 4 processes
  }

  /**
   * Get execution mode (parallel vs sequential)
   * Default: parallel
   * Debug mode: SPARKY_TEST_MODE=sequential
   */
  static getExecutionMode(): 'parallel' | 'sequential' {
    const mode = process.env.SPARKY_TEST_MODE;
    if (mode === 'sequential') {
      return 'sequential';
    }
    if (mode && mode !== 'parallel') {
      throw new Error(`Invalid SPARKY_TEST_MODE: ${mode}. Must be 'parallel' or 'sequential'.`);
    }
    return 'parallel';
  }

  /**
   * Get aggressive memory management setting
   * Default: true (fail fast on memory issues)
   * Conservative: SPARKY_TEST_AGGRESSIVE_MEMORY=false
   */
  static getAggressiveMemory(): boolean {
    const value = process.env.SPARKY_TEST_AGGRESSIVE_MEMORY;
    if (value === 'false') {
      return false;
    }
    return true; // Default: aggressive
  }

  /**
   * Get memory limit per process in MB
   * Default: 600MB per process (aggressive but safe)
   * Conservative: SPARKY_TEST_MEMORY_LIMIT_MB=1000
   */
  static getMemoryLimitMB(): number {
    const envValue = process.env.SPARKY_TEST_MEMORY_LIMIT_MB;
    if (envValue) {
      const parsed = parseInt(envValue, 10);
      if (isNaN(parsed) || parsed < 100 || parsed > 8000) {
        throw new Error(`Invalid SPARKY_TEST_MEMORY_LIMIT_MB: ${envValue}. Must be 100-8000.`);
      }
      return parsed;
    }
    return 600; // Default: 600MB per process
  }

  /**
   * Get memory limit for comprehensive tests (circuit compilation)
   * These tests require significantly more memory
   */
  static getComprehensiveMemoryLimitMB(): number {
    const envValue = process.env.SPARKY_COMPREHENSIVE_MEMORY_LIMIT_MB;
    if (envValue) {
      const parsed = parseInt(envValue, 10);
      if (isNaN(parsed) || parsed < 1000 || parsed > 8000) {
        throw new Error(`Invalid SPARKY_COMPREHENSIVE_MEMORY_LIMIT_MB: ${envValue}. Must be 1000-8000.`);
      }
      return parsed;
    }
    return 3000; // Default: 3GB for circuit compilation
  }

  /**
   * Get test tiers to run
   * Default: ['smoke', 'core'] for development
   * CI: SPARKY_TEST_TIERS=smoke,core,comprehensive
   */
  static getTestTiers(): string[] {
    const envValue = process.env.SPARKY_TEST_TIERS;
    if (envValue) {
      const tiers = envValue.split(',').map(t => t.trim());
      const validTiers = ['smoke', 'core', 'comprehensive'];
      for (const tier of tiers) {
        if (!validTiers.includes(tier)) {
          throw new Error(`Invalid test tier: ${tier}. Valid: ${validTiers.join(', ')}`);
        }
      }
      return tiers;
    }
    return ['smoke', 'core']; // Default: fast feedback for development
  }

  /**
   * Get maximum execution time per process in milliseconds
   * Default: 10 minutes per process
   * CI: SPARKY_TEST_MAX_TIME_MS=600000 (10 minutes)
   */
  static getMaxExecutionTimeMs(): number {
    const envValue = process.env.SPARKY_TEST_MAX_TIME_MS;
    if (envValue) {
      const parsed = parseInt(envValue, 10);
      if (isNaN(parsed) || parsed < 30000 || parsed > 3600000) {
        throw new Error(`Invalid SPARKY_TEST_MAX_TIME_MS: ${envValue}. Must be 30000-3600000 (30s-1h).`);
      }
      return parsed;
    }
    return 600000; // Default: 10 minutes
  }

  /**
   * Get timeout for comprehensive tests (circuit compilation)
   * These tests can take much longer due to compilation
   */
  static getComprehensiveTimeoutMs(): number {
    const envValue = process.env.SPARKY_COMPREHENSIVE_TIMEOUT_MS;
    if (envValue) {
      const parsed = parseInt(envValue, 10);
      if (isNaN(parsed) || parsed < 120000 || parsed > 1800000) {
        throw new Error(`Invalid SPARKY_COMPREHENSIVE_TIMEOUT_MS: ${envValue}. Must be 120000-1800000 (2min-30min).`);
      }
      return parsed;
    }
    return 900000; // Default: 15 minutes for circuit compilation
  }

  /**
   * Get verbose logging setting
   * Default: false (concise output)
   * Debug: SPARKY_TEST_VERBOSE=true
   */
  static getVerbose(): boolean {
    return process.env.SPARKY_TEST_VERBOSE === 'true';
  }

  /**
   * Get complete configuration object
   */
  static getConfig(): SparkyTestConfig {
    return {
      processCount: this.getProcessCount(),
      executionMode: this.getExecutionMode(),
      aggressiveMemory: this.getAggressiveMemory(),
      memoryLimitMB: this.getMemoryLimitMB(),
      comprehensiveMemoryLimitMB: this.getComprehensiveMemoryLimitMB(),
      testTiers: this.getTestTiers(),
      maxExecutionTimeMs: this.getMaxExecutionTimeMs(),
      comprehensiveTimeoutMs: this.getComprehensiveTimeoutMs()
    };
  }

  /**
   * Validate configuration and display current settings
   */
  static validateAndLog(): void {
    const config = this.getConfig();
    
    console.log('🎯 SPARKY PARALLEL TEST CONFIGURATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Processes: ${config.processCount}`);
    console.log(`Mode: ${config.executionMode}`);
    console.log(`Memory Limit: ${config.memoryLimitMB}MB per process`);
    console.log(`Test Tiers: ${config.testTiers.join(', ')}`);
    console.log(`Max Time: ${config.maxExecutionTimeMs / 1000}s per process`);
    console.log(`Aggressive Memory: ${config.aggressiveMemory}`);
    console.log('');

    // Validate CI-friendly settings
    if (config.processCount > 8) {
      console.warn(`⚠️  High process count (${config.processCount}) may overwhelm CI systems`);
    }

    const totalMemoryGB = (config.processCount * config.memoryLimitMB) / 1024;
    if (totalMemoryGB > 4) {
      console.warn(`⚠️  High total memory usage (~${totalMemoryGB.toFixed(1)}GB) may overwhelm CI systems`);
    }

    if (config.executionMode === 'sequential') {
      console.log('🐛 Sequential mode enabled - parallel execution disabled for debugging');
    }
  }

  /**
   * Get optimal configuration for CI environments
   */
  static getCIOptimizedConfig(): SparkyTestConfig {
    return {
      processCount: 2,
      executionMode: 'parallel',
      aggressiveMemory: true,
      memoryLimitMB: 500,
      testTiers: ['smoke', 'core'],
      maxExecutionTimeMs: 300000 // 5 minutes in CI
    };
  }

  /**
   * Get optimal configuration for development
   */
  static getDevOptimizedConfig(): SparkyTestConfig {
    return {
      processCount: 4,
      executionMode: 'parallel',
      aggressiveMemory: true,
      memoryLimitMB: 600,
      testTiers: ['smoke', 'core'],
      maxExecutionTimeMs: 600000 // 10 minutes for dev
    };
  }
}