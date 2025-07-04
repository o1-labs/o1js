/**
 * Sparky Smoke Test Suite
 * 
 * Basic health check tests that verify fundamental operations work correctly
 * with the Sparky backend. This process will NEVER switch backends.
 * 
 * NOTE: Tests are identical to snarky-only/smoke.suite.ts by design.
 * Backend isolation ensures no cross-contamination.
 */

export interface TestCase {
  name: string;
  testFn: () => Promise<void>;
  timeout?: number;
}

export const tests: TestCase[] = [
  {
    name: 'field-basic-arithmetic',
    testFn: async () => {
      const { Field } = await import('../../../lib/index.js');
      
      // Basic field operations
      const a = Field(10);
      const b = Field(20);
      const sum = a.add(b);
      const product = a.mul(b);
      
      // Verify results
      if (!sum.equals(Field(30))) {
        throw new Error(`Addition failed: ${sum} !== 30`);
      }
      
      if (!product.equals(Field(200))) {
        throw new Error(`Multiplication failed: ${product} !== 200`);
      }
    },
    timeout: 5000
  },

  {
    name: 'field-advanced-operations',
    testFn: async () => {
      const { Field } = await import('../../../lib/index.js');
      
      // More complex operations
      const x = Field(5);
      const y = Field(3);
      
      const square = x.square();
      const inverse = x.inv();
      const division = x.div(y);
      
      // Verify square
      if (!square.equals(Field(25))) {
        throw new Error(`Square failed: ${square} !== 25`);
      }
      
      // Verify inverse (5 * inv(5) = 1)
      const shouldBeOne = x.mul(inverse);
      if (!shouldBeOne.equals(Field(1))) {
        throw new Error(`Inverse failed: ${x} * ${inverse} !== 1`);
      }
      
      // Verify division
      const expectedQuotient = x.div(y);
      const verification = expectedQuotient.mul(y);
      if (!verification.equals(x)) {
        throw new Error(`Division failed: (${x} / ${y}) * ${y} !== ${x}`);
      }
    },
    timeout: 5000
  },

  {
    name: 'boolean-operations',
    testFn: async () => {
      const { Bool } = await import('../../../lib/index.js');
      
      const trueVal = Bool(true);
      const falseVal = Bool(false);
      
      // Basic boolean operations
      const andResult = trueVal.and(falseVal);
      const orResult = trueVal.or(falseVal);
      const notResult = trueVal.not();
      
      if (andResult.toBoolean() !== false) {
        throw new Error(`AND failed: true AND false !== false`);
      }
      
      if (orResult.toBoolean() !== true) {
        throw new Error(`OR failed: true OR false !== true`);
      }
      
      if (notResult.toBoolean() !== false) {
        throw new Error(`NOT failed: NOT true !== false`);
      }
    },
    timeout: 5000
  },

  {
    name: 'poseidon-hash-basic',
    testFn: async () => {
      const { Poseidon, Field } = await import('../../../lib/index.js');
      
      // Basic Poseidon hashing
      const input1 = Field(1);
      const input2 = Field(2);
      
      const hash1 = Poseidon.hash([input1]);
      const hash2 = Poseidon.hash([input1, input2]);
      
      // Verify hashes are deterministic
      const hash1Again = Poseidon.hash([input1]);
      const hash2Again = Poseidon.hash([input1, input2]);
      
      if (!hash1.equals(hash1Again)) {
        throw new Error('Poseidon hash not deterministic for single input');
      }
      
      if (!hash2.equals(hash2Again)) {
        throw new Error('Poseidon hash not deterministic for multiple inputs');
      }
      
      // Verify different inputs produce different hashes
      if (hash1.equals(hash2)) {
        throw new Error('Poseidon hash collision detected');
      }
    },
    timeout: 10000
  },

  {
    name: 'group-operations',
    testFn: async () => {
      const { Group } = await import('../../../lib/index.js');
      
      // Basic group operations
      const g = Group.generator;
      const identity = Group.zero;
      
      // Test addition with identity
      const gPlusZero = g.add(identity);
      if (!gPlusZero.equals(g)) {
        throw new Error('Group addition with identity failed');
      }
      
      // Test doubling
      const doubled = g.add(g);
      const scaledByTwo = g.scale(2);
      if (!doubled.equals(scaledByTwo)) {
        throw new Error('Group doubling vs scaling inconsistent');
      }
      
      // Test negation
      const negative = g.neg();
      const shouldBeZero = g.add(negative);
      if (!shouldBeZero.equals(identity)) {
        throw new Error('Group negation failed');
      }
    },
    timeout: 10000
  },

  {
    name: 'field-range-validation',
    testFn: async () => {
      const { Field } = await import('../../../lib/index.js');
      
      // Test edge cases
      const zero = Field(0);
      const one = Field(1);
      const large = Field('28948022309329048855892746252171976963363056481941560715954676764349967630336'); // Near field modulus
      
      // Basic operations should work with edge values
      const zeroSquared = zero.square();
      if (!zeroSquared.equals(zero)) {
        throw new Error('Zero squared should be zero');
      }
      
      const oneSquared = one.square();
      if (!oneSquared.equals(one)) {
        throw new Error('One squared should be one');
      }
      
      // Large value operations
      const largeSquared = large.square();
      if (largeSquared.equals(large)) {
        throw new Error('Large value squared should not equal itself');
      }
    },
    timeout: 5000
  }
];

export default { tests };