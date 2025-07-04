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
    name: 'backend-verification',
    testFn: async () => {
      // Verify we're using the snarky backend
      const o1js = (global as any).o1js;
      if (!o1js) {
        throw new Error('o1js not initialized');
      }
      
      const currentBackend = o1js.getCurrentBackend();
      if (currentBackend !== 'snarky') {
        throw new Error(`Wrong backend: expected snarky, got ${currentBackend}`);
      }
    },
    timeout: 1000
  },

  {
    name: 'field-arithmetic',
    testFn: async () => {
      // Test basic Field arithmetic with snarky backend
      const o1js = (global as any).o1js;
      const { Field } = o1js;
      
      const a = Field(10);
      const b = Field(20);
      const c = a.add(b);
      
      if (c.toString() !== '30') {
        throw new Error(`Field addition failed: 10 + 20 = ${c.toString()}, expected 30`);
      }
    },
    timeout: 2000
  },

  {
    name: 'provable-witness',
    testFn: async () => {
      // Test Provable.witness with snarky backend
      const o1js = (global as any).o1js;
      const { Field, Provable } = o1js;
      
      Provable.runAndCheck(() => {
        const x = Provable.witness(Field, () => Field(42));
        x.assertEquals(Field(42));
      });
    },
    timeout: 3000
  }
];

export default { tests };