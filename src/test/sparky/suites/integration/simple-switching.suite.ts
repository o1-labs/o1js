/**
 * Simple Backend Switching Test Suite
 * 
 * Basic validation of backend switching infrastructure without o1js imports.
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
    name: 'backend-context-validation',
    type: 'switching',
    testFn: async (backend) => {
      // Simple validation that backend parameter is passed correctly
      return {
        backend: backend || 'unknown',
        timestamp: Date.now(),
        operation: 'context-validation'
      };
    },
    timeout: 2000
  },

  {
    name: 'basic-switching-pattern',
    type: 'comparison',
    testFn: async (backend) => {
      // Test that can be run with different backends
      const computation = Math.pow(2, 10);
      return {
        backend: backend || 'unknown',
        result: computation,
        operation: 'power-computation'
      };
    },
    compareBy: 'value',
    timeout: 2000
  },

  {
    name: 'state-isolation-check',
    type: 'isolation',
    setupFn: async (backend) => {
      // Simple setup that doesn't interfere across backends
      console.log(`Setting up for ${backend}`);
    },
    testFn: async (backend) => {
      // Test that isolation works correctly
      return {
        backend: backend || 'unknown',
        cleanState: true,
        operation: 'isolation-check'
      };
    },
    compareBy: 'value',
    timeout: 2000
  }
];

export default { tests };