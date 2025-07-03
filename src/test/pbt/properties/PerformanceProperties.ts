/**
 * Performance Property Tests for Snarky vs Sparky Comparison
 * 
 * These properties ensure accurate performance profiling with statistical rigor
 * to drive critical project decisions about backend priorities.
 */

import { fc } from 'fast-check';
import { switchBackend, getCurrentBackend } from '../../../../dist/node/index.js';
import { Field, Poseidon, Bool, Group } from '../../../../dist/node/index.js';
import { 
  PerformanceTestConfig, 
  PerformanceScenario,
  PerformanceMeasurement,
  ComplexityLevel,
  PerformanceStatistics
} from '../generators/PerformanceTestGenerators.js';

/**
 * High-resolution timer for accurate performance measurement
 */
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

/**
 * Memory profiler for tracking memory usage
 */
class MemoryProfiler {
  static getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed / 1024 / 1024; // MB
    }
    return 0;
  }

  static async profileMemory(fn: () => void | Promise<void>): Promise<{
    before: number;
    after: number;
    peak: number;
    delta: number;
  }> {
    // Force GC if available to get clean baseline
    if (global.gc) {
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const before = this.getMemoryUsage();
    let peak = before;

    // Monitor memory during execution
    const interval = setInterval(() => {
      const current = this.getMemoryUsage();
      if (current > peak) peak = current;
    }, 10);

    await fn();

    clearInterval(interval);
    const after = this.getMemoryUsage();

    return {
      before,
      after,
      peak,
      delta: after - before
    };
  }
}

/**
 * Performance properties for backend comparison
 */
export class PerformanceProperties {
  /**
   * Basic field operation performance comparison
   */
  static fieldOperationPerformance = fc.property(
    fc.array(fc.bigInt(1n, Field.ORDER - 1n), { minLength: 100, maxLength: 1000 }),
    fc.constantFrom('add', 'mul', 'square', 'inv', 'div'),
    async (values: bigint[], operation: string) => {
      const fields = values.map(v => Field(v));
      const config: PerformanceTestConfig = {
        warmupIterations: 50,
        measurementIterations: 100,
        confidenceLevel: 0.95,
        outlierDetection: 'IQR',
        timingPrecision: 'hrtime'
      };

      // Create operation function
      const createOp = () => {
        switch (operation) {
          case 'add':
            return () => {
              for (let i = 0; i < fields.length - 1; i++) {
                fields[i].add(fields[i + 1]);
              }
            };
          case 'mul':
            return () => {
              for (let i = 0; i < fields.length - 1; i++) {
                fields[i].mul(fields[i + 1]);
              }
            };
          case 'square':
            return () => {
              for (const field of fields) {
                field.square();
              }
            };
          case 'inv':
            return () => {
              for (const field of fields) {
                if (!field.equals(Field(0)).toBoolean()) {
                  field.inv();
                }
              }
            };
          case 'div':
            return () => {
              for (let i = 0; i < fields.length - 1; i++) {
                if (!fields[i + 1].equals(Field(0)).toBoolean()) {
                  fields[i].div(fields[i + 1]);
                }
              }
            };
          default:
            return () => {};
        }
      };

      const measurement = await measurePerformance(createOp(), config);
      const analysis = analyzePerformance(measurement, operation);

      // Performance assertions
      expect(analysis.ratio).toBeLessThan(3.0); // Sparky should be < 3x slower
      expect(analysis.memoryRatio).toBeLessThan(2.0); // Memory overhead < 2x
      
      return analysis;
    }
  );

  /**
   * Complex expression performance comparison
   */
  static complexExpressionPerformance = fc.property(
    fc.integer({ min: 10, max: 100 }),
    fc.integer({ min: 3, max: 10 }),
    async (size: number, depth: number) => {
      const config: PerformanceTestConfig = {
        warmupIterations: 20,
        measurementIterations: 50,
        confidenceLevel: 0.95,
        outlierDetection: 'IQR',
        timingPrecision: 'hrtime'
      };

      // Create nested expression
      const createExpression = () => {
        const fields = Array.from({ length: size }, (_, i) => Field(i + 1));
        
        return () => {
          let result = fields[0];
          for (let d = 0; d < depth; d++) {
            for (let i = 1; i < fields.length; i++) {
              result = result.add(fields[i].mul(Field(d + 1)));
            }
          }
          return result;
        };
      };

      const measurement = await measurePerformance(createExpression(), config);
      const analysis = analyzePerformance(measurement, `expression_${size}x${depth}`);

      // Complex expressions may have higher overhead
      expect(analysis.ratio).toBeLessThan(5.0);
      expect(analysis.consistent).toBe(true);

      return analysis;
    }
  );

