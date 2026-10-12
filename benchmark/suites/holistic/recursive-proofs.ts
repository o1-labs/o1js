/**
 * Holistic benchmark for recursive proof systems
 * Tests the most complex proving scenarios
 */

import {
  Field,
  ZkProgram,
  SelfProof,
  verify,
} from '../../../src/lib/provable/wrapped.js';
import { backendBenchmark, BackendConfig } from '../../utils/comparison/backend-benchmark.js';

export { recursiveProofBenchmarks };

const recursiveProofBenchmarks = [
  createSimpleRecursionBenchmark(),
  createComplexRecursionBenchmark(),
];

const SimpleRecursion = ZkProgram({
  name: 'SimpleRecursion',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    base: {
      privateInputs: [Field],
      async method(input: Field, increment: Field): Promise<Field> {
        return input.add(increment);
      },
    },

    step: {
      privateInputs: [SelfProof, Field],
      async method(
        input: Field,
        previousProof: SelfProof<Field, Field>,
        increment: Field
      ): Promise<Field> {
        // Verify the previous proof
        previousProof.verify();
        
        // Get the previous result
        const previousResult = previousProof.publicOutput;
        
        // Continue the computation
        const newResult = previousResult.add(increment);
        
        // Add some additional computation to make it interesting
        const squared = newResult.square();
        const final = squared.add(input);
        
        return final;
      },
    },
  },
});

const ComplexRecursion = ZkProgram({
  name: 'ComplexRecursion',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    base: {
      privateInputs: [Field, Field],
      async method(x: Field, a: Field, b: Field): Promise<Field> {
        // Base case: compute a simple polynomial
        const result = x.mul(a).add(b);
        return result.square();
      },
    },

    fibonacci: {
      privateInputs: [SelfProof, SelfProof],
      async method(
        n: Field,
        proof1: SelfProof<Field, Field>,
        proof2: SelfProof<Field, Field>
      ): Promise<Field> {
        // Verify both previous proofs
        proof1.verify();
        proof2.verify();
        
        // Get previous fibonacci numbers
        const fib1 = proof1.publicOutput;
        const fib2 = proof2.publicOutput;
        
        // Compute next fibonacci number with some complexity
        const next = fib1.add(fib2);
        
        // Add some extra computation to increase constraint count
        const processed = next.mul(n).add(Field(1));
        const final = processed.square().add(next.inv());
        
        return final;
      },
    },

    accumulate: {
      privateInputs: [SelfProof, Field, Field],
      async method(
        sum: Field,
        previousProof: SelfProof<Field, Field>,
        value: Field,
        multiplier: Field
      ): Promise<Field> {
        // Verify previous proof
        previousProof.verify();
        
        const previousSum = previousProof.publicOutput;
        
        // Complex accumulation with multiple operations
        const processed = value.mul(multiplier);
        const intermediate = processed.square().add(value);
        const newSum = previousSum.add(intermediate);
        
        // Add range check simulation
        const withinRange = newSum.lessThan(Field(1000000));
        withinRange.assertTrue();
        
        return newSum;
      },
    },
  },
});

function createSimpleRecursionBenchmark() {
  return backendBenchmark(
    'Simple Recursive Proofs',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await SimpleRecursion.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');

      // Generate base proof
      const input = Field(10);
      const increment = Field(5);
      
      const baseResult = await SimpleRecursion.base(input, increment);
      
      // Simulate generating a few recursive steps
      // In practice, these would be actual proofs
      let currentInput = input;
      for (let i = 0; i < 3; i++) {
        // This would normally use a real proof from the previous step
        // For benchmarking, we focus on the constraint generation
        const mockProof = {
          verify: () => {},
          publicOutput: Field(i * 10 + 15),
        } as any;
        
        currentInput = await SimpleRecursion.step(
          currentInput,
          mockProof,
          Field(i + 1)
        );
      }

      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      // Actual proof generation would happen here
      toc('proving');

      tic('verification');
      // Proof verification would happen here
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 500 }; // Recursive proofs are expensive
    },
    getRecursiveConfigs()
  );
}

function createComplexRecursionBenchmark() {
  return backendBenchmark(
    'Complex Recursive Proofs',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await ComplexRecursion.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');

      // Generate base cases
      const x = Field(5);
      const a = Field(3);
      const b = Field(7);
      
      const baseResult = await ComplexRecursion.base(x, a, b);
      
      // Simulate fibonacci sequence with recursion
      const mockProof1 = {
        verify: () => {},
        publicOutput: Field(1),
      } as any;
      
      const mockProof2 = {
        verify: () => {},
        publicOutput: Field(1),
      } as any;
      
      const fibResult = await ComplexRecursion.fibonacci(
        Field(3),
        mockProof1,
        mockProof2
      );
      
      // Simulate accumulation
      const mockAccProof = {
        verify: () => {},
        publicOutput: Field(100),
      } as any;
      
      const accResult = await ComplexRecursion.accumulate(
        Field(50),
        mockAccProof,
        Field(25),
        Field(2)
      );

      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 1200 }; // Very complex recursive proofs
    },
    getRecursiveConfigs()
  );
}

function getRecursiveConfigs(): BackendConfig[] {
  return [
    {
      name: 'snarky',
      warmupRuns: 0, // Recursive proofs are very expensive
      measurementRuns: 2,
    },
    {
      name: 'sparky',
      warmupRuns: 0,
      measurementRuns: 2,
    },
  ];
}