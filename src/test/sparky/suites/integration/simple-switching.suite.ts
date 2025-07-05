/**
 * Simple Backend Switching Test Suite
 * 
 * Tests real backend switching using o1js functionality to verify
 * that both backends work correctly and produce consistent results.
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
    name: 'backend-switching-verification',
    type: 'switching',
    testFn: async (backend) => {
      const impl = await import('./simple-switching.impl.js');
      return impl.backendSwitchingVerification(backend);
    },
    timeout: 2000
  },

  {
    name: 'field-arithmetic-comparison',
    type: 'comparison',
    testFn: async (backend) => {
      const impl = await import('./simple-switching.impl.js');
      return impl.fieldArithmeticComparison(backend);
    },
    compareBy: 'value',
    timeout: 3000
  },

  {
    name: 'provable-witness-consistency',
    type: 'comparison',
    testFn: async (backend) => {
      const impl = await import('./simple-switching.impl.js');
      return impl.provableWitnessConsistency(backend);
    },
    compareBy: 'value',
    timeout: 3000
  }
];

export default { tests };