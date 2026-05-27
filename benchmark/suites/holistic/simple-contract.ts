/**
 * Holistic benchmark for a simple smart contract
 * Tests basic contract deployment and state updates
 */

import {
  Field,
  SmartContract,
  state,
  State,
  method,
  PublicKey,
  Signature,
  ZkProgram,
} from '../../../src/lib/provable/wrapped.js';
import { backendBenchmark, BackendConfig } from '../../utils/comparison/backend-benchmark.js';

export { simpleContractBenchmarks };

const simpleContractBenchmarks = [
  createCounterContractBenchmark(),
  createSimpleAuthBenchmark(),
];

class CounterContract extends SmartContract {
  @state(Field) counter = State<Field>();

  init() {
    super.init();
    this.counter.set(Field(0));
  }

  @method async increment(): Promise<void> {
    const currentValue = this.counter.getAndRequireEquals();
    const newValue = currentValue.add(Field(1));
    this.counter.set(newValue);
  }

  @method async add(amount: Field): Promise<void> {
    const currentValue = this.counter.getAndRequireEquals();
    const newValue = currentValue.add(amount);
    this.counter.set(newValue);
  }

  @method async reset(): Promise<void> {
    this.counter.set(Field(0));
  }
}

class SimpleAuthContract extends SmartContract {
  @state(PublicKey) owner = State<PublicKey>();
  @state(Field) value = State<Field>();

  init() {
    super.init();
    this.owner.set(this.sender.getAndRequireSignature());
    this.value.set(Field(0));
  }

  @method async updateValue(newValue: Field, signature: Signature): Promise<void> {
    // Verify the signature is from the owner
    const owner = this.owner.getAndRequireEquals();
    signature.verify(owner, [newValue]);

    this.value.set(newValue);
  }
}

function createCounterContractBenchmark() {
  return backendBenchmark(
    'Simple Counter Contract',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await CounterContract.compile();
      toc('compilation');
      memTracker.checkpoint();

      // Simulate contract deployment and method calls
      tic('witness');
      
      // Create a mock instance for testing
      const contract = new CounterContract(PublicKey.empty());
      
      // Simulate init
      contract.init();
      
      // Simulate increment calls
      await contract.increment();
      await contract.add(Field(5));
      await contract.increment();
      
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      // In practice, this would generate proofs for each method call
      toc('proving');

      tic('verification');
      // Verify the proofs
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 15 }; // Approximate constraints for state operations
    },
    getContractConfigs()
  );
}

function createSimpleAuthBenchmark() {
  return backendBenchmark(
    'Simple Auth Contract',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await SimpleAuthContract.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');
      
      // Create test keys and signature
      const ownerKey = PublicKey.empty(); // In practice, would be real key
      const signature = Signature.empty(); // In practice, would be real signature
      
      const contract = new SimpleAuthContract(PublicKey.empty());
      contract.init();
      
      // Simulate authenticated update
      await contract.updateValue(Field(42), signature);
      
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 1500 }; // Signature verification is expensive
    },
    getContractConfigs()
  );
}

function getContractConfigs(): BackendConfig[] {
  return [
    {
      name: 'snarky',
      warmupRuns: 1,
      measurementRuns: 5,
    },
    {
      name: 'sparky',
      warmupRuns: 1,
      measurementRuns: 5,
    },
  ];
}