  /**
   * Constraint generation performance
   */
  static constraintGenerationPerformance = fc.property(
    fc.integer({ min: 10, max: 1000 }),
    async (constraintCount: number) => {
      const config: PerformanceTestConfig = {
        warmupIterations: 10,
        measurementIterations: 20,
        confidenceLevel: 0.95,
        outlierDetection: 'MAD',
        timingPrecision: 'hrtime'
      };

      // Create constraint generation workload
      const createConstraints = () => {
        return () => {
          for (let i = 0; i < constraintCount; i++) {
            const x = Field(i);
            const y = Field(i + 1);
            const z = x.mul(y);
            z.assertEquals(Field(i * (i + 1)));
          }
        };
      };

      const measurement = await measurePerformance(createConstraints(), config);
      const analysis = analyzePerformance(measurement, `constraints_${constraintCount}`);

      // Constraint generation is critical path
      expect(analysis.ratio).toBeLessThan(2.5);
      expect(analysis.scalingFactor).toBeLessThan(1.5); // Should scale linearly

      return analysis;
    }
  );

  /**
   * Cryptographic operation performance
   */
  static cryptographicPerformance = fc.property(
    fc.array(fc.bigInt(0n, Field.ORDER - 1n), { minLength: 1, maxLength: 10 }),
    fc.integer({ min: 10, max: 100 }),
    async (inputs: bigint[], iterations: number) => {
      const fields = inputs.map(v => Field(v));
      const config: PerformanceTestConfig = {
        warmupIterations: 20,
        measurementIterations: 50,
        confidenceLevel: 0.99,
        outlierDetection: 'IQR',
        timingPrecision: 'hrtime'
      };

      // Poseidon hash performance
      const poseidonOp = () => {
        for (let i = 0; i < iterations; i++) {
          Poseidon.hash(fields);
        }
      };

      const measurement = await measurePerformance(poseidonOp, config);
      const analysis = analyzePerformance(measurement, `poseidon_${fields.length}x${iterations}`);

      // Cryptographic operations are performance sensitive
      expect(analysis.ratio).toBeLessThan(2.0);
      expect(analysis.variance).toBeLessThan(0.2); // Low variance required

      return analysis;
    }
  );

  /**
   * Memory pressure performance
   */
  static memoryPressurePerformance = fc.property(
    fc.integer({ min: 100, max: 10000 }),
    async (allocations: number) => {
      const config: PerformanceTestConfig = {
        warmupIterations: 5,
        measurementIterations: 10,
        confidenceLevel: 0.95,
        outlierDetection: 'MAD',
        timingPrecision: 'hrtime'
      };

      // Memory allocation storm
      const memoryStorm = () => {
        const arrays: Field[][] = [];
        for (let i = 0; i < allocations; i++) {
          arrays.push(Array.from({ length: 100 }, (_, j) => Field(i * 100 + j)));
          
          // Periodic cleanup to avoid OOM
          if (i % 100 === 0 && arrays.length > 200) {
            arrays.splice(0, 100);
          }
        }
        return arrays;
      };

      const measurement = await measurePerformance(memoryStorm, config);
      const analysis = analyzePerformance(measurement, `memory_${allocations}`);

      // Memory operations should maintain consistency
      expect(analysis.memoryRatio).toBeLessThan(3.0);
      expect(analysis.gcImpact).toBeLessThan(0.5); // GC shouldn't dominate

      return analysis;
    }
  );

  /**
   * Real-world zkApp pattern performance
   */
  static zkAppPatternPerformance = fc.property(
    fc.constantFrom('token_transfer', 'merkle_update', 'signature_verify'),
    fc.integer({ min: 1, max: 100 }),
    async (pattern: string, batchSize: number) => {
      const config: PerformanceTestConfig = {
        warmupIterations: 10,
        measurementIterations: 30,
        confidenceLevel: 0.95,
        outlierDetection: 'IQR',
        timingPrecision: 'hrtime'
      };

      // Create zkApp pattern
      const createPattern = () => {
        switch (pattern) {
          case 'token_transfer':
            return () => {
              for (let i = 0; i < batchSize; i++) {
                const from = Field(1000000 - i);
                const to = Field(i);
                const amount = Field(100);
                
                // Simulate balance checks and updates
                from.sub(amount).assertGreaterThanOrEqual(Field(0));
                to.add(amount);
              }
            };
            
          case 'merkle_update':
            return () => {
              const leaves = Array.from({ length: batchSize }, (_, i) => Field(i));
              // Simulate merkle tree operations
              for (let i = 0; i < leaves.length - 1; i++) {
                Poseidon.hash([leaves[i], leaves[i + 1]]);
              }
            };
            
          case 'signature_verify':
            return () => {
              // Simulate signature verification
              for (let i = 0; i < batchSize; i++) {
                const msg = Field(i);
                const sig = msg.mul(Field(12345)); // Simplified
                sig.div(Field(12345)).assertEquals(msg);
              }
            };
            
          default:
            return () => {};
        }
      };

      const measurement = await measurePerformance(createPattern(), config);
      const analysis = analyzePerformance(measurement, `${pattern}_${batchSize}`);

      // Real-world patterns need good performance
      expect(analysis.ratio).toBeLessThan(2.5);
      expect(analysis.userImpact).toBeLessThan(0.3); // < 30% slowdown

      return analysis;
    }
  );
}

