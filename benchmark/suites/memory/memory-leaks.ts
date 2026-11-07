/**
 * Memory leak detection benchmarks
 * Tests long-running processes and memory cleanup
 */

import { Field, ZkProgram } from '../../../src/lib/provable/wrapped.js';
import { backendBenchmark, BackendConfig } from '../../utils/comparison/backend-benchmark.js';

export { memoryLeakBenchmarks };

const memoryLeakBenchmarks = [
  createLongRunningBenchmark(),
  createRepetitiveOperationsBenchmark(),
  createCleanupTestBenchmark(),
];

const LeakTestProgram = ZkProgram({
  name: 'LeakTestProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    simpleOperation: {
      privateInputs: [Field, Field],
      async method(x: Field, a: Field, b: Field): Promise<Field> {
        const result = x.mul(a).add(b).square();
        return result;
      },
    },
    
    complexOperation: {
      privateInputs: [Field, Field, Field, Field],
      async method(
        x: Field,
        a: Field,
        b: Field,
        c: Field,
        d: Field
      ): Promise<Field> {
        let temp = x.mul(a);
        temp = temp.add(b);
        temp = temp.mul(c);
        temp = temp.add(d);
        temp = temp.square();
        temp = temp.add(x.inv());
        return temp;
      },
    },
  },
});

const RepetitiveProgram = ZkProgram({
  name: 'RepetitiveProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    repeatOperation: {
      privateInputs: [Field],
      async method(input: Field, multiplier: Field): Promise<Field> {
        let result = input;
        
        // Perform the same operation many times
        for (let i = 0; i < 20; i++) {
          result = result.mul(multiplier).add(Field(i));
          result = result.square();
          
          if (i % 3 === 0) {
            result = result.inv();
          }
        }
        
        return result;
      },
    },
  },
});

function createLongRunningBenchmark() {
  return backendBenchmark(
    'Long Running Process',
    async (tic, toc, memTracker) => {
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      
      tic('compilation');
      await LeakTestProgram.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');
      
      // Simulate a long-running process with many operations
      const iterations = 50;
      const memoryCheckpoints: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const x = Field(i + 1);
        const a = Field((i * 2) + 1);
        const b = Field((i * 3) + 1);
        
        // Alternate between simple and complex operations
        if (i % 2 === 0) {
          await LeakTestProgram.simpleOperation(x, a, b);
        } else {
          const c = Field((i * 4) + 1);
          const d = Field((i * 5) + 1);
          await LeakTestProgram.complexOperation(x, a, b, c, d);
        }
        
        // Track memory usage every 10 iterations
        if (i % 10 === 0) {
          const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
          memoryCheckpoints.push(currentMemory);
          memTracker.checkpoint();
        }
        
        // Force GC periodically to test cleanup
        if (i % 20 === 0 && global.gc) {
          global.gc();
        }
      }
      
      toc('witness');

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      // Calculate memory growth
      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryGrowth = finalMemory - initialMemory;
      
      console.log(`Memory growth over ${iterations} iterations: ${memoryGrowth.toFixed(2)}MB`);
      console.log(`Memory checkpoints: ${memoryCheckpoints.map(m => m.toFixed(1)).join(', ')}MB`);

      return { constraints: 5 }; // Simple operations
    },
    getLeakConfigs()
  );
}

function createRepetitiveOperationsBenchmark() {
  return backendBenchmark(
    'Repetitive Operations',
    async (tic, toc, memTracker) => {
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      
      tic('compilation');
      await RepetitiveProgram.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');
      
      // Perform the same operation many times to test for cumulative leaks
      const repetitions = 30;
      
      for (let i = 0; i < repetitions; i++) {
        const input = Field(42);
        const multiplier = Field(2);
        
        await RepetitiveProgram.repeatOperation(input, multiplier);
        
        if (i % 10 === 0) {
          memTracker.checkpoint();
        }
      }
      
      toc('witness');

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryGrowth = finalMemory - initialMemory;
      
      console.log(`Memory growth over ${repetitions} repetitions: ${memoryGrowth.toFixed(2)}MB`);

      return { constraints: 60 }; // 20 operations * 3 constraints each
    },
    getLeakConfigs()
  );
}

function createCleanupTestBenchmark() {
  return backendBenchmark(
    'Memory Cleanup Test',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await LeakTestProgram.compile();
      toc('compilation');
      
      // Get baseline memory usage
      if (global.gc) {
        global.gc();
      }
      const baselineMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      memTracker.checkpoint();

      tic('witness');
      
      // Create memory pressure, then test cleanup
      const phases = 3;
      const operationsPerPhase = 20;
      
      for (let phase = 0; phase < phases; phase++) {
        console.log(`Phase ${phase + 1}: Creating memory pressure...`);
        
        // Create memory pressure
        for (let i = 0; i < operationsPerPhase; i++) {
          const x = Field(i + phase * 100);
          const a = Field(i * 2 + 1);
          const b = Field(i * 3 + 1);
          const c = Field(i * 4 + 1);
          const d = Field(i * 5 + 1);
          
          await LeakTestProgram.complexOperation(x, a, b, c, d);
        }
        
        const pressureMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`Memory after pressure phase ${phase + 1}: ${pressureMemory.toFixed(2)}MB`);
        
        // Force cleanup
        if (global.gc) {
          global.gc();
        }
        
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const cleanupMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`Memory after cleanup phase ${phase + 1}: ${cleanupMemory.toFixed(2)}MB`);
        
        memTracker.checkpoint();
      }
      
      toc('witness');

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      // Final cleanup and measurement
      if (global.gc) {
        global.gc();
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const totalGrowth = finalMemory - baselineMemory;
      
      console.log(`Total memory growth: ${totalGrowth.toFixed(2)}MB`);
      console.log(`Memory cleanup efficiency: ${totalGrowth < 10 ? 'Good' : 'Poor'}`);

      return { constraints: 8 }; // Complex operation constraints
    },
    getLeakConfigs()
  );
}

function getLeakConfigs(): BackendConfig[] {
  return [
    {
      name: 'snarky',
      warmupRuns: 0, // No warmup for leak tests
      measurementRuns: 1, // Single run to track memory over time
    },
    {
      name: 'sparky',
      warmupRuns: 0,
      measurementRuns: 1,
    },
  ];
}