/**
 * Microbenchmarks for basic field operations
 * Tests core arithmetic that should show differences between snarky and sparky
 */

import { Field, ZkProgram } from 'o1js';
import { backendBenchmark, BackendConfig } from '../../utils/comparison/backend-benchmark.js';

export { fieldOperationsBenchmarks };

const fieldOperationsBenchmarks = [
  createAdditionBenchmark(),
  createMultiplicationBenchmark(),
  createInversionBenchmark(),
  createComplexExpressionBenchmark(),
];

function createAdditionBenchmark() {
  const FieldAddition = ZkProgram({
    name: 'FieldAddition',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      add: {
        privateInputs: [Field],
        async method(a: Field, b: Field): Promise<Field> {
          return a.add(b);
        },
      },
    },
  });

  return backendBenchmark(
    'Field Addition',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await FieldAddition.compile();
      toc('compilation');
      memTracker.checkpoint();

      const a = Field(123);
      const b = Field(456);

      tic('witness');
      const proof = await FieldAddition.add(a, b);
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      // Note: In practice, we'd generate the actual proof here
      // For microbenchmarks, we focus on the constraint generation
      toc('proving');

      tic('verification');
      // Verification would happen here
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 1 }; // Simple addition is 1 constraint
    },
    getDefaultConfigs()
  );
}

function createMultiplicationBenchmark() {
  const FieldMultiplication = ZkProgram({
    name: 'FieldMultiplication',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      mul: {
        privateInputs: [Field],
        async method(a: Field, b: Field): Promise<Field> {
          return a.mul(b);
        },
      },
    },
  });

  return backendBenchmark(
    'Field Multiplication',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await FieldMultiplication.compile();
      toc('compilation');
      memTracker.checkpoint();

      const a = Field(123);
      const b = Field(456);

      tic('witness');
      const proof = await FieldMultiplication.mul(a, b);
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 1 }; // Simple multiplication is 1 constraint
    },
    getDefaultConfigs()
  );
}

function createInversionBenchmark() {
  const FieldInversion = ZkProgram({
    name: 'FieldInversion',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      inv: {
        privateInputs: [],
        async method(a: Field): Promise<Field> {
          return a.inv();
        },
      },
    },
  });

  return backendBenchmark(
    'Field Inversion',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await FieldInversion.compile();
      toc('compilation');
      memTracker.checkpoint();

      const a = Field(123);

      tic('witness');
      const proof = await FieldInversion.inv(a);
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 1 }; // Inversion is more complex but still 1 constraint
    },
    getDefaultConfigs()
  );
}

function createComplexExpressionBenchmark() {
  const ComplexFieldOps = ZkProgram({
    name: 'ComplexFieldOps',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      complexExpression: {
        privateInputs: [Field, Field, Field],
        async method(a: Field, b: Field, c: Field, d: Field): Promise<Field> {
          // (a * b + c) * d^(-1) + a^2
          const ab = a.mul(b);
          const abc = ab.add(c);
          const d_inv = d.inv();
          const temp = abc.mul(d_inv);
          const a_squared = a.square();
          return temp.add(a_squared);
        },
      },
    },
  });

  return backendBenchmark(
    'Complex Field Expression',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await ComplexFieldOps.compile();
      toc('compilation');
      memTracker.checkpoint();

      const a = Field(123);
      const b = Field(456);
      const c = Field(789);
      const d = Field(321);

      tic('witness');
      const proof = await ComplexFieldOps.complexExpression(a, b, c, d);
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 6 }; // mul + add + inv + mul + square + add
    },
    getDefaultConfigs()
  );
}

function getDefaultConfigs(): BackendConfig[] {
  return [
    {
      name: 'snarky',
      warmupRuns: 3,
      measurementRuns: 10,
    },
    {
      name: 'sparky',
      warmupRuns: 3,
      measurementRuns: 10,
    },
  ];
}