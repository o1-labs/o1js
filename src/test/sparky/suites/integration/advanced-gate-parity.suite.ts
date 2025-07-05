/**
 * Advanced Gate Parity Test Suite
 * 
 * Tests parity between Snarky and Sparky backends for advanced gate operations
 * including range checks, complex cryptographic functions, and optimization patterns.
 * 
 * Created: July 4, 2025, 23:50 UTC
 * Last Modified: July 5, 2025, 02:48 UTC
 */

export interface AdvancedGateParityTestCase {
  name: string;
  type: 'comparison';
  testFn: (backend?: string) => Promise<any>;
  compareBy: 'value' | 'hash' | 'constraints';
  timeout?: number;
}

/**
 * Generate all advanced gate parity test cases
 */
export const tests: AdvancedGateParityTestCase[] = [
  {
    name: 'advanced-range-check-field-range-check-8bit-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 60000,
    testFn: async (backend) => {
      const impl = await import('./advanced-gate-parity.impl.js');
      return impl.rangeCheck8BitParity(backend);
    }
  },
  {
    name: 'advanced-range-check-field-range-check-16bit-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 60000,
    testFn: async (backend) => {
      const impl = await import('./advanced-gate-parity.impl.js');
      return impl.rangeCheck16BitParity(backend);
    }
  },
  {
    name: 'advanced-range-check-32-uint32-creation-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 60000,
    testFn: async (backend) => {
      const impl = await import('./advanced-gate-parity.impl.js');
      return impl.uint32CreationParity(backend);
    }
  },
  {
    name: 'advanced-range-check-64-uint64-creation-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 60000,
    testFn: async (backend) => {
      const impl = await import('./advanced-gate-parity.impl.js');
      return impl.uint64CreationParity(backend);
    }
  },
  {
    name: 'advanced-crypto-poseidon-hash-array-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 60000,
    testFn: async (backend) => {
      const impl = await import('./advanced-gate-parity.impl.js');
      return impl.poseidonHashArrayParity(backend);
    }
  },
  {
    name: 'advanced-crypto-nested-poseidon-hash-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 60000,
    testFn: async (backend) => {
      const impl = await import('./advanced-gate-parity.impl.js');
      return impl.nestedPoseidonHashParity(backend);
    }
  },
  {
    name: 'advanced-complex-field-field-inversion-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 60000,
    testFn: async (backend) => {
      const impl = await import('./advanced-gate-parity.impl.js');
      return impl.fieldInversionParity(backend);
    }
  },
  {
    name: 'advanced-complex-field-field-division-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 60000,
    testFn: async (backend) => {
      const impl = await import('./advanced-gate-parity.impl.js');
      return impl.fieldDivisionParity(backend);
    }
  },
  {
    name: 'advanced-polynomial-field-polynomial-evaluation-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 60000,
    testFn: async (backend) => {
      const impl = await import('./advanced-gate-parity.impl.js');
      return impl.fieldPolynomialEvaluationParity(backend);
    }
  },
  {
    name: 'advanced-elliptic-curve-group-generator-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 60000,
    testFn: async (backend) => {
      const impl = await import('./advanced-gate-parity.impl.js');
      return impl.groupGeneratorParity(backend);
    }
  },
  {
    name: 'advanced-elliptic-curve-group-addition-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 60000,
    testFn: async (backend) => {
      const impl = await import('./advanced-gate-parity.impl.js');
      return impl.groupAdditionParity(backend);
    }
  },
  {
    name: 'advanced-assertion-conditional-assertion-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 60000,
    testFn: async (backend) => {
      const impl = await import('./advanced-gate-parity.impl.js');
      return impl.conditionalAssertionParity(backend);
    }
  },
  {
    name: 'advanced-batch-assertion-range-assertion-batch-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 60000,
    testFn: async (backend) => {
      const impl = await import('./advanced-gate-parity.impl.js');
      return impl.rangeAssertionBatchParity(backend);
    }
  }
];

export default { tests };