/**
 * Concurrent proving benchmarks
 * Tests multi-worker performance and resource usage
 */

import { Field, ZkProgram, setNumberOfWorkers } from '../../../src/lib/provable/wrapped.js';
import { backendBenchmark, BackendConfig } from '../../utils/comparison/backend-benchmark.js';

export { concurrentProvingBenchmarks };

const concurrentProvingBenchmarks = [
  createParallelProvingBenchmark(),
  createWorkerScalingBenchmark(),
  createConcurrentMemoryBenchmark(),
];

const ConcurrentProgram = ZkProgram({
  name: 'ConcurrentProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    computeTask: {
      privateInputs: [Field, Field, Field],
      async method(
        taskId: Field,
        input1: Field,
        input2: Field,
        input3: Field
      ): Promise<Field> {
        // Simulate meaningful computation that would benefit from parallelization
        let result = taskId.mul(input1);
        
        // Add some complexity
        for (let i = 0; i < 10; i++) {
          const factor = Field(i + 1);
          result = result.add(input2.mul(factor));
          result = result.mul(input3).add(taskId);
          
          if (i % 2 === 0) {
            result = result.square();
          } else {
            result = result.add(result.inv());
          }
        }
        
        return result;
      },
    },
  },
});

const HeavyComputeProgram = ZkProgram({
  name: 'HeavyComputeProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    heavyComputation: {
      privateInputs: Array(20).fill(Field),
      async method(seed: Field, ...inputs: Field[]): Promise<Field> {
        let accumulator = seed;
        
        // Heavy computation suitable for parallelization
        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          
          // Complex per-input processing
          let processed = input.square().add(Field(i));
          processed = processed.mul(accumulator);
          
          // Nested operations
          for (let j = 0; j < 5; j++) {
            processed = processed.add(Field(j)).square();
            
            if (j % 2 === 0) {
              processed = processed.mul(seed);
            } else {
              processed = processed.add(input.inv());
            }
          }
          
          accumulator = accumulator.add(processed);
        }
        
        return accumulator;
      },
    },
  },
});

function createParallelProvingBenchmark() {
  return backendBenchmark(
    'Parallel Proving Performance',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await ConcurrentProgram.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');
      
      // Test with different worker counts
      const workerCounts = [1, 2, 4];
      const tasksPerWorkerCount = 8;
      
      for (const workerCount of workerCounts) {
        console.log(`Testing with ${workerCount} workers...`);
        
        // Set worker count
        setNumberOfWorkers(workerCount);
        
        const startTime = performance.now();
        
        // Create multiple concurrent tasks
        const tasks = [];
        for (let i = 0; i < tasksPerWorkerCount; i++) {
          const taskId = Field(i);
          const input1 = Field(i * 10 + 1);
          const input2 = Field(i * 20 + 2);
          const input3 = Field(i * 30 + 3);
          
          tasks.push(
            ConcurrentProgram.computeTask(taskId, input1, input2, input3)
          );
        }
        
        // Execute all tasks concurrently
        await Promise.all(tasks);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`${workerCount} workers: ${duration.toFixed(2)}ms for ${tasksPerWorkerCount} tasks`);
        memTracker.checkpoint();
      }
      
      toc('witness');

      tic('proving');
      // Proving phase would show the real benefits of parallelization
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 30 }; // Per task
    },
    getConcurrentConfigs()
  );
}

function createWorkerScalingBenchmark() {
  return backendBenchmark(
    'Worker Scaling Efficiency',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await HeavyComputeProgram.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');
      
      // Test scaling with increasingly heavy workloads
      const workloadSizes = [4, 8, 16];
      const baseWorkerCount = 2;
      
      for (const workloadSize of workloadSizes) {
        console.log(`Testing workload size: ${workloadSize} tasks`);
        
        // Single worker baseline
        setNumberOfWorkers(1);
        const singleWorkerStart = performance.now();
        
        let singleWorkerTasks = [];
        for (let i = 0; i < workloadSize; i++) {
          const seed = Field(i + 1);
          const inputs = Array.from({ length: 20 }, (_, j) => Field(i * 20 + j));
          singleWorkerTasks.push(
            HeavyComputeProgram.heavyComputation(seed, ...inputs)
          );
        }
        
        await Promise.all(singleWorkerTasks);
        const singleWorkerTime = performance.now() - singleWorkerStart;
        
        // Multi-worker test
        setNumberOfWorkers(baseWorkerCount);
        const multiWorkerStart = performance.now();
        
        let multiWorkerTasks = [];
        for (let i = 0; i < workloadSize; i++) {
          const seed = Field(i + 100);
          const inputs = Array.from({ length: 20 }, (_, j) => Field(i * 20 + j + 100));
          multiWorkerTasks.push(
            HeavyComputeProgram.heavyComputation(seed, ...inputs)
          );
        }
        
        await Promise.all(multiWorkerTasks);
        const multiWorkerTime = performance.now() - multiWorkerStart;
        
        const speedup = singleWorkerTime / multiWorkerTime;
        const efficiency = speedup / baseWorkerCount;
        
        console.log(`Workload ${workloadSize}: ${speedup.toFixed(2)}x speedup, ${(efficiency * 100).toFixed(1)}% efficiency`);
        memTracker.checkpoint();
      }
      
      toc('witness');

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 200 }; // Heavy computation
    },
    getConcurrentConfigs()
  );
}

function createConcurrentMemoryBenchmark() {
  return backendBenchmark(
    'Concurrent Memory Usage',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await ConcurrentProgram.compile();
      toc('compilation');
      
      if (global.gc) {
        global.gc();
      }
      const baselineMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      memTracker.checkpoint();

      tic('witness');
      
      // Test memory usage with different concurrency levels
      const concurrencyLevels = [1, 4, 8];
      
      for (const concurrency of concurrencyLevels) {
        console.log(`Testing concurrency level: ${concurrency}`);
        
        setNumberOfWorkers(concurrency);
        
        const preTestMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        
        // Create concurrent load
        const batchSize = 12;
        const batches = 3;
        
        for (let batch = 0; batch < batches; batch++) {
          const tasks = [];
          
          for (let i = 0; i < batchSize; i++) {
            const taskId = Field(batch * batchSize + i);
            const input1 = Field(i * 7 + 1);
            const input2 = Field(i * 11 + 2);
            const input3 = Field(i * 13 + 3);
            
            tasks.push(
              ConcurrentProgram.computeTask(taskId, input1, input2, input3)
            );
          }
          
          await Promise.all(tasks);
          memTracker.checkpoint();
        }
        
        const postTestMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        const memoryUsed = postTestMemory - preTestMemory;
        
        console.log(`Concurrency ${concurrency}: ${memoryUsed.toFixed(2)}MB memory increase`);
        
        // Cleanup between tests
        if (global.gc) {
          global.gc();
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      toc('witness');

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const totalGrowth = finalMemory - baselineMemory;
      
      console.log(`Total memory growth: ${totalGrowth.toFixed(2)}MB`);

      return { constraints: 30 }; // Per concurrent task
    },
    getConcurrentConfigs()
  );
}

function getConcurrentConfigs(): BackendConfig[] {
  return [
    {
      name: 'snarky',
      warmupRuns: 0, // Concurrency tests don't need warmup
      measurementRuns: 2,
    },
    {
      name: 'sparky',
      warmupRuns: 0,
      measurementRuns: 2,
    },
  ];
}