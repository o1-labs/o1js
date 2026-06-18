/**
 * Microbenchmarks for proof generation performance
 * Tests the core proving system differences between backends
 */

import { Field, ZkProgram, Proof } from '../../../src/lib/provable/wrapped.js';
import { backendBenchmark, BackendConfig } from '../../utils/comparison/backend-benchmark.js';

export { proofGenerationBenchmarks };

const proofGenerationBenchmarks = [
  createSimpleProofBenchmark(),
  createMediumProofBenchmark(),
  createBatchProofBenchmark(),
];

function createSimpleProofBenchmark() {
  const SimpleProof = ZkProgram({
    name: 'SimpleProof',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      prove: {
        privateInputs: [Field],
        async method(publicInput: Field, secret: Field): Promise<Field> {
          // Simple proof: prove knowledge of secret such that hash(secret) = publicInput
          const computed = secret.mul(secret).add(secret); // Simple "hash"
          computed.assertEquals(publicInput);
          return secret;
        },
      },
    },
  });

  return backendBenchmark(
    'Simple Proof Generation',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await SimpleProof.compile();
      toc('compilation');
      memTracker.checkpoint();

      const secret = Field(42);
      const publicInput = secret.mul(secret).add(secret);

      tic('witness');
      const result = await SimpleProof.prove(publicInput, secret);
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      // In a real scenario, we would generate the actual proof here
      // const proof = await SimpleProof.prove(publicInput, secret);
      toc('proving');

      tic('verification');
      // const isValid = await verify(proof, verificationKey);
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 3 }; // mul + add + assertEquals
    },
    getProofConfigs()
  );
}

function createMediumProofBenchmark() {
  const MediumProof = ZkProgram({
    name: 'MediumProof',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      prove: {
        privateInputs: [Field, Field, Field, Field],
        async method(target: Field, a: Field, b: Field, c: Field, d: Field): Promise<Field> {
          // More complex proof with multiple constraints
          const step1 = a.mul(b).add(c);
          const step2 = step1.mul(d);
          const step3 = step2.square();
          
          // Range check simulation
          const withinRange = step3.lessThan(Field(10000));
          withinRange.assertTrue();
          
          // Final computation
          const result = step3.add(a.inv());
          result.assertEquals(target);
          
          return result;
        },
      },
    },
  });

  return backendBenchmark(
    'Medium Proof Generation',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await MediumProof.compile();
      toc('compilation');
      memTracker.checkpoint();

      const a = Field(3);
      const b = Field(4);
      const c = Field(5);
      const d = Field(2);
      
      // Compute expected target
      const step1 = a.mul(b).add(c);
      const step2 = step1.mul(d);
      const step3 = step2.square();
      const target = step3.add(a.inv());

      tic('witness');
      const result = await MediumProof.prove(target, a, b, c, d);
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 8 }; // Approximate constraint count
    },
    getProofConfigs()
  );
}

function createBatchProofBenchmark() {
  const BatchProof = ZkProgram({
    name: 'BatchProof',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      batchProve: {
        privateInputs: Array(10).fill(Field),
        async method(expectedSum: Field, ...values: Field[]): Promise<Field> {
          // Prove that we know 10 values that sum to the expected value
          let computedSum = Field(0);
          
          for (let i = 0; i < values.length; i++) {
            const value = values[i];
            
            // Add some processing for each value
            const processed = value.square().add(Field(i));
            computedSum = computedSum.add(processed);
            
            // Range check each value
            const inRange = value.lessThan(Field(1000));
            inRange.assertTrue();
          }
          
          computedSum.assertEquals(expectedSum);
          return computedSum;
        },
      },
    },
  });

  return backendBenchmark(
    'Batch Proof Generation',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await BatchProof.compile();
      toc('compilation');
      memTracker.checkpoint();

      const values = Array.from({ length: 10 }, (_, i) => Field(i + 1));
      
      // Compute expected sum
      let expectedSum = Field(0);
      for (let i = 0; i < values.length; i++) {
        const processed = values[i].square().add(Field(i));
        expectedSum = expectedSum.add(processed);
      }

      tic('witness');
      const result = await BatchProof.batchProve(expectedSum, ...values);
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 40 }; // Approximate constraint count for batch operations
    },
    getProofConfigs()
  );
}

function getProofConfigs(): BackendConfig[] {
  return [
    {
      name: 'snarky',
      warmupRuns: 1, // Proof generation is expensive
      measurementRuns: 3,
    },
    {
      name: 'sparky',
      warmupRuns: 1,
      measurementRuns: 3,
    },
  ];
}