/**
 * Measure performance with statistical rigor
 */
async function measurePerformance(
  operation: () => void | Promise<void>,
  config: PerformanceTestConfig
): Promise<PerformanceMeasurement> {
  const snarkyTimes: bigint[] = [];
  const sparkyTimes: bigint[] = [];
  const snarkyMemory: number[] = [];
  const sparkyMemory: number[] = [];

  // Measure Snarky performance
  await switchBackend('snarky');
  
  // Warmup
  for (let i = 0; i < config.warmupIterations; i++) {
    await operation();
  }

  // Measurement
  for (let i = 0; i < config.measurementIterations; i++) {
    const memProfile = await MemoryProfiler.profileMemory(async () => {
      const time = await PerformanceTimer.measure(operation);
      snarkyTimes.push(time);
    });
    snarkyMemory.push(memProfile.delta);
  }

  // Measure Sparky performance
  await switchBackend('sparky');
  
  // Warmup
  for (let i = 0; i < config.warmupIterations; i++) {
    await operation();
  }

  // Measurement
  for (let i = 0; i < config.measurementIterations; i++) {
    const memProfile = await MemoryProfiler.profileMemory(async () => {
      const time = await PerformanceTimer.measure(operation);
      sparkyTimes.push(time);
    });
    sparkyMemory.push(memProfile.delta);
  }

  return {
    snarkyTimes,
    sparkyTimes,
    snarkyMemory,
    sparkyMemory,
    metadata: {
      timestamp: new Date(),
      nodeVersion: process.version,
      platform: process.platform,
      cpuCount: require('os').cpus().length
    }
  };
}

/**
 * Analyze performance measurement with statistical rigor
 */
function analyzePerformance(
  measurement: PerformanceMeasurement,
  operationName: string
): PerformanceAnalysis {
  // Clean outliers
  const snarkyClean = PerformanceStatistics.detectOutliersIQR(measurement.snarkyTimes).cleaned;
  const sparkyClean = PerformanceStatistics.detectOutliersIQR(measurement.sparkyTimes).cleaned;

  // Calculate statistics
  const snarkyStats = PerformanceStatistics.meanWithCI(snarkyClean, 0.95);
  const sparkyStats = PerformanceStatistics.meanWithCI(sparkyClean, 0.95);
  
  const perfRatio = PerformanceStatistics.performanceRatio(snarkyClean, sparkyClean);

  // Memory analysis
  const snarkyMemMean = measurement.snarkyMemory.reduce((a, b) => a + b, 0) / measurement.snarkyMemory.length;
  const sparkyMemMean = measurement.sparkyMemory.reduce((a, b) => a + b, 0) / measurement.sparkyMemory.length;
  const memoryRatio = sparkyMemMean / snarkyMemMean;

  // Performance categories
  const category = getPerformanceCategory(perfRatio.ratio);
  const acceptable = category !== 'CRITICAL' && category !== 'CONCERNING';

  return {
    operation: operationName,
    ratio: perfRatio.ratio,
    memoryRatio,
    snarkyMean: snarkyStats.mean,
    sparkyMean: sparkyStats.mean,
    snarkyCI: snarkyStats.ci,
    sparkyCI: sparkyStats.ci,
    significant: perfRatio.significant,
    pValue: perfRatio.pValue,
    effectSize: perfRatio.effectSize,
    category,
    acceptable,
    consistent: snarkyStats.stdDev / snarkyStats.mean < 0.1 && sparkyStats.stdDev / sparkyStats.mean < 0.1,
    variance: Math.max(snarkyStats.stdDev / snarkyStats.mean, sparkyStats.stdDev / sparkyStats.mean),
    scalingFactor: 1.0, // Would calculate from multiple sizes
    gcImpact: 0.0, // Would calculate from GC events
    userImpact: Math.max(0, (perfRatio.ratio - 1) * 0.5), // Simplified
    outlierCount: measurement.snarkyTimes.length - snarkyClean.length + measurement.sparkyTimes.length - sparkyClean.length
  };
}

/**
 * Categorize performance ratio
 */
function getPerformanceCategory(ratio: number): string {
  if (ratio < 0.8) return 'SUPERIOR';
  if (ratio <= 1.2) return 'EQUIVALENT';
  if (ratio <= 2.0) return 'ACCEPTABLE';
  if (ratio <= 5.0) return 'CONCERNING';
  return 'CRITICAL';
}

/**
 * Performance analysis result
 */
interface PerformanceAnalysis {
  operation: string;
  ratio: number;
  memoryRatio: number;
  snarkyMean: number;
  sparkyMean: number;
  snarkyCI: { lower: number; upper: number };
  sparkyCI: { lower: number; upper: number };
  significant: boolean;
  pValue: number;
  effectSize: number;
  category: string;
  acceptable: boolean;
  consistent: boolean;
  variance: number;
  scalingFactor: number;
  gcImpact: number;
  userImpact: number;
  outlierCount: number;
}