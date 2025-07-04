/**
 * Framework for testing backend switching, VK parity, and constraint system compatibility
 * between Snarky (OCaml) and Sparky (Rust) backends.
 */

import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend } from '../../../dist/node/index.js';

export interface TestResult {
  backend: 'snarky' | 'sparky';
  vkHash?: string;
  constraintCount: number;
  constraints?: any[];
  success: boolean;
  error?: string;
}

export interface ParityTestResult {
  snarky: TestResult;
  sparky: TestResult;
  vkMatch: boolean;
  constraintCountMatch: boolean;
  passed: boolean;
  issues: string[];
}

export class BackendTestFramework {
  /**
   * Test circuit execution with both backends and compare results
   */
  async testWithBothBackends<T>(
    testFn: () => Promise<T> | T,
    name: string,
    expectEqual = true
  ): Promise<{ snarky: T; sparky: T; equal: boolean; passed: boolean }> {
    // Test with Snarky
    await switchBackend('snarky');
    const snarkyResult = await testFn();

    // Test with Sparky  
    await switchBackend('sparky');
    const sparkyResult = await testFn();

    const equal = JSON.stringify(snarkyResult) === JSON.stringify(sparkyResult);
    const passed = expectEqual ? equal : !equal;

    console.log(`${name}: ${passed ? '✅' : '❌'} (expected ${expectEqual ? 'equal' : 'different'})`);
    
    return { snarky: snarkyResult, sparky: sparkyResult, equal, passed };
  }

  /**
   * Test VK generation parity for a ZkProgram
   */
  async testVKParity(program: any, name: string): Promise<ParityTestResult> {
    const results: ParityTestResult = {
      snarky: { backend: 'snarky', constraintCount: 0, success: false },
      sparky: { backend: 'sparky', constraintCount: 0, success: false },
      vkMatch: false,
      constraintCountMatch: false,
      passed: false,
      issues: []
    };

    try {
      // Test with Snarky
      await switchBackend('snarky');
      console.log(`Testing ${name} with Snarky...`);
      
      const snarkyCompilation = await program.compile();
      const snarkyAnalysis = await program.analyzeMethods();
      
      results.snarky = {
        backend: 'snarky',
        vkHash: snarkyCompilation.verificationKey.hash.toString(),
        constraintCount: (Object.values(snarkyAnalysis)[0] as any)?.rows || 0,
        success: true
      };

      // Test with Sparky
      await switchBackend('sparky');
      console.log(`Testing ${name} with Sparky...`);
      
      const sparkyCompilation = await program.compile();
      const sparkyAnalysis = await program.analyzeMethods();
      
      results.sparky = {
        backend: 'sparky',
        vkHash: sparkyCompilation.verificationKey.hash.toString(),
        constraintCount: (Object.values(sparkyAnalysis)[0] as any)?.rows || 0,
        success: true
      };

    } catch (error) {
      results.issues.push(`Compilation error: ${(error as Error).message}`);
      return results;
    }

    // Compare results
    results.vkMatch = results.snarky.vkHash === results.sparky.vkHash;
    results.constraintCountMatch = results.snarky.constraintCount === results.sparky.constraintCount;
    results.passed = results.vkMatch && results.constraintCountMatch;

    if (!results.vkMatch) {
      results.issues.push(`VK hash mismatch: Snarky=${results.snarky.vkHash}, Sparky=${results.sparky.vkHash}`);
    }
    if (!results.constraintCountMatch) {
      results.issues.push(`Constraint count mismatch: Snarky=${results.snarky.constraintCount}, Sparky=${results.sparky.constraintCount}`);
    }

    console.log(`${name} VK Parity: ${results.passed ? '✅' : '❌'}`);
    if (results.issues.length > 0) {
      console.log(`Issues: ${results.issues.join(', ')}`);
    }

    return results;
  }

