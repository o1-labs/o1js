/**
 * Circuit Compilation Test Suite
 * 
 * Tests actual circuit compilation functionality with real SmartContracts
 * and ZkPrograms, comparing results between Snarky and Sparky backends.
 */

// Import classes directly for TypeScript metadata
import { Field, UInt64 } from '../../../../index.js';

export interface CompilationTestCase {
  name: string;
  type: 'compilation';
  testFn: (backend?: string) => Promise<any>;
  timeout?: number;
}

export const tests: CompilationTestCase[] = [
  {
    name: 'basic-smartcontract-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const impl = await import('./circuit-compilation.impl.js');
      return impl.basicSmartContractCompilation(backend);
    },
    timeout: 120000 // 2 minutes
  },

  {
    name: 'zkprogram-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const impl = await import('./circuit-compilation.impl.js');
      return impl.zkProgramCompilation(backend);
    },
    timeout: 180000 // 3 minutes
  },

  {
    name: 'complex-smartcontract-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const impl = await import('./circuit-compilation.impl.js');
      return impl.complexSmartContractCompilation(backend);
    },
    timeout: 180000 // 3 minutes
  },

  {
    name: 'recursive-zkprogram-compilation',
    type: 'compilation',
    testFn: async (backend) => {
      const impl = await import('./circuit-compilation.impl.js');
      return impl.recursiveZkProgramCompilation(backend);
    },
    timeout: 300000 // 5 minutes for recursive compilation
  },

  {
    name: 'field-arithmetic-intensive-zkprogram',
    type: 'compilation',
    testFn: async (backend) => {
      const impl = await import('./circuit-compilation.impl.js');
      return impl.fieldArithmeticIntensiveZkProgram(backend);
    },
    timeout: 180000 // 3 minutes
  }
];

export default { tests };