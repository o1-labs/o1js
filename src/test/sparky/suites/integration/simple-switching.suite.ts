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
      // Verify backend is correctly set using real o1js
      const o1js = (global as any).o1js;
      if (!o1js) {
        throw new Error('o1js not available in integration test');
      }
      
      const currentBackend = o1js.getCurrentBackend();
      return {
        backend: currentBackend,
        expectedBackend: backend,
        match: currentBackend === backend
      };
    },
    timeout: 2000
  },

  {
    name: 'field-arithmetic-comparison',
    type: 'comparison',
    testFn: async (backend) => {
      // Test Field operations produce same results across backends
      const o1js = (global as any).o1js;
      const { Field } = o1js;
      
      const a = Field(123);
      const b = Field(456);
      const c = a.mul(b);
      const d = c.add(Field(789));
      
      return {
        backend,
        result: d.toString(),
        operation: '(123 * 456) + 789'
      };
    },
    compareBy: 'value',
    timeout: 3000
  },

  {
    name: 'provable-witness-consistency',
    type: 'comparison',
    testFn: async (backend) => {
      // Test Provable.witness behavior across backends
      const o1js = (global as any).o1js;
      const { Field, Provable } = o1js;
      
      let witnessValue: string = '';
      Provable.runAndCheck(() => {
        const x = Provable.witness(Field, () => Field(99));
        const y = x.mul(Field(2));
        witnessValue = y.toString();
      });
      
      return {
        backend,
        witnessValue,
        operation: 'witness(99) * 2'
      };
    },
    compareBy: 'value',
    timeout: 3000
  }
];

export default { tests };