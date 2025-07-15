/**
 * Microbenchmarks for hash functions
 * Tests Poseidon and Keccak performance between backends
 */

import { Field, ZkProgram, Poseidon } from '../../../src/lib/provable/wrapped.js';
import { Keccak } from '../../../src/lib/provable/keccak.js';
import { backendBenchmark, BackendConfig } from '../../utils/comparison/backend-benchmark.js';

export { hashFunctionBenchmarks };

const hashFunctionBenchmarks = [
  createPoseidonSingleBenchmark(),
  createPoseidonMultipleBenchmark(),
  createKeccakBenchmark(),
  createHashChainBenchmark(),
];

function createPoseidonSingleBenchmark() {
  const PoseidonSingle = ZkProgram({
    name: 'PoseidonSingle',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      hashSingle: {
        privateInputs: [],
        async method(input: Field): Promise<Field> {
          return Poseidon.hash([input]);
        },
      },
    },
  });

  return backendBenchmark(
    'Poseidon Single Hash',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await PoseidonSingle.compile();
      toc('compilation');
      memTracker.checkpoint();

      const input = Field(12345);

      tic('witness');
      const result = await PoseidonSingle.hashSingle(input);
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 270 }; // Poseidon single hash constraint count
    },
    getDefaultConfigs()
  );
}

function createPoseidonMultipleBenchmark() {
  const PoseidonMultiple = ZkProgram({
    name: 'PoseidonMultiple',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      hashMultiple: {
        privateInputs: [Field, Field, Field, Field],
        async method(a: Field, b: Field, c: Field, d: Field, e: Field): Promise<Field> {
          return Poseidon.hash([a, b, c, d, e]);
        },
      },
    },
  });

  return backendBenchmark(
    'Poseidon Multiple Hash',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await PoseidonMultiple.compile();
      toc('compilation');
      memTracker.checkpoint();

      const inputs = [Field(1), Field(2), Field(3), Field(4), Field(5)];

      tic('witness');
      const result = await PoseidonMultiple.hashMultiple(...inputs);
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 540 }; // Poseidon multiple hash constraint count
    },
    getDefaultConfigs()
  );
}

function createKeccakBenchmark() {
  const KeccakHash = ZkProgram({
    name: 'KeccakHash',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      keccak: {
        privateInputs: [Field, Field, Field, Field],
        async method(a: Field, b: Field, c: Field, d: Field): Promise<Field> {
          // Convert fields to bytes and hash
          const bytes = [a, b, c, d].map(f => f.toBigInt()).map(n => Number(n & 0xFFn));
          const hash = Keccak.nistSha3(256, bytes);
          return Field(hash[0]);
        },
      },
    },
  });

  return backendBenchmark(
    'Keccak Hash',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await KeccakHash.compile();
      toc('compilation');
      memTracker.checkpoint();

      const inputs = [Field(1), Field(2), Field(3), Field(4)];

      tic('witness');
      const result = await KeccakHash.keccak(...inputs);
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 25000 }; // Keccak is much more expensive
    },
    getDefaultConfigs()
  );
}

function createHashChainBenchmark() {
  const HashChain = ZkProgram({
    name: 'HashChain',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      chainHash: {
        privateInputs: [Field, Field, Field],
        async method(seed: Field, a: Field, b: Field, c: Field): Promise<Field> {
          // Create a chain of hashes: hash(hash(hash(seed, a), b), c)
          let current = Poseidon.hash([seed, a]);
          current = Poseidon.hash([current, b]);
          current = Poseidon.hash([current, c]);
          return current;
        },
      },
    },
  });

  return backendBenchmark(
    'Hash Chain',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await HashChain.compile();
      toc('compilation');
      memTracker.checkpoint();

      const seed = Field(42);
      const inputs = [Field(1), Field(2), Field(3)];

      tic('witness');
      const result = await HashChain.chainHash(seed, ...inputs);
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 810 }; // 3 * 270 constraints for 3 Poseidon hashes
    },
    getDefaultConfigs()
  );
}

function getDefaultConfigs(): BackendConfig[] {
  return [
    {
      name: 'snarky',
      warmupRuns: 2,
      measurementRuns: 8,
    },
    {
      name: 'sparky',
      warmupRuns: 2,
      measurementRuns: 8,
    },
  ];
}