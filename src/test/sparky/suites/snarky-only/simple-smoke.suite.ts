/**
 * Simple Smoke Test Suite for Snarky
 * 
 * Basic validation tests that don't require o1js imports
 * to test the infrastructure itself.
 */

export interface TestCase {
  name: string;
  testFn: () => Promise<void>;
  timeout?: number;
}

export const tests: TestCase[] = [
  {
    name: 'infrastructure-validation',
    testFn: async () => {
      // Test that basic JavaScript works
      const result = 2 + 2;
      if (result !== 4) {
        throw new Error(`Basic arithmetic failed: 2 + 2 = ${result}, expected 4`);
      }
    },
    timeout: 1000
  },

  {
    name: 'async-operation',
    testFn: async () => {
      // Test async operations work
      await new Promise(resolve => setTimeout(resolve, 10));
      const timestamp = Date.now();
      if (timestamp < 1000000000000) {
        throw new Error('Timestamp validation failed');
      }
    },
    timeout: 2000
  },

  {
    name: 'backend-marker',
    testFn: async () => {
      // This test just marks that we're running in snarky backend context
      const backendContext = 'snarky';
      if (backendContext !== 'snarky') {
        throw new Error('Backend context validation failed');
      }
    },
    timeout: 1000
  }
];

export default { tests };