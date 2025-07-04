/**
 * Backend Switching Reliability Test Suite
 * 
 * Tests the reliability of backend switching mechanism:
 * - Multiple switches don't corrupt state
 * - Snarky results remain consistent across switches
 * - Backend switching works repeatedly without issues
 */

export interface IntegrationTestCase {
  name: string;
  type: 'switching' | 'comparison' | 'isolation';
  testFn: (backend?: string) => Promise<any>;
  setupFn?: (backend?: string) => Promise<void>;
  compareBy?: 'value' | 'hash' | 'constraints';
  timeout?: number;
}

export const tests: IntegrationTestCase[] = [
  {
    name: 'field-operations-across-switches',
    type: 'switching',
    testFn: async (backend) => {
      const { Field } = await import('../../../lib/index.js');
      
      // Simple field operations that should be identical
      const a = Field(42);
      const b = Field(17);
      const result = a.add(b).mul(Field(2));
      
      return {
        backend,
        value: result.toString(),
        operations: 'add-mul',
        expected: Field(118).toString()
      };
    },
    timeout: 10000
  },

  {
    name: 'poseidon-hash-consistency',
    type: 'switching',
    testFn: async (backend) => {
      const { Poseidon, Field } = await import('../../../lib/index.js');
      
      // Hash that should be identical across backends
      const inputs = [Field(1), Field(2), Field(3)];
      const hash = Poseidon.hash(inputs);
      
      return {
        backend,
        hash: hash.toString(),
        inputs: inputs.map(f => f.toString()),
        operation: 'poseidon-hash'
      };
    },
    timeout: 15000
  },

  {
    name: 'boolean-logic-stability',
    type: 'switching',
    testFn: async (backend) => {
      const { Bool, Field } = await import('../../../lib/index.js');
      
      // Boolean operations with field comparisons
      const x = Field(10);
      const y = Field(10);
      const equal = x.equals(y);
      const notEqual = equal.not();
      
      return {
        backend,
        equal: equal.toBoolean(),
        notEqual: notEqual.toBoolean(),
        operation: 'field-equals-bool'
      };
    },
    timeout: 10000
  },

  {
    name: 'group-operations-reliability',
    type: 'switching',
    testFn: async (backend) => {
      const { Group } = await import('../../../lib/index.js');
      
      // Group operations that should be consistent
      const g = Group.generator;
      const doubled = g.add(g);
      const scaled = g.scale(2);
      const areEqual = doubled.equals(scaled);
      
      return {
        backend,
        doubled: doubled.toString(),
        scaled: scaled.toString(),
        equal: areEqual.toBoolean(),
        operation: 'group-doubling'
      };
    },
    timeout: 15000
  },

  {
    name: 'nested-operations-stress',
    type: 'switching',
    testFn: async (backend) => {
      const { Field, Poseidon } = await import('../../../lib/index.js');
      
      // Complex nested operations
      const base = Field(7);
      const squared = base.square();
      const cubed = squared.mul(base);
      const hashed = Poseidon.hash([cubed]);
      const final = hashed.add(base);
      
      return {
        backend,
        base: base.toString(),
        final: final.toString(),
        operation: 'nested-field-poseidon'
      };
    },
    timeout: 20000
  },

  {
    name: 'rapid-switching-stability',
    type: 'switching',
    testFn: async (backend) => {
      const { Field } = await import('../../../lib/index.js');
      
      // Simple operation that gets called during rapid switching
      const start = Date.now();
      const x = Field(123);
      const result = x.square().add(Field(456));
      const duration = Date.now() - start;
      
      return {
        backend,
        result: result.toString(),
        duration,
        operation: 'rapid-field-ops'
      };
    },
    timeout: 5000
  }
];

export default { tests };