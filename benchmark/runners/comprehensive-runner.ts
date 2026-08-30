/**
 * Comprehensive test runner for the complete benchmark suite
 * Orchestrates all benchmark categories and generates unified reports
 */

import { compareBackends, BenchmarkComparison } from '../utils/comparison/backend-benchmark.js';
import { generateAnalysisReport, exportResults } from '../utils/comparison/analysis-tools.js';

// Microbenchmark imports
import { fieldOperationsBenchmarks } from '../suites/microbenchmarks/field-operations.js';
import { hashFunctionBenchmarks } from '../suites/microbenchmarks/hash-functions.js';
import { circuitCompilationBenchmarks } from '../suites/microbenchmarks/circuit-compilation.js';
import { proofGenerationBenchmarks } from '../suites/microbenchmarks/proof-generation.js';

// Holistic benchmark imports
import { simpleContractBenchmarks } from '../suites/holistic/simple-contract.js';
import { tokenContractBenchmarks } from '../suites/holistic/token-contract.js';
import { merkleTreeBenchmarks } from '../suites/holistic/merkle-tree-ops.js';
import { recursiveProofBenchmarks } from '../suites/holistic/recursive-proofs.js';

// Memory benchmark imports
import { memoryUsageBenchmarks } from '../suites/memory/memory-usage.js';
import { memoryLeakBenchmarks } from '../suites/memory/memory-leaks.js';
import { concurrentProvingBenchmarks } from '../suites/memory/concurrent-proving.js';

export {
  BenchmarkSuite,
  RunnerConfig,
  ComprehensiveRunner,
  runAllBenchmarks,
  runSelectedSuites,
  createRunner,
};

interface BenchmarkSuite {
  name: string;
  category: 'microbenchmarks' | 'holistic' | 'memory';
  benchmarks: Array<{ run: () => Promise<any> }>;
  priority: 'high' | 'medium' | 'low';
  estimatedTimeMinutes: number;
}

interface RunnerConfig {
  suites?: string[]; // Run specific suites, or all if not specified
  outputPath?: string;
  skipLongRunning?: boolean; // Skip benchmarks that take > 10 minutes
  verboseOutput?: boolean;
  exportResults?: boolean;
  continueOnError?: boolean;
  parallel?: boolean; // Run suites in parallel where possible
}

class ComprehensiveRunner {
  private config: RunnerConfig;
  private suites: BenchmarkSuite[];
  private results: BenchmarkComparison[] = [];

  constructor(config: RunnerConfig = {}) {
    this.config = {
      outputPath: './benchmark-results',
      skipLongRunning: false,
      verboseOutput: true,
      exportResults: true,
      continueOnError: true,
      parallel: false,
      ...config,
    };

    this.suites = this.initializeSuites();
  }

  private initializeSuites(): BenchmarkSuite[] {
    return [
      // Microbenchmarks - High priority, fast execution
      {
        name: 'Field Operations',
        category: 'microbenchmarks',
        benchmarks: fieldOperationsBenchmarks,
        priority: 'high',
        estimatedTimeMinutes: 5,
      },
      {
        name: 'Hash Functions',
        category: 'microbenchmarks',
        benchmarks: hashFunctionBenchmarks,
        priority: 'high',
        estimatedTimeMinutes: 8,
      },
      {
        name: 'Circuit Compilation',
        category: 'microbenchmarks',
        benchmarks: circuitCompilationBenchmarks,
        priority: 'high',
        estimatedTimeMinutes: 10,
      },
      {
        name: 'Proof Generation',
        category: 'microbenchmarks',
        benchmarks: proofGenerationBenchmarks,
        priority: 'high',
        estimatedTimeMinutes: 15,
      },

      // Holistic benchmarks - Medium priority, moderate execution time
      {
        name: 'Simple Contracts',
        category: 'holistic',
        benchmarks: simpleContractBenchmarks,
        priority: 'medium',
        estimatedTimeMinutes: 12,
      },
      {
        name: 'Token Contracts',
        category: 'holistic',
        benchmarks: tokenContractBenchmarks,
        priority: 'medium',
        estimatedTimeMinutes: 18,
      },
      {
        name: 'Merkle Tree Operations',
        category: 'holistic',
        benchmarks: merkleTreeBenchmarks,
        priority: 'medium',
        estimatedTimeMinutes: 20,
      },
      {
        name: 'Recursive Proofs',
        category: 'holistic',
        benchmarks: recursiveProofBenchmarks,
        priority: 'low',
        estimatedTimeMinutes: 45,
      },

      // Memory benchmarks - Lower priority, can be time-consuming
      {
        name: 'Memory Usage',
        category: 'memory',
        benchmarks: memoryUsageBenchmarks,
        priority: 'medium',
        estimatedTimeMinutes: 15,
      },
      {
        name: 'Memory Leaks',
        category: 'memory',
        benchmarks: memoryLeakBenchmarks,
        priority: 'low',
        estimatedTimeMinutes: 25,
      },
      {
        name: 'Concurrent Proving',
        category: 'memory',
        benchmarks: concurrentProvingBenchmarks,
        priority: 'low',
        estimatedTimeMinutes: 30,
      },
    ];
  }

