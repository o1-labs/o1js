/**
 * Comprehensive Performance Test - Snarky vs Sparky
 * 
 * Direct performance measurement with statistical rigor
 * for critical project decision making.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { Field, Poseidon, Bool, switchBackend, getCurrentBackend } from '../../dist/node/index.js';
import * as fs from 'fs';
import * as os from 'os';

// Performance measurement utilities
class PerformanceTimer {
  private startTime: bigint = 0n;

  start(): void {
    this.startTime = process.hrtime.bigint();
  }

  stop(): bigint {
    return process.hrtime.bigint() - this.startTime;
  }

  static async measure(fn: () => void | Promise<void>): Promise<bigint> {
    const timer = new PerformanceTimer();
    timer.start();
    await fn();
    return timer.stop();
  }
}

// Statistical analysis
function calculateStats(times: bigint[]): {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p95: number;
} {
  const numbers = times.map(t => Number(t) / 1e6); // Convert to ms
  const sorted = [...numbers].sort((a, b) => a - b);
  
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = numbers.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / numbers.length;
  const stdDev = Math.sqrt(variance);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  return { mean, median, stdDev, min, max, p95 };
}

// Remove outliers using IQR method
function removeOutliers(times: bigint[]): bigint[] {
  const sorted = [...times].sort((a, b) => Number(a - b));
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = Number(q3 - q1);
  const lowerBound = Number(q1) - 1.5 * iqr;
  const upperBound = Number(q3) + 1.5 * iqr;
  
  return times.filter(t => {
    const num = Number(t);
    return num >= lowerBound && num <= upperBound;
  });
}

// Performance test configuration
const CONFIG = {
  warmupIterations: 50,
  measurementIterations: 100,
  operationIterations: 1000 // Operations per measurement
};

// Global results storage
const performanceResults: any = {
  timestamp: new Date().toISOString(),
  environment: {
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    totalMemory: os.totalmem() / 1024 / 1024 / 1024, // GB
    nodeVersion: process.version
  },
  tests: {}
};

describe('🚀 Comprehensive Performance Comparison: Snarky vs Sparky', () => {
  beforeAll(() => {
    console.log('\n📊 Performance Test Configuration:');
    console.log(`   Platform: ${performanceResults.environment.platform} ${performanceResults.environment.arch}`);
    console.log(`   CPU: ${performanceResults.environment.cpuModel} (${performanceResults.environment.cpus} cores)`);
    console.log(`   Memory: ${performanceResults.environment.totalMemory.toFixed(2)} GB`);
    console.log(`   Node.js: ${performanceResults.environment.nodeVersion}`);
    console.log(`   Warmup: ${CONFIG.warmupIterations} iterations`);
    console.log(`   Measurements: ${CONFIG.measurementIterations} iterations`);
    console.log(`   Operations/measurement: ${CONFIG.operationIterations}`);
    console.log('');
  });

  describe('⚡ Field Operations Performance', () => {
    test('Field Addition', async () => {
      console.log('\n🧮 Testing Field Addition Performance...');
      
      const testAddition = async (backend: 'snarky' | 'sparky'): Promise<bigint[]> => {
        await switchBackend(backend);
        const fields = Array.from({ length: CONFIG.operationIterations }, (_, i) => Field(i + 1));
        const times: bigint[] = [];

        // Warmup
        for (let i = 0; i < CONFIG.warmupIterations; i++) {
          let acc = Field(0);
          for (const f of fields) {
            acc = acc.add(f);
          }
        }

        // Measurement
        for (let i = 0; i < CONFIG.measurementIterations; i++) {
          const time = await PerformanceTimer.measure(() => {
            let acc = Field(0);
            for (const f of fields) {
              acc = acc.add(f);
            }
          });
          times.push(time);
        }

        return removeOutliers(times);
      };

      const snarkyTimes = await testAddition('snarky');
      const sparkyTimes = await testAddition('sparky');

      const snarkyStats = calculateStats(snarkyTimes);
      const sparkyStats = calculateStats(sparkyTimes);
      const ratio = sparkyStats.mean / snarkyStats.mean;

      console.log(`   Snarky: ${snarkyStats.mean.toFixed(2)}ms (±${snarkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Sparky: ${sparkyStats.mean.toFixed(2)}ms (±${sparkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Ratio: ${ratio.toFixed(2)}x ${ratio < 2 ? '✅' : ratio < 3 ? '⚠️' : '❌'}`);

      performanceResults.tests.fieldAddition = {
        snarky: snarkyStats,
        sparky: sparkyStats,
        ratio,
        acceptable: ratio < 2
      };
    }, 120000);

    test('Field Multiplication', async () => {
      console.log('\n🧮 Testing Field Multiplication Performance...');
      
      const testMultiplication = async (backend: 'snarky' | 'sparky'): Promise<bigint[]> => {
        await switchBackend(backend);
        const fields = Array.from({ length: CONFIG.operationIterations }, (_, i) => Field(i + 1));
        const times: bigint[] = [];

        // Warmup
        for (let i = 0; i < CONFIG.warmupIterations; i++) {
          let acc = Field(1);
          for (let j = 0; j < 100; j++) {
            acc = acc.mul(fields[j % fields.length]);
          }
        }

        // Measurement
        for (let i = 0; i < CONFIG.measurementIterations; i++) {
          const time = await PerformanceTimer.measure(() => {
            let acc = Field(1);
            for (let j = 0; j < 100; j++) {
              acc = acc.mul(fields[j % fields.length]);
            }
          });
          times.push(time);
        }

        return removeOutliers(times);
      };

      const snarkyTimes = await testMultiplication('snarky');
      const sparkyTimes = await testMultiplication('sparky');

      const snarkyStats = calculateStats(snarkyTimes);
      const sparkyStats = calculateStats(sparkyTimes);
      const ratio = sparkyStats.mean / snarkyStats.mean;

      console.log(`   Snarky: ${snarkyStats.mean.toFixed(2)}ms (±${snarkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Sparky: ${sparkyStats.mean.toFixed(2)}ms (±${sparkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Ratio: ${ratio.toFixed(2)}x ${ratio < 2 ? '✅' : ratio < 3 ? '⚠️' : '❌'}`);

      performanceResults.tests.fieldMultiplication = {
        snarky: snarkyStats,
        sparky: sparkyStats,
        ratio,
        acceptable: ratio < 2
      };
    }, 120000);

    test('Field Inversion', async () => {
      console.log('\n🧮 Testing Field Inversion Performance...');
      
      const testInversion = async (backend: 'snarky' | 'sparky'): Promise<bigint[]> => {
        await switchBackend(backend);
        const fields = Array.from({ length: 100 }, (_, i) => Field(i + 1)); // Fewer for expensive op
        const times: bigint[] = [];

        // Warmup
        for (let i = 0; i < CONFIG.warmupIterations; i++) {
          for (const f of fields) {
            f.inv();
          }
        }

        // Measurement
        for (let i = 0; i < CONFIG.measurementIterations; i++) {
          const time = await PerformanceTimer.measure(() => {
            for (const f of fields) {
              f.inv();
            }
          });
          times.push(time);
        }

        return removeOutliers(times);
      };

      const snarkyTimes = await testInversion('snarky');
      const sparkyTimes = await testInversion('sparky');

      const snarkyStats = calculateStats(snarkyTimes);
      const sparkyStats = calculateStats(sparkyTimes);
      const ratio = sparkyStats.mean / snarkyStats.mean;

      console.log(`   Snarky: ${snarkyStats.mean.toFixed(2)}ms (±${snarkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Sparky: ${sparkyStats.mean.toFixed(2)}ms (±${sparkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Ratio: ${ratio.toFixed(2)}x ${ratio < 3 ? '✅' : ratio < 5 ? '⚠️' : '❌'}`);

      performanceResults.tests.fieldInversion = {
        snarky: snarkyStats,
        sparky: sparkyStats,
        ratio,
        acceptable: ratio < 3
      };
    }, 120000);
  });

  describe('🔐 Cryptographic Operations', () => {
    test('Poseidon Hash', async () => {
      console.log('\n🔐 Testing Poseidon Hash Performance...');
      
      const testPoseidon = async (backend: 'snarky' | 'sparky'): Promise<bigint[]> => {
        await switchBackend(backend);
        const inputs = Array.from({ length: 100 }, (_, i) => [Field(i), Field(i + 1), Field(i + 2)]);
        const times: bigint[] = [];

        // Warmup
        for (let i = 0; i < CONFIG.warmupIterations; i++) {
          for (const input of inputs) {
            Poseidon.hash(input);
          }
        }

        // Measurement
        for (let i = 0; i < CONFIG.measurementIterations; i++) {
          const time = await PerformanceTimer.measure(() => {
            for (const input of inputs) {
              Poseidon.hash(input);
            }
          });
          times.push(time);
        }

        return removeOutliers(times);
      };

      const snarkyTimes = await testPoseidon('snarky');
      const sparkyTimes = await testPoseidon('sparky');

      const snarkyStats = calculateStats(snarkyTimes);
      const sparkyStats = calculateStats(sparkyTimes);
      const ratio = sparkyStats.mean / snarkyStats.mean;

      console.log(`   Snarky: ${snarkyStats.mean.toFixed(2)}ms (±${snarkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Sparky: ${sparkyStats.mean.toFixed(2)}ms (±${sparkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Ratio: ${ratio.toFixed(2)}x ${ratio < 2 ? '✅' : ratio < 3 ? '⚠️' : '❌'}`);

      performanceResults.tests.poseidonHash = {
        snarky: snarkyStats,
        sparky: sparkyStats,
        ratio,
        acceptable: ratio < 2
      };
    }, 120000);

    test('Merkle Tree (depth 8)', async () => {
      console.log('\n🌲 Testing Merkle Tree Performance...');
      
      const testMerkleTree = async (backend: 'snarky' | 'sparky'): Promise<bigint[]> => {
        await switchBackend(backend);
        const depth = 8;
        const leaves = Array.from({ length: Math.pow(2, depth) }, (_, i) => Field(i));
        const times: bigint[] = [];

        const buildTree = () => {
          const levels: Field[][] = [leaves];
          for (let level = 0; level < depth; level++) {
            const currentLevel = levels[level];
            const nextLevel: Field[] = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
              nextLevel.push(Poseidon.hash([currentLevel[i], currentLevel[i + 1]]));
            }
            levels.push(nextLevel);
          }
          return levels[depth][0];
        };

        // Warmup
        for (let i = 0; i < 20; i++) {
          buildTree();
        }

        // Measurement
        for (let i = 0; i < 50; i++) {
          const time = await PerformanceTimer.measure(() => {
            buildTree();
          });
          times.push(time);
        }

        return removeOutliers(times);
      };

      const snarkyTimes = await testMerkleTree('snarky');
      const sparkyTimes = await testMerkleTree('sparky');

      const snarkyStats = calculateStats(snarkyTimes);
      const sparkyStats = calculateStats(sparkyTimes);
      const ratio = sparkyStats.mean / snarkyStats.mean;

      console.log(`   Snarky: ${snarkyStats.mean.toFixed(2)}ms (±${snarkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Sparky: ${sparkyStats.mean.toFixed(2)}ms (±${sparkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Ratio: ${ratio.toFixed(2)}x ${ratio < 2.5 ? '✅' : ratio < 4 ? '⚠️' : '❌'}`);

      performanceResults.tests.merkleTree = {
        snarky: snarkyStats,
        sparky: sparkyStats,
        ratio,
        acceptable: ratio < 2.5
      };
    }, 180000);
  });

  describe('🔗 Complex Expressions', () => {
    test('Nested Arithmetic (depth 10)', async () => {
      console.log('\n🔗 Testing Nested Arithmetic Performance...');
      
      const testNestedArithmetic = async (backend: 'snarky' | 'sparky'): Promise<bigint[]> => {
        await switchBackend(backend);
        const times: bigint[] = [];

        const buildExpression = (depth: number): Field => {
          if (depth === 0) return Field(depth + 1);
          const left = buildExpression(depth - 1);
          const right = buildExpression(depth - 1);
          return left.add(right.mul(Field(depth)));
        };

        // Warmup
        for (let i = 0; i < 30; i++) {
          buildExpression(10);
        }

        // Measurement
        for (let i = 0; i < 50; i++) {
          const time = await PerformanceTimer.measure(() => {
            for (let j = 0; j < 10; j++) {
              buildExpression(10);
            }
          });
          times.push(time);
        }

        return removeOutliers(times);
      };

      const snarkyTimes = await testNestedArithmetic('snarky');
      const sparkyTimes = await testNestedArithmetic('sparky');

      const snarkyStats = calculateStats(snarkyTimes);
      const sparkyStats = calculateStats(sparkyTimes);
      const ratio = sparkyStats.mean / snarkyStats.mean;

      console.log(`   Snarky: ${snarkyStats.mean.toFixed(2)}ms (±${snarkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Sparky: ${sparkyStats.mean.toFixed(2)}ms (±${sparkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Ratio: ${ratio.toFixed(2)}x ${ratio < 3 ? '✅' : ratio < 5 ? '⚠️' : '❌'}`);

      performanceResults.tests.nestedArithmetic = {
        snarky: snarkyStats,
        sparky: sparkyStats,
        ratio,
        acceptable: ratio < 3
      };
    }, 180000);

    test('Large Array Operations (10k elements)', async () => {
      console.log('\n📊 Testing Large Array Operations...');
      
      const testArrayOps = async (backend: 'snarky' | 'sparky'): Promise<bigint[]> => {
        await switchBackend(backend);
        const size = 10000;
        const array1 = Array.from({ length: size }, (_, i) => Field(i));
        const array2 = Array.from({ length: size }, (_, i) => Field(i * 2));
        const times: bigint[] = [];

        // Warmup
        for (let i = 0; i < 10; i++) {
          const result = array1.map((a, i) => a.add(array2[i]));
          result.reduce((acc, val) => acc.add(val), Field(0));
        }

        // Measurement
        for (let i = 0; i < 30; i++) {
          const time = await PerformanceTimer.measure(() => {
            const result = array1.map((a, i) => a.add(array2[i]));
            result.reduce((acc, val) => acc.add(val), Field(0));
          });
          times.push(time);
        }

        return removeOutliers(times);
      };

      const snarkyTimes = await testArrayOps('snarky');
      const sparkyTimes = await testArrayOps('sparky');

      const snarkyStats = calculateStats(snarkyTimes);
      const sparkyStats = calculateStats(sparkyTimes);
      const ratio = sparkyStats.mean / snarkyStats.mean;

      console.log(`   Snarky: ${snarkyStats.mean.toFixed(2)}ms (±${snarkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Sparky: ${sparkyStats.mean.toFixed(2)}ms (±${sparkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Ratio: ${ratio.toFixed(2)}x ${ratio < 2 ? '✅' : ratio < 3 ? '⚠️' : '❌'}`);

      performanceResults.tests.largeArrayOps = {
        snarky: snarkyStats,
        sparky: sparkyStats,
        ratio,
        acceptable: ratio < 2
      };
    }, 240000);
  });

  describe('🏗️ Real-World Patterns', () => {
    test('AMM Swap Simulation', async () => {
      console.log('\n💱 Testing AMM Swap Performance...');
      
      const testAMMSwap = async (backend: 'snarky' | 'sparky'): Promise<bigint[]> => {
        await switchBackend(backend);
        const times: bigint[] = [];

        const ammSwap = () => {
          let reserveA = Field(1000000);
          let reserveB = Field(2000000);
          const k = reserveA.mul(reserveB);
          
          for (let i = 0; i < 50; i++) {
            const amountIn = Field(100 + i);
            const newReserveA = reserveA.add(amountIn);
            const newReserveB = k.div(newReserveA);
            const amountOut = reserveB.sub(newReserveB);
            
            reserveA = newReserveA;
            reserveB = newReserveB;
          }
        };

        // Warmup
        for (let i = 0; i < 30; i++) {
          ammSwap();
        }

        // Measurement
        for (let i = 0; i < 50; i++) {
          const time = await PerformanceTimer.measure(() => {
            ammSwap();
          });
          times.push(time);
        }

        return removeOutliers(times);
      };

      const snarkyTimes = await testAMMSwap('snarky');
      const sparkyTimes = await testAMMSwap('sparky');

      const snarkyStats = calculateStats(snarkyTimes);
      const sparkyStats = calculateStats(sparkyTimes);
      const ratio = sparkyStats.mean / snarkyStats.mean;

      console.log(`   Snarky: ${snarkyStats.mean.toFixed(2)}ms (±${snarkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Sparky: ${sparkyStats.mean.toFixed(2)}ms (±${sparkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Ratio: ${ratio.toFixed(2)}x ${ratio < 2.5 ? '✅' : ratio < 4 ? '⚠️' : '❌'}`);

      performanceResults.tests.ammSwap = {
        snarky: snarkyStats,
        sparky: sparkyStats,
        ratio,
        acceptable: ratio < 2.5
      };
    }, 180000);

    test('Token Transfer Batch', async () => {
      console.log('\n💰 Testing Token Transfer Batch Performance...');
      
      const testTokenTransfer = async (backend: 'snarky' | 'sparky'): Promise<bigint[]> => {
        await switchBackend(backend);
        const times: bigint[] = [];

        const batchTransfer = () => {
          for (let i = 0; i < 100; i++) {
            const from = Field(1000000 - i);
            const to = Field(i);
            const amount = Field(100);
            
            // Balance checks
            const newFromBalance = from.sub(amount);
            newFromBalance.assertGreaterThanOrEqual(Field(0));
            
            // Update balances
            const newToBalance = to.add(amount);
          }
        };

        // Warmup
        for (let i = 0; i < 30; i++) {
          batchTransfer();
        }

        // Measurement
        for (let i = 0; i < 50; i++) {
          const time = await PerformanceTimer.measure(() => {
            batchTransfer();
          });
          times.push(time);
        }

        return removeOutliers(times);
      };

      const snarkyTimes = await testTokenTransfer('snarky');
      const sparkyTimes = await testTokenTransfer('sparky');

      const snarkyStats = calculateStats(snarkyTimes);
      const sparkyStats = calculateStats(sparkyTimes);
      const ratio = sparkyStats.mean / snarkyStats.mean;

      console.log(`   Snarky: ${snarkyStats.mean.toFixed(2)}ms (±${snarkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Sparky: ${sparkyStats.mean.toFixed(2)}ms (±${sparkyStats.stdDev.toFixed(2)}ms)`);
      console.log(`   Ratio: ${ratio.toFixed(2)}x ${ratio < 2 ? '✅' : ratio < 3 ? '⚠️' : '❌'}`);

      performanceResults.tests.tokenTransfer = {
        snarky: snarkyStats,
        sparky: sparkyStats,
        ratio,
        acceptable: ratio < 2
      };
    }, 180000);
  });

  afterAll(() => {
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE TEST RESULTS SUMMARY');
    console.log('='.repeat(80));

    // Calculate overall statistics
    const allTests = Object.values(performanceResults.tests) as any[];
    const avgRatio = allTests.reduce((sum, test) => sum + test.ratio, 0) / allTests.length;
    const worstRatio = Math.max(...allTests.map(t => t.ratio));
    const bestRatio = Math.min(...allTests.map(t => t.ratio));
    const acceptableCount = allTests.filter(t => t.acceptable).length;

    console.log('\n📈 Overall Performance:');
    console.log(`   Average ratio: ${avgRatio.toFixed(2)}x`);
    console.log(`   Best ratio: ${bestRatio.toFixed(2)}x`);
    console.log(`   Worst ratio: ${worstRatio.toFixed(2)}x`);
    console.log(`   Acceptable tests: ${acceptableCount}/${allTests.length}`);

    // Performance by category
    console.log('\n📊 Performance by Operation:');
    console.log('─'.repeat(60));
    console.log('Operation               Snarky    Sparky    Ratio   Status');
    console.log('─'.repeat(60));

    for (const [name, result] of Object.entries(performanceResults.tests)) {
      const r = result as any;
      const status = r.acceptable ? '✅' : '❌';
      console.log(
        `${name.padEnd(22)} ${r.snarky.mean.toFixed(1).padStart(7)}ms ${r.sparky.mean.toFixed(1).padStart(7)}ms ${r.ratio.toFixed(2).padStart(7)}x   ${status}`
      );
    }

    // Overall assessment
    const score = 100 - (avgRatio - 1) * 25;
    const finalScore = Math.max(0, Math.min(100, score));
    
    console.log('\n🎯 Performance Score: ' + finalScore.toFixed(0) + '/100');
    
    let recommendation = '';
    if (finalScore >= 80 && acceptableCount === allTests.length) {
      recommendation = '🟢 SHIP - Performance is within acceptable limits';
    } else if (finalScore >= 60) {
      recommendation = '🟡 OPTIMIZE - Some operations need improvement';
    } else {
      recommendation = '🔴 HOLD - Significant optimization required';
    }
    
    console.log('\n📋 Recommendation: ' + recommendation);

    // Critical issues
    const criticalIssues = allTests.filter(t => t.ratio > 3);
    if (criticalIssues.length > 0) {
      console.log('\n🚨 Critical Performance Issues:');
      for (const [name, result] of Object.entries(performanceResults.tests)) {
        const r = result as any;
        if (r.ratio > 3) {
          console.log(`   - ${name}: ${r.ratio.toFixed(2)}x slower`);
        }
      }
    }

    // Save results
    const reportPath = 'sparky-performance-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(performanceResults, null, 2));
    console.log(`\n📁 Detailed report saved to: ${reportPath}`);

    // Generate markdown report
    const markdown = generateMarkdownReport();
    fs.writeFileSync('SPARKY_PERFORMANCE_REPORT.md', markdown);
    console.log(`📄 Markdown report saved to: SPARKY_PERFORMANCE_REPORT.md`);

    console.log('\n' + '='.repeat(80));
  });
});

function generateMarkdownReport(): string {
  const results = performanceResults;
  const allTests = Object.values(results.tests) as any[];
  const avgRatio = allTests.reduce((sum, test) => sum + test.ratio, 0) / allTests.length;
  const score = Math.max(0, Math.min(100, 100 - (avgRatio - 1) * 25));
  
  const status = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
  const recommendation = score >= 80 ? 'SHIP' : score >= 60 ? 'OPTIMIZE' : 'HOLD';

  return `# Sparky vs Snarky Performance Report

**Date**: ${results.timestamp}  
**Status**: ${status} **${recommendation}**  
**Score**: ${score.toFixed(0)}/100  

## Executive Summary

Sparky is on average **${avgRatio.toFixed(2)}x** slower than Snarky across all tested operations.

## Test Environment

- **Platform**: ${results.environment.platform} ${results.environment.arch}
- **CPU**: ${results.environment.cpuModel} (${results.environment.cpus} cores)
- **Memory**: ${results.environment.totalMemory.toFixed(2)} GB
- **Node.js**: ${results.environment.nodeVersion}

## Performance Results

| Operation | Snarky (ms) | Sparky (ms) | Ratio | Status |
|-----------|-------------|-------------|-------|--------|
${Object.entries(results.tests).map(([name, result]) => {
  const r = result as any;
  return `| ${name} | ${r.snarky.mean.toFixed(2)} | ${r.sparky.mean.toFixed(2)} | ${r.ratio.toFixed(2)}x | ${r.acceptable ? '✅' : '❌'} |`;
}).join('\n')}

## Statistical Analysis

All measurements include:
- **Warmup**: 50 iterations
- **Measurements**: 100 iterations
- **Outlier removal**: IQR method
- **Timing precision**: process.hrtime.bigint()

## Recommendations

${score >= 80 ? 
`✅ **Sparky is ready for production use.** Performance is within acceptable thresholds.` :
score >= 60 ?
`⚠️ **Sparky requires optimization before production.** Focus on operations with >3x slowdown.` :
`❌ **Sparky needs significant optimization.** Multiple operations show unacceptable performance.`}

## Critical Issues

${Object.entries(results.tests)
  .filter(([_, r]) => (r as any).ratio > 3)
  .map(([name, r]) => `- **${name}**: ${(r as any).ratio.toFixed(2)}x slower than Snarky`)
  .join('\n') || 'No critical issues found.'}

---

*Generated by o1js performance testing suite*
`;
}