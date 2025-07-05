/**
 * VK Digest Test Suite
 * 
 * Tests constraint system digest functionality between Snarky and Sparky backends
 * to verify that Sparky's digest implementation produces proper MD5 hashes
 * instead of returning "2" as was previously observed.
 */

// Import Field type statically for TypeScript metadata
import { Field } from '../../../../index.js';

export interface VKDigestTestCase {
  name: string;
  type: 'digest' | 'comparison';
  testFn: (backend?: string) => Promise<any>;
  timeout?: number;
}

export const tests: VKDigestTestCase[] = [
  {
    name: 'simple-field-addition-digest',
    type: 'digest',
    testFn: async (backend) => {
      const impl = await import('./vk-digest.impl.js');
      return impl.simpleFieldAdditionDigest(backend!);
    },
    timeout: 30000
  },
  
  {
    name: 'field-multiplication-digest',
    type: 'digest',
    testFn: async (backend) => {
      const impl = await import('./vk-digest.impl.js');
      return impl.fieldMultiplicationDigest(backend!);
    },
    timeout: 30000
  },
  
  {
    name: 'witness-constraint-digest',
    type: 'digest',
    testFn: async (backend) => {
      const impl = await import('./vk-digest.impl.js');
      return impl.witnessConstraintDigest(backend!);
    },
    timeout: 30000
  },
  
  {
    name: 'smartcontract-digest',
    type: 'digest',
    testFn: async (backend) => {
      const impl = await import('./vk-digest.impl.js');
      return impl.smartContractDigest(backend!);
    },
    timeout: 30000
  }
];

export default { tests };