  async runAll(): Promise<void> {
    console.log('🚀 Starting comprehensive o1js backend benchmark suite');
    console.log('=====================================\n');

    const startTime = Date.now();
    let totalEstimatedTime = 0;

    // Filter suites based on configuration
    const suitesToRun = this.filterSuites();
    totalEstimatedTime = suitesToRun.reduce((sum, suite) => sum + suite.estimatedTimeMinutes, 0);

    console.log(`Planning to run ${suitesToRun.length} benchmark suites`);
    console.log(`Estimated total time: ${totalEstimatedTime} minutes\n`);

    if (this.config.parallel && suitesToRun.length > 1) {
      await this.runSuitesInParallel(suitesToRun);
    } else {
      await this.runSuitesSequentially(suitesToRun);
    }

    const totalTime = (Date.now() - startTime) / 1000 / 60;
    console.log(`\n✅ All benchmarks completed in ${totalTime.toFixed(1)} minutes`);

    await this.generateFinalReport();
  }

  private filterSuites(): BenchmarkSuite[] {
    let filtered = this.suites;

    // Filter by specified suites
    if (this.config.suites && this.config.suites.length > 0) {
      filtered = filtered.filter(suite => 
        this.config.suites!.some(name => 
          suite.name.toLowerCase().includes(name.toLowerCase())
        )
      );
    }

    // Skip long-running benchmarks if requested
    if (this.config.skipLongRunning) {
      filtered = filtered.filter(suite => suite.estimatedTimeMinutes <= 10);
    }

    // Sort by priority and estimated time
    filtered.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.estimatedTimeMinutes - b.estimatedTimeMinutes;
    });

    return filtered;
  }

  private async runSuitesSequentially(suites: BenchmarkSuite[]): Promise<void> {
    for (let i = 0; i < suites.length; i++) {
      const suite = suites[i];
      console.log(`\n[${i + 1}/${suites.length}] Running ${suite.name} (${suite.category})`);
      console.log(`Estimated time: ${suite.estimatedTimeMinutes} minutes`);
      console.log('-'.repeat(60));

      try {
        const suiteResults = await this.runSuite(suite);
        this.results.push(...suiteResults);
        console.log(`✅ ${suite.name} completed with ${suiteResults.length} comparisons`);
      } catch (error) {
        console.error(`❌ ${suite.name} failed:`, error);
        if (!this.config.continueOnError) {
          throw error;
        }
      }
    }
  }

  private async runSuitesInParallel(suites: BenchmarkSuite[]): Promise<void> {
    console.log('Running benchmark suites in parallel...\n');

    // Group suites by category to avoid resource conflicts
    const groupedSuites = this.groupSuitesByCategory(suites);
    
    for (const [category, categorySuites] of Object.entries(groupedSuites)) {
      console.log(`Running ${category} benchmarks in parallel...`);
      
      const promises = categorySuites.map(async (suite) => {
        try {
          console.log(`Starting ${suite.name}...`);
          const suiteResults = await this.runSuite(suite);
          console.log(`✅ ${suite.name} completed`);
          return suiteResults;
        } catch (error) {
          console.error(`❌ ${suite.name} failed:`, error);
          if (!this.config.continueOnError) {
            throw error;
          }
          return [];
        }
      });

      const categoryResults = await Promise.all(promises);
      this.results.push(...categoryResults.flat());
    }
  }

  private groupSuitesByCategory(suites: BenchmarkSuite[]): Record<string, BenchmarkSuite[]> {
    return suites.reduce((groups, suite) => {
      const category = suite.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(suite);
      return groups;
    }, {} as Record<string, BenchmarkSuite[]>);
  }

  private async runSuite(suite: BenchmarkSuite): Promise<BenchmarkComparison[]> {
    const suiteResults: BenchmarkComparison[] = [];

    for (let i = 0; i < suite.benchmarks.length; i++) {
      const benchmark = suite.benchmarks[i];
      
      if (this.config.verboseOutput) {
        console.log(`  Running benchmark ${i + 1}/${suite.benchmarks.length}...`);
      }

      try {
        const results = await benchmark.run();
        
        // Convert results to comparisons (assuming 2 backends: snarky and sparky)
        if (results.length >= 2) {
          const snarkyResult = results.find((r: any) => r.backend === 'snarky');
          const sparkyResult = results.find((r: any) => r.backend === 'sparky');
          
          if (snarkyResult && sparkyResult) {
            const comparison = compareBackends(snarkyResult, sparkyResult);
            suiteResults.push(comparison);
            
            if (this.config.verboseOutput) {
              console.log(`    ${comparison.scenario}: ${comparison.speedup.total > 0 ? '+' : ''}${comparison.speedup.total.toFixed(1)}% speedup`);
            }
          }
        }
      } catch (error) {
        console.error(`    ❌ Benchmark failed:`, error);
        if (!this.config.continueOnError) {
          throw error;
        }
      }
    }

    return suiteResults;
  }

  private async generateFinalReport(): Promise<void> {
    if (this.results.length === 0) {
      console.warn('⚠️ No benchmark results to analyze');
      return;
    }

    console.log('\n📊 Generating analysis report...');
    
    const report = generateAnalysisReport(this.results);
    
    // Display summary to console
    console.log('\n' + '='.repeat(80));
    console.log('BENCHMARK SUMMARY');
    console.log('='.repeat(80));
    
    const overall = report.overallSummary;
    console.log(`Overall Performance Improvement: ${overall.speedupMetrics.mean.toFixed(1)}%`);
    console.log(`Best Case Improvement: ${overall.speedupMetrics.best.toFixed(1)}%`);
    console.log(`Statistically Significant Results: ${overall.significanceAnalysis.significantImprovements}/${this.results.length}`);
    
    console.log('\nCategory Breakdown:');
    for (const category of report.categoryAnalysis) {
      console.log(`  ${category.category}: ${category.avgSpeedup.toFixed(1)}% avg speedup, ${category.scenarios.length} scenarios`);
    }

    if (report.regressionFlags.length > 0) {
      console.log('\n⚠️ Performance Concerns:');
      for (const flag of report.regressionFlags) {
        console.log(`  ${flag}`);
      }
    }

    console.log('\nTop Recommendations:');
    for (const rec of report.recommendations.slice(0, 3)) {
      console.log(`  • ${rec}`);
    }

    // Export detailed results
    if (this.config.exportResults) {
      try {
        exportResults(report, this.config.outputPath);
        console.log(`\n📁 Detailed results exported to ${this.config.outputPath}`);
      } catch (error) {
        console.error('Failed to export results:', error);
      }
    }

    console.log('\n' + '='.repeat(80));
  }
}

// Convenience functions
function createRunner(config?: RunnerConfig): ComprehensiveRunner {
  return new ComprehensiveRunner(config);
}

async function runAllBenchmarks(config?: RunnerConfig): Promise<void> {
  const runner = createRunner(config);
  await runner.runAll();
}

async function runSelectedSuites(suiteNames: string[], config?: RunnerConfig): Promise<void> {
  const runner = createRunner({
    ...config,
    suites: suiteNames,
  });
  await runner.runAll();
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const config: RunnerConfig = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--fast':
        config.skipLongRunning = true;
        break;
      case '--parallel':
        config.parallel = true;
        break;
      case '--quiet':
        config.verboseOutput = false;
        break;
      case '--no-export':
        config.exportResults = false;
        break;
      case '--output':
        config.outputPath = args[++i];
        break;
      case '--suites':
        config.suites = args[++i].split(',').map(s => s.trim());
        break;
      case '--help':
        console.log(`
Usage: node comprehensive-runner.js [options]

Options:
  --fast          Skip long-running benchmarks (> 10 minutes)
  --parallel      Run benchmark suites in parallel
  --quiet         Minimal output
  --no-export     Don't export detailed results
  --output PATH   Set output directory (default: ./benchmark-results)
  --suites LIST   Comma-separated list of suite names to run
  --help          Show this help message

Examples:
  node comprehensive-runner.js --fast --parallel
  node comprehensive-runner.js --suites "Field Operations,Hash Functions"
  node comprehensive-runner.js --output ./results --quiet
        `);
        process.exit(0);
    }
  }

  // Run benchmarks
  runAllBenchmarks(config).catch(error => {
    console.error('Benchmark suite failed:', error);
    process.exit(1);
  });
}