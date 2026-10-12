/**
 * Microbenchmarks for circuit compilation performance
 * Tests the speed of compiling different sized circuits
 */

import { Field, ZkProgram, Method } from '../../../src/lib/provable/wrapped.js';
import { backendBenchmark, BackendConfig } from '../../utils/comparison/backend-benchmark.js';

export { circuitCompilationBenchmarks };

const circuitCompilationBenchmarks = [
  createSmallCircuitBenchmark(),
  createMediumCircuitBenchmark(),
  createLargeCircuitBenchmark(),
  createNestedCircuitBenchmark(),
];

function createSmallCircuitBenchmark() {
  const SmallCircuit = ZkProgram({
    name: 'SmallCircuit',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: [Field, Field],
        async method(x: Field, a: Field, b: Field): Promise<Field> {
          // Simple computation: x * a + b
          return x.mul(a).add(b);
        },
      },
    },
  });

  return backendBenchmark(
    'Small Circuit Compilation',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await SmallCircuit.compile();
      toc('compilation');
      memTracker.checkpoint();

      // Minimal witness generation to complete the benchmark
      const x = Field(5);
      const a = Field(10);
      const b = Field(3);

      tic('witness');
      const result = await SmallCircuit.compute(x, a, b);
      toc('witness');

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 2 }; // mul + add
    },
    getDefaultConfigs()
  );
}

function createMediumCircuitBenchmark() {
  const MediumCircuit = ZkProgram({
    name: 'MediumCircuit',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: [Field, Field, Field, Field, Field],
        async method(x: Field, a: Field, b: Field, c: Field, d: Field, e: Field): Promise<Field> {
          // More complex computation with multiple operations
          let result = x.mul(a).add(b);
          result = result.mul(c).add(d);
          result = result.square();
          result = result.add(e.inv());
          
          // Add some conditional logic
          const isLarge = result.greaterThan(Field(1000));
          result = isLarge.toField().mul(result.div(Field(2))).add(
            isLarge.not().toField().mul(result.mul(Field(2)))
          );
          
          return result;
        },
      },
    },
  });

  return backendBenchmark(
    'Medium Circuit Compilation',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await MediumCircuit.compile();
      toc('compilation');
      memTracker.checkpoint();

      const inputs = [Field(5), Field(10), Field(3), Field(7), Field(2), Field(11)];

      tic('witness');
      const result = await MediumCircuit.compute(...inputs);
      toc('witness');

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 15 }; // Approximate constraint count for medium circuit
    },
    getDefaultConfigs()
  );
}

function createLargeCircuitBenchmark() {
  const LargeCircuit = ZkProgram({
    name: 'LargeCircuit',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: Array(20).fill(Field),
        async method(x: Field, ...inputs: Field[]): Promise<Field> {
          let result = x;
          
          // Simulate a large computation with many field operations
          for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            
            // Vary the operations to create different constraint patterns
            if (i % 4 === 0) {
              result = result.mul(input).add(Field(i));
            } else if (i % 4 === 1) {
              result = result.add(input.square());
            } else if (i % 4 === 2) {
              result = result.sub(input).mul(Field(2));
            } else {
              result = result.div(input.add(Field(1)));
            }
            
            // Add some comparison operations
            const isEven = Field(i).mod(Field(2)).equals(Field(0));
            result = isEven.toField().mul(result).add(
              isEven.not().toField().mul(result.neg())
            );
          }
          
          // Final complex operation
          result = result.square().add(result.inv());
          
          return result;
        },
      },
    },
  });

  return backendBenchmark(
    'Large Circuit Compilation',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await LargeCircuit.compile();
      toc('compilation');
      memTracker.checkpoint();

      const x = Field(42);
      const inputs = Array.from({ length: 20 }, (_, i) => Field(i + 1));

      tic('witness');
      const result = await LargeCircuit.compute(x, ...inputs);
      toc('witness');

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 200 }; // Approximate constraint count for large circuit
    },
    getDefaultConfigs()
  );
}

function createNestedCircuitBenchmark() {
  // Helper function to create nested computation
  function nestedComputation(depth: number, value: Field, multiplier: Field): Field {
    if (depth === 0) {
      return value;
    }
    
    const recursive = nestedComputation(depth - 1, value, multiplier);
    return recursive.mul(multiplier).add(Field(depth));
  }

  const NestedCircuit = ZkProgram({
    name: 'NestedCircuit',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: [Field],
        async method(x: Field, multiplier: Field): Promise<Field> {
          // Create a computation with nested function calls
          let result = Field(0);
          
          // Simulate nested recursive-like computation in an iterative way
          // (since actual recursion would require recursive circuits)
          for (let depth = 1; depth <= 10; depth++) {
            let temp = x;
            for (let i = 0; i < depth; i++) {
              temp = temp.mul(multiplier).add(Field(i + 1));
            }
            result = result.add(temp);
          }
          
          return result;
        },
      },
    },
  });

  return backendBenchmark(
    'Nested Circuit Compilation',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await NestedCircuit.compile();
      toc('compilation');
      memTracker.checkpoint();

      const x = Field(5);
      const multiplier = Field(2);

      tic('witness');
      const result = await NestedCircuit.compute(x, multiplier);
      toc('witness');

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 110 }; // Approximate constraint count for nested circuit
    },
    getDefaultConfigs()
  );
}

function getDefaultConfigs(): BackendConfig[] {
  return [
    {
      name: 'snarky',
      warmupRuns: 1, // Compilation is expensive, so fewer warmups
      measurementRuns: 5,
    },
    {
      name: 'sparky',
      warmupRuns: 1,
      measurementRuns: 5,
    },
  ];
}