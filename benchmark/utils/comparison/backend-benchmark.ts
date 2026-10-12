/**
 * Enhanced benchmark framework for comparing snarky vs sparky backends
 */

import { benchmark, BenchmarkResult, logResult, pValue } from '../../benchmark.js';

export {
  BackendConfig,
  BackendBenchmarkResult,
  MemoryMetrics,
  TimingBreakdown,
  BenchmarkComparison,
  backendBenchmark,
  compareBackends,
  logComparison,
  generateReport,
};

interface BackendConfig {
  name: 'snarky' | 'sparky';
  bindingsPath?: string;
  warmupRuns: number;
  measurementRuns: number;
}

interface MemoryMetrics {
  peakMB: number;
  finalMB: number;
  gcEvents: number;
}

interface TimingBreakdown {
  compilation: number;
  witnessGeneration: number;
  proving: number;
  verification: number;
  total: number;
}

interface BackendBenchmarkResult {
  backend: string;
  scenario: string;
  timings: TimingBreakdown;
  memory: MemoryMetrics;
  constraints: number;
  statistics: BenchmarkResult[];
}

interface BenchmarkComparison {
  scenario: string;
  snarky: BackendBenchmarkResult;
  sparky: BackendBenchmarkResult;
  speedup: {
    compilation: number;
    witnessGeneration: number;
    proving: number;
    verification: number;
    total: number;
  };
  memoryReduction: number;
  significance: {
    proving: number; // p-value
    total: number;   // p-value
  };
}

function backendBenchmark(
  scenario: string,
  testFunction: (
    tic: (label?: string) => void,
    toc: (label?: string) => void,
    memTracker: MemoryTracker
  ) => Promise<{ constraints: number }>,
  configs: BackendConfig[]
) {
  return {
    async run(): Promise<BackendBenchmarkResult[]> {
      const results: BackendBenchmarkResult[] = [];

      for (const config of configs) {
        console.log(`\n=== Running ${scenario} with ${config.name} backend ===`);
        
        // Setup backend (this would be where we switch bindings in practice)
        await setupBackend(config);

        const memTracker = new MemoryTracker();
        let constraintCount = 0;

        const bench = benchmark(
          `${scenario}-${config.name}`,
          async (tic, toc) => {
            memTracker.reset();
            memTracker.start();
            
            const result = await testFunction(tic, toc, memTracker);
            constraintCount = result.constraints;
            
            memTracker.stop();
          },
          {
            numberOfRuns: config.measurementRuns,
            numberOfWarmups: config.warmupRuns,
          }
        );

        const benchResults = await bench.run();
        const timings = extractTimingBreakdown(benchResults);
        const memory = memTracker.getMetrics();

        results.push({
          backend: config.name,
          scenario,
          timings,
          memory,
          constraints: constraintCount,
          statistics: benchResults,
        });
      }

      return results;
    },
  };
}

function compareBackends(
  snarkyResult: BackendBenchmarkResult,
  sparkyResult: BackendBenchmarkResult
): BenchmarkComparison {
  const speedup = {
    compilation: calculateSpeedup(snarkyResult.timings.compilation, sparkyResult.timings.compilation),
    witnessGeneration: calculateSpeedup(snarkyResult.timings.witnessGeneration, sparkyResult.timings.witnessGeneration),
    proving: calculateSpeedup(snarkyResult.timings.proving, sparkyResult.timings.proving),
    verification: calculateSpeedup(snarkyResult.timings.verification, sparkyResult.timings.verification),
    total: calculateSpeedup(snarkyResult.timings.total, sparkyResult.timings.total),
  };

  const memoryReduction = calculateMemoryReduction(
    snarkyResult.memory.peakMB,
    sparkyResult.memory.peakMB
  );

  // Calculate statistical significance for key metrics
  const provingStats = {
    snarky: snarkyResult.statistics.find(s => s.label.includes('proving')),
    sparky: sparkyResult.statistics.find(s => s.label.includes('proving')),
  };

  const totalStats = {
    snarky: snarkyResult.statistics.find(s => s.label.includes('total')),
    sparky: sparkyResult.statistics.find(s => s.label.includes('total')),
  };

  const significance = {
    proving: provingStats.snarky && provingStats.sparky 
      ? pValue(provingStats.sparky, provingStats.snarky) 
      : 1.0,
    total: totalStats.snarky && totalStats.sparky 
      ? pValue(totalStats.sparky, totalStats.snarky) 
      : 1.0,
  };

  return {
    scenario: snarkyResult.scenario,
    snarky: snarkyResult,
    sparky: sparkyResult,
    speedup,
    memoryReduction,
    significance,
  };
}

function logComparison(comparison: BenchmarkComparison): void {
  console.log(`\n=== ${comparison.scenario} Comparison ===`);
  console.log(`Constraints: ${comparison.snarky.constraints.toLocaleString()}`);
  
  console.log('\nTiming Comparison:');
  logSpeedupMetric('Compilation', comparison.speedup.compilation);
  logSpeedupMetric('Witness Gen', comparison.speedup.witnessGeneration);
  logSpeedupMetric('Proving', comparison.speedup.proving, comparison.significance.proving);
  logSpeedupMetric('Verification', comparison.speedup.verification);
  logSpeedupMetric('Total', comparison.speedup.total, comparison.significance.total);

  console.log(`\nMemory: ${comparison.memoryReduction > 0 ? '-' : '+'}${Math.abs(comparison.memoryReduction).toFixed(1)}% (${comparison.sparky.memory.peakMB.toFixed(1)}MB vs ${comparison.snarky.memory.peakMB.toFixed(1)}MB)`);
}