  /**
   * Test constraint system generation for a circuit
   */
  async testConstraintParity(
    circuitFn: () => void,
    name: string
  ): Promise<ParityTestResult> {
    const results: ParityTestResult = {
      snarky: { backend: 'snarky', constraintCount: 0, success: false },
      sparky: { backend: 'sparky', constraintCount: 0, success: false },
      vkMatch: false,
      constraintCountMatch: false,
      passed: false,
      issues: []
    };

    try {
      // Test with Snarky
      await switchBackend('snarky');
      const snarkyCS = await Provable.constraintSystem(circuitFn);
      results.snarky = {
        backend: 'snarky',
        constraintCount: snarkyCS.gates.length,
        constraints: snarkyCS.gates,
        success: true
      };

      // Test with Sparky
      await switchBackend('sparky');
      const sparkyCS = await Provable.constraintSystem(circuitFn);
      results.sparky = {
        backend: 'sparky',
        constraintCount: sparkyCS.gates.length,
        constraints: sparkyCS.gates,
        success: true
      };

    } catch (error) {
      results.issues.push(`Constraint generation error: ${(error as Error).message}`);
      return results;
    }

    // Compare results
    results.constraintCountMatch = results.snarky.constraintCount === results.sparky.constraintCount;
    
    // For now, we mainly care about constraint count (detailed constraint comparison is complex)
    results.passed = results.constraintCountMatch;

    if (!results.constraintCountMatch) {
      results.issues.push(`Constraint count mismatch: Snarky=${results.snarky.constraintCount}, Sparky=${results.sparky.constraintCount}`);
    }

    console.log(`${name} Constraint Parity: ${results.passed ? '✅' : '❌'}`);
    if (results.issues.length > 0) {
      console.log(`Issues: ${results.issues.join(', ')}`);
    }

    return results;
  }

  /**
   * Test backend routing infrastructure - checks if globalThis.__snarky is updated correctly
   */
  async testBackendRouting(): Promise<{ passed: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Start with Snarky
    await switchBackend('snarky');
    const snarkyGates = (globalThis as any).__snarky?.gates;
    
    if (!snarkyGates) {
      issues.push('globalThis.__snarky not initialized with Snarky backend');
      return { passed: false, issues };
    }

    // Switch to Sparky
    await switchBackend('sparky');
    
    // Check if globalThis.__snarky was updated
    const currentGates = (globalThis as any).__snarky?.gates;
    const sparkyGatesFromAdapter = (await import('../../../dist/node/bindings/sparky-adapter.js')).Snarky?.gates;
    
    if (currentGates === snarkyGates) {
      issues.push('globalThis.__snarky not updated when switching to Sparky (still points to OCaml)');
    }
    
    if (!sparkyGatesFromAdapter) {
      issues.push('Sparky adapter does not provide gates interface');
    }

    const passed = issues.length === 0;
    console.log(`Backend Routing: ${passed ? '✅' : '❌'}`);
    if (issues.length > 0) {
      console.log(`Issues: ${issues.join(', ')}`);
    }

    return { passed, issues };
  }

  /**
   * Generate test circuits of varying complexity
   */
  getTestCircuits() {
    return {
      // Basic field operations
      fieldMultiplication: () => {
        const x = Provable.witness(Field, () => Field(3));
        x.mul(x).assertEquals(Field(9));
      },

      // Field addition  
      fieldAddition: () => {
        const x = Provable.witness(Field, () => Field(5));
        const y = Provable.witness(Field, () => Field(7));
        x.add(y).assertEquals(Field(12));
      },

      // Boolean operations
      booleanLogic: () => {
        const a = Provable.witness(Field, () => Field(1));
        const b = Provable.witness(Field, () => Field(0));
        a.mul(b).assertEquals(Field(0)); // AND operation
      },

      // Complex expression
      complexExpression: () => {
        const x = Provable.witness(Field, () => Field(2));
        const y = Provable.witness(Field, () => Field(3));
        const z = Provable.witness(Field, () => Field(4));
        x.mul(y).add(z).assertEquals(Field(10)); // 2*3 + 4 = 10
      }
    };
  }

  /**
   * Generate test ZkPrograms
   */
  getTestPrograms() {
    return {
      simpleMultiplication: ZkProgram({
        name: 'SimpleMultiplication',
        publicInput: Field,
        methods: {
          multiply: {
            privateInputs: [Field],
            async method(pub, priv) {
              return pub.mul(priv);
            }
          }
        }
      }),

      additionProgram: ZkProgram({
        name: 'AdditionProgram', 
        publicInput: Field,
        methods: {
          add: {
            privateInputs: [Field],
            async method(pub, priv) {
              return pub.add(priv);
            }
          }
        }
      }),

      complexProgram: ZkProgram({
        name: 'ComplexProgram',
        publicInput: Field,
        methods: {
          compute: {
            privateInputs: [Field, Field],
            async method(pub, a, b) {
              const intermediate = a.mul(b);
              return pub.add(intermediate);
            }
          }
        }
      })
    };
  }
}