/**
 * Comprehensive Gate Parity Test Suite
 * 
 * Tests parity between Snarky and Sparky backends for all gate operations.
 * This suite provides systematic validation of every gate type to ensure
 * mathematical equivalence and constraint generation parity.
 * 
 * Created: July 4, 2025, 23:45 UTC
 * Last Modified: July 5, 2025, 03:15 UTC
 */

export interface GateParityTestCase {
  name: string;
  type: 'comparison';
  testFn: (backend?: string) => Promise<any>;
  compareBy: 'value' | 'hash' | 'constraints';
  timeout?: number;
}

/**
 * Generate all gate parity test cases
 */
export const tests: GateParityTestCase[] = [
  // Basic arithmetic gates
  {
    name: 'arithmetic-field-addition-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 30000,
    testFn: async (backend) => {
      const impl = await import('./comprehensive-gate-parity.impl.js');
      return impl.fieldAdditionParity(backend);
    }
  },
  {
    name: 'arithmetic-field-multiplication-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 30000,
    testFn: async (backend) => {
      const impl = await import('./comprehensive-gate-parity.impl.js');
      return impl.fieldMultiplicationParity(backend);
    }
  },
  {
    name: 'arithmetic-field-subtraction-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 30000,
    testFn: async (backend) => {
      const impl = await import('./comprehensive-gate-parity.impl.js');
      return impl.fieldSubtractionParity(backend);
    }
  },
  {
    name: 'arithmetic-field-negation-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 30000,
    testFn: async (backend) => {
      const impl = await import('./comprehensive-gate-parity.impl.js');
      return impl.fieldNegationParity(backend);
    }
  },
  
  // Boolean gates
  {
    name: 'boolean-boolean-and-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 30000,
    testFn: async (backend) => {
      const impl = await import('./comprehensive-gate-parity.impl.js');
      return impl.booleanAndParity(backend);
    }
  },
  {
    name: 'boolean-boolean-or-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 30000,
    testFn: async (backend) => {
      const impl = await import('./comprehensive-gate-parity.impl.js');
      return impl.booleanOrParity(backend);
    }
  },
  {
    name: 'boolean-boolean-not-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 30000,
    testFn: async (backend) => {
      const impl = await import('./comprehensive-gate-parity.impl.js');
      return impl.booleanNotParity(backend);
    }
  },
  {
    name: 'boolean-boolean-xor-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 30000,
    testFn: async (backend) => {
      const impl = await import('./comprehensive-gate-parity.impl.js');
      return impl.booleanXorParity(backend);
    }
  },
  
  // Comparison gates
  {
    name: 'comparison-field-equals-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 30000,
    testFn: async (backend) => {
      const impl = await import('./comprehensive-gate-parity.impl.js');
      return impl.fieldEqualsParity(backend);
    }
  },
  {
    name: 'comparison-field-less-than-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 30000,
    testFn: async (backend) => {
      const impl = await import('./comprehensive-gate-parity.impl.js');
      return impl.fieldLessThanParity(backend);
    }
  },
  
  // Cryptographic gates
  {
    name: 'crypto-poseidon-hash-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 30000,
    testFn: async (backend) => {
      const impl = await import('./comprehensive-gate-parity.impl.js');
      return impl.poseidonHashParity(backend);
    }
  },
  
  // Witness and conditional gates
  {
    name: 'witness-witness-creation-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 30000,
    testFn: async (backend) => {
      const impl = await import('./comprehensive-gate-parity.impl.js');
      return impl.witnessCreationParity(backend);
    }
  },
  {
    name: 'conditional-provable-if-parity',
    type: 'comparison',
    compareBy: 'value',
    timeout: 30000,
    testFn: async (backend) => {
      const impl = await import('./comprehensive-gate-parity.impl.js');
      return impl.provableIfParity(backend);
    }
  }
];

export default { tests };