function generateReport(comparisons: BenchmarkComparison[]): string {
  let report = '=== o1js Backend Performance Comparison ===\n\n';
  
  // Overall summary
  const avgProvingSpeedup = comparisons.reduce((sum, c) => sum + c.speedup.proving, 0) / comparisons.length;
  const avgMemoryReduction = comparisons.reduce((sum, c) => sum + c.memoryReduction, 0) / comparisons.length;
  const avgTotalSpeedup = comparisons.reduce((sum, c) => sum + c.speedup.total, 0) / comparisons.length;

  report += `Overall Performance Gain: Sparky vs Snarky\n`;
  report += `├── Proof Generation: ${avgProvingSpeedup > 0 ? '+' : ''}${avgProvingSpeedup.toFixed(1)}% faster\n`;
  report += `├── Memory Usage: ${avgMemoryReduction > 0 ? '-' : '+'}${Math.abs(avgMemoryReduction).toFixed(1)}% ${avgMemoryReduction > 0 ? 'reduction' : 'increase'}\n`;
  report += `└── Total Time: ${avgTotalSpeedup > 0 ? '+' : ''}${avgTotalSpeedup.toFixed(1)}% faster\n\n`;

  // Detailed breakdown table
  report += 'Detailed Breakdown:\n';
  report += '┌─────────────────────┬──────────┬──────────┬──────────┬──────────┐\n';
  report += '│ Scenario            │ Snarky   │ Sparky   │ Speedup  │ Sig.     │\n';
  report += '├─────────────────────┼──────────┼──────────┼──────────┼──────────┤\n';
  
  for (const comparison of comparisons) {
    const scenario = comparison.scenario.padEnd(19);
    const snarkyTime = `${comparison.snarky.timings.total.toFixed(1)}s`.padEnd(8);
    const sparkyTime = `${comparison.sparky.timings.total.toFixed(1)}s`.padEnd(8);
    const speedup = `${comparison.speedup.total > 0 ? '+' : ''}${comparison.speedup.total.toFixed(0)}%`.padEnd(8);
    const significance = comparison.significance.total < 0.05 ? '✓' : '~';
    
    report += `│ ${scenario} │ ${snarkyTime} │ ${sparkyTime} │ ${speedup} │ ${significance.padEnd(8)} │\n`;
  }
  
  report += '└─────────────────────┴──────────┴──────────┴──────────┴──────────┘\n\n';
  
  // Memory breakdown
  report += 'Memory Usage Comparison:\n';
  for (const comparison of comparisons) {
    const reduction = comparison.memoryReduction;
    report += `${comparison.scenario}: ${reduction > 0 ? '-' : '+'}${Math.abs(reduction).toFixed(1)}% `;
    report += `(${comparison.sparky.memory.peakMB.toFixed(1)}MB vs ${comparison.snarky.memory.peakMB.toFixed(1)}MB)\n`;
  }

  return report;
}

// Helper functions

function calculateSpeedup(baseline: number, improved: number): number {
  return ((baseline - improved) / baseline) * 100;
}

function calculateMemoryReduction(baselineMB: number, improvedMB: number): number {
  return ((baselineMB - improvedMB) / baselineMB) * 100;
}

function logSpeedupMetric(name: string, speedup: number, pValue?: number): void {
  const sign = speedup > 0 ? '+' : '';
  const significance = pValue !== undefined && pValue < 0.05 ? ' ✓' : '';
  console.log(`  ${name}: ${sign}${speedup.toFixed(1)}%${significance}`);
}

function extractTimingBreakdown(results: BenchmarkResult[]): TimingBreakdown {
  const getTime = (label: string) => 
    results.find(r => r.label.includes(label))?.mean || 0;

  return {
    compilation: getTime('compilation'),
    witnessGeneration: getTime('witness'),
    proving: getTime('proving'),
    verification: getTime('verification'),
    total: getTime('total') || results[0]?.mean || 0,
  };
}

async function setupBackend(config: BackendConfig): Promise<void> {
  // This is where we would switch between snarky and sparky bindings
  // For now, this is a placeholder that would be implemented when sparky is available
  if (config.bindingsPath) {
    process.env.O1JS_BINDINGS_PATH = config.bindingsPath;
  }
  
  // Force reload of bindings if needed
  // delete require.cache[require.resolve('../../src/bindings')];
}

class MemoryTracker {
  private startMem: number = 0;
  private peakMem: number = 0;
  private gcCount: number = 0;

  reset(): void {
    this.startMem = 0;
    this.peakMem = 0;
    this.gcCount = 0;
  }

  start(): void {
    if (global.gc) {
      global.gc();
    }
    this.startMem = process.memoryUsage().heapUsed / 1024 / 1024;
    this.peakMem = this.startMem;
    this.gcCount = 0;
  }

  checkpoint(): void {
    const currentMem = process.memoryUsage().heapUsed / 1024 / 1024;
    this.peakMem = Math.max(this.peakMem, currentMem);
  }

  stop(): void {
    this.checkpoint();
  }

  getMetrics(): MemoryMetrics {
    const finalMem = process.memoryUsage().heapUsed / 1024 / 1024;
    return {
      peakMB: this.peakMem,
      finalMB: finalMem,
      gcEvents: this.gcCount,
    };
  }
}