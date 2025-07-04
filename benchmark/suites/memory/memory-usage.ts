/**
 * Memory usage benchmarks
 * Tests peak memory consumption and allocation patterns
 */

import { Field, ZkProgram } from '../../../src/lib/provable/wrapped.js';
import { backendBenchmark, BackendConfig } from '../../utils/comparison/backend-benchmark.js';

export { memoryUsageBenchmarks };

const memoryUsageBenchmarks = [
  createPeakMemoryBenchmark(),
  createLargeCircuitMemoryBenchmark(),
  createAllocationPatternBenchmark(),
];

const PeakMemoryProgram = ZkProgram({
  name: 'PeakMemoryProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    memoryIntensive: {
      privateInputs: Array(50).fill(Field),
      async method(input: Field, ...values: Field[]): Promise<Field> {
        // Create many intermediate values to test memory allocation
        let intermediates: Field[] = [];
        
        for (let i = 0; i < values.length; i++) {
          const base = values[i];
          
          // Create multiple derived values
          const squared = base.square();
          const cubed = squared.mul(base);
          const quartic = cubed.mul(base);
          const quintic = quartic.mul(base);
          
          intermediates.push(squared, cubed, quartic, quintic);
          
          // Simulate complex computation tree
          if (i > 0) {
            const prev = intermediates[i - 1];
            const combined = prev.add(quintic);
            const processed = combined.mul(input);
            intermediates.push(processed);
          }
        }
        
        // Final reduction
        let result = input;
        for (const intermediate of intermediates) {
          result = result.add(intermediate);
        }
        
        return result;
      },
    },
  },
});

const LargeCircuitProgram = ZkProgram({
  name: 'LargeCircuitProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    largeComputation: {
      privateInputs: Array(100).fill(Field),
      async method(base: Field, ...inputs: Field[]): Promise<Field> {
        // Create a large number of constraints to test memory scaling
        let accumulator = base;
        let temporaries: Field[] = [];
        
        // Phase 1: Create many temporary values
        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          
          // Complex computation per input
          let temp = input.mul(Field(i + 1));
          temp = temp.add(accumulator);
          temp = temp.square();
          
          if (i % 3 === 0) {
            temp = temp.inv();
          } else if (i % 3 === 1) {
            temp = temp.mul(temp);
          } else {
            temp = temp.add(Field(42));
          }
          
          temporaries.push(temp);
          accumulator = accumulator.add(temp);
        }
        
        // Phase 2: Combine temporaries in complex ways
        let finalResult = accumulator;
        
        for (let i = 0; i < temporaries.length - 1; i += 2) {
          const combined = temporaries[i].mul(temporaries[i + 1]);
          finalResult = finalResult.add(combined);
        }
        
        // Phase 3: Final processing
        finalResult = finalResult.square().add(base);
        
        return finalResult;
      },
    },
  },
});

const AllocationPatternProgram = ZkProgram({
  name: 'AllocationPatternProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    stressAllocation: {
      privateInputs: [Field, Field, Field],
      async method(
        seed: Field,
        param1: Field,
        param2: Field,
        param3: Field
      ): Promise<Field> {
        // Test different allocation patterns
        
        // Pattern 1: Many small allocations
        let smallAllocations: Field[] = [];
        for (let i = 0; i < 20; i++) {
          const value = seed.add(Field(i));
          smallAllocations.push(value.square());
        }
        
        // Pattern 2: Nested computations
        let nested = seed;
        for (let depth = 0; depth < 10; depth++) {
          let levelResult = param1;
          
          for (let width = 0; width < 5; width++) {
            const temp = nested.mul(Field(width + 1));
            const processed = temp.add(param2);
            levelResult = levelResult.add(processed);
          }
          
          nested = levelResult.mul(param3);
        }
        
        // Pattern 3: Bulk operations
        let bulk = param1;
        const bulkValues = smallAllocations.map(v => v.add(nested));
        
        for (const value of bulkValues) {
          bulk = bulk.mul(value).add(param2);
        }
        
        return bulk.add(nested);
      },
    },
  },
});

function createPeakMemoryBenchmark() {
  return backendBenchmark(
    'Peak Memory Usage',
    async (tic, toc, memTracker) => {
      // Force garbage collection before starting
      if (global.gc) {
        global.gc();
      }
      
      tic('compilation');
      await PeakMemoryProgram.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');
      
      const input = Field(42);
      const values = Array.from({ length: 50 }, (_, i) => Field(i + 1));
      
      const result = await PeakMemoryProgram.memoryIntensive(input, ...values);
      
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      // Peak memory usually occurs during proving
      memTracker.checkpoint();
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 300 }; // Estimate based on operations
    },
    getMemoryConfigs()
  );
}

function createLargeCircuitMemoryBenchmark() {
  return backendBenchmark(
    'Large Circuit Memory',
    async (tic, toc, memTracker) => {
      if (global.gc) {
        global.gc();
      }
      
      tic('compilation');
      await LargeCircuitProgram.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');
      
      const base = Field(1);
      const inputs = Array.from({ length: 100 }, (_, i) => Field(i + 1));
      
      const result = await LargeCircuitProgram.largeComputation(base, ...inputs);
      
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      memTracker.checkpoint();
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 1000 }; // Large circuit with many constraints
    },
    getMemoryConfigs()
  );
}

function createAllocationPatternBenchmark() {
  return backendBenchmark(
    'Allocation Patterns',
    async (tic, toc, memTracker) => {
      if (global.gc) {
        global.gc();
      }
      
      tic('compilation');
      await AllocationPatternProgram.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');
      
      const seed = Field(123);
      const param1 = Field(456);
      const param2 = Field(789);
      const param3 = Field(321);
      
      // Run multiple iterations to test allocation patterns
      for (let i = 0; i < 3; i++) {
        const result = await AllocationPatternProgram.stressAllocation(
          seed.add(Field(i)),
          param1,
          param2,
          param3
        );
        memTracker.checkpoint();
      }
      
      toc('witness');

      tic('proving');
      memTracker.checkpoint();
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 200 }; // Multiple pattern tests
    },
    getMemoryConfigs()
  );
}

function getMemoryConfigs(): BackendConfig[] {
  return [
    {
      name: 'snarky',
      warmupRuns: 1,
      measurementRuns: 3, // Fewer runs for memory tests
    },
    {
      name: 'sparky',
      warmupRuns: 1,
      measurementRuns: 3,
    },
  ];
}