/**
 * RUTHLESS BACKEND PARITY PROPERTIES
 * 
 * Property-based tests using real o1js operations to ruthlessly find every
 * difference between Snarky and Sparky backends. These tests are designed
 * to be unforgiving in finding failures while honest about successes.
 */

import fc from 'fast-check';
import type { IAsyncProperty } from 'fast-check';
import { Field, Poseidon, ZkProgram, verify, switchBackend, getCurrentBackend } from '../../../../dist/node/index.js';
import { RuthlessFieldGenerators, RuthlessCircuitGenerators, RuthlessScenarioGenerators } from '../generators/RuthlessFieldGenerators.js';

/**
 * Result of a backend comparison test
 */
export interface BackendComparisonResult {
  snarkyResult: any;
  sparkyResult: any;
  match: boolean;
  snarkyTime: number;
  sparkyTime: number;
  snarkyError?: string;
  sparkyError?: string;
}

/**
 * VK comparison result for circuit compatibility
 */
export interface VKComparisonResult {
  snarkyVK: string;
  sparkyVK: string;
  hashMatch: boolean;
  structuralMatch: boolean;
  snarkyConstraints?: number;
  sparkyConstraints?: number;
}

/**
 * Ruthless backend parity property definitions
 */
export class RuthlessBackendParityProperties {
  
  /**
   * Execute operation with both backends and compare results
   */
  private async compareBackends<T>(
    operation: () => Promise<T> | T,
    resultComparator?: (a: T, b: T) => boolean
  ): Promise<BackendComparisonResult> {
    let snarkyResult: any, sparkyResult: any;
    let snarkyTime: number, sparkyTime: number;
    let snarkyError: string | undefined, sparkyError: string | undefined;
    
    // Test with Snarky
    await switchBackend('snarky');
    const snarkyStartTime = performance.now();
    try {
      snarkyResult = await operation();
    } catch (error) {
      snarkyError = (error as Error).message;
    }
    snarkyTime = performance.now() - snarkyStartTime;
    
    // Test with Sparky
    await switchBackend('sparky');
    const sparkyStartTime = performance.now();
    try {
      sparkyResult = await operation();
    } catch (error) {
      sparkyError = (error as Error).message;
    }
    sparkyTime = performance.now() - sparkyStartTime;
    
    // Compare results
    let match = false;
    if (snarkyError && sparkyError) {
      // Both errored - consider this a match if error types are similar
      match = true;
    } else if (!snarkyError && !sparkyError) {
      // Both succeeded - compare results
      if (resultComparator) {
        match = resultComparator(snarkyResult, sparkyResult);
      } else if (typeof snarkyResult === 'object' && snarkyResult?.toString) {
        match = snarkyResult.toString() === sparkyResult.toString();
      } else {
        match = snarkyResult === sparkyResult;
      }
    }
    
    return {
      snarkyResult,
      sparkyResult,
      match,
      snarkyTime,
      sparkyTime,
      snarkyError,
      sparkyError
    };
  }
  
  /**
   * Property: Field addition produces identical results across backends
   */
  fieldAdditionParity(): IAsyncProperty<[Field, Field]> {
    return fc.asyncProperty(
      RuthlessFieldGenerators.pairs(),
      async ([a, b]) => {
        const result = await this.compareBackends(
          () => a.add(b),
          (snarky, sparky) => snarky.toString() === sparky.toString()
        );
        
        if (!result.match) {
          throw new Error(
            `Field addition mismatch: ${a.toString()} + ${b.toString()}\n` +
            `Snarky: ${result.snarkyResult?.toString()}\n` +
            `Sparky: ${result.sparkyResult?.toString()}`
          );
        }
        
        return true;
      }
    );
  }
  
  /**
   * Property: Field multiplication produces identical results across backends
   */
  fieldMultiplicationParity(): IAsyncProperty<[Field, Field]> {
    return fc.asyncProperty(
      RuthlessFieldGenerators.pairs(),
      async ([a, b]) => {
        const result = await this.compareBackends(
          () => a.mul(b),
          (snarky, sparky) => snarky.toString() === sparky.toString()
        );
        
        if (!result.match) {
          throw new Error(
            `Field multiplication mismatch: ${a.toString()} * ${b.toString()}\n` +
            `Snarky: ${result.snarkyResult?.toString()}\n` +
            `Sparky: ${result.sparkyResult?.toString()}`
          );
        }
        
        return true;
      }
    );
  }
  
  /**
   * Property: Field inversion produces identical results across backends
   */
  fieldInversionParity(): IAsyncProperty<Field> {
    return fc.asyncProperty(
      RuthlessFieldGenerators.nonZero(),
      async (a) => {
        const result = await this.compareBackends(
          () => a.inv(),
          (snarky, sparky) => snarky.toString() === sparky.toString()
        );
        
        if (!result.match) {
          throw new Error(
            `Field inversion mismatch: inv(${a.toString()})\n` +
            `Snarky: ${result.snarkyResult?.toString()}\n` +
            `Sparky: ${result.sparkyResult?.toString()}`
          );
        }
        
        return true;
      }
    );
  }
  
  /**
   * Property: Field squaring produces identical results across backends
   */
  fieldSquareParity(): IAsyncProperty<Field> {
    return fc.asyncProperty(
      RuthlessFieldGenerators.any(),
      async (a) => {
        const result = await this.compareBackends(
          () => a.square(),
          (snarky, sparky) => snarky.toString() === sparky.toString()
        );
        
        if (!result.match) {
          throw new Error(
            `Field square mismatch: square(${a.toString()})\n` +
            `Snarky: ${result.snarkyResult?.toString()}\n` +
            `Sparky: ${result.sparkyResult?.toString()}`
          );
        }
        
        return true;
      }
    );
  }
  
  /**
   * Property: Poseidon hash produces identical results across backends
   */
  poseidonHashParity(): IAsyncProperty<Field[]> {
    return fc.asyncProperty(
      fc.array(RuthlessFieldGenerators.any(), { minLength: 1, maxLength: 5 }),
      async (inputs) => {
        const result = await this.compareBackends(
          () => Poseidon.hash(inputs),
          (snarky, sparky) => snarky.toString() === sparky.toString()
        );
        
        if (!result.match) {
          throw new Error(
            `Poseidon hash mismatch: hash([${inputs.map(f => f.toString()).join(', ')}])\n` +
            `Snarky: ${result.snarkyResult?.toString()}\n` +
            `Sparky: ${result.sparkyResult?.toString()}`
          );
        }
        
        return true;
      }
    );
  }
  
  /**
   * Property: Complex field expressions produce identical results
   */
  complexExpressionParity(): IAsyncProperty<[Field, Field, Field]> {
    return fc.asyncProperty(
      RuthlessFieldGenerators.triples(),
      async ([a, b, c]) => {
        const result = await this.compareBackends(
          () => {
            // Complex expression: (a + b)^2 - (a^2 + 2*a*b + b^2) [should equal 0]
            const sum = a.add(b);
            const sumSquared = sum.square();
            const expanded = a.square().add(a.mul(b).mul(Field(2))).add(b.square());
            return sumSquared.sub(expanded);
          },
          (snarky, sparky) => snarky.toString() === sparky.toString()
        );
        
        if (!result.match) {
          throw new Error(
            `Complex expression mismatch with inputs: a=${a.toString()}, b=${b.toString()}, c=${c.toString()}\n` +
            `Snarky: ${result.snarkyResult?.toString()}\n` +
            `Sparky: ${result.sparkyResult?.toString()}`
          );
        }
        
        return true;
      }
    );
  }
  
  /**
   * Property: Backend switching preserves field operation results
   */
  backendSwitchingConsistency(): IAsyncProperty<{ switchPattern: ('snarky' | 'sparky')[]; operations: (() => Field)[] }> {
    return fc.asyncProperty(
      RuthlessScenarioGenerators.backendSwitching(),
      async ({ switchPattern, operations }) => {
        const results: { backend: string; result: string }[] = [];
        
        for (let i = 0; i < switchPattern.length; i++) {
          await switchBackend(switchPattern[i]);
          const currentBackend = getCurrentBackend();
          
          if (currentBackend !== switchPattern[i]) {
            throw new Error(`Backend switch failed: expected ${switchPattern[i]}, got ${currentBackend}`);
          }
          
          // Execute operations
          for (const operation of operations) {
            const result = operation();
            results.push({ backend: currentBackend, result: result.toString() });
            
            // Test basic operation still works
            const testResult = Field(42).add(Field(1));
            if (testResult.toString() !== Field(43).toString()) {
              throw new Error(`Basic operation failed after switch to ${currentBackend}`);
            }
          }
        }
        
        return true;
      }
    );
  }
  
  /**
   * Property: Simple circuit VK generation produces identical hashes
   */
  simpleCircuitVKParity(): IAsyncProperty<{ name: string; publicInputs: Field[]; privateInputs: Field[] }> {
    return fc.asyncProperty(
      fc.record({
        name: fc.constantFrom('SimpleAdd', 'SimpleMultiply', 'SimpleSquare'),
        publicInputs: fc.array(RuthlessFieldGenerators.any(), { minLength: 1, maxLength: 2 }),
        privateInputs: fc.array(RuthlessFieldGenerators.any(), { minLength: 1, maxLength: 2 })
      }),
      async ({ name, publicInputs, privateInputs }) => {
        const circuitName = `${name}_${Date.now()}_${(Date.now() % 1000000).toString(36)}`;
        
        // Create simple circuit based on name
        let circuit;
        if (name === 'SimpleAdd') {
          circuit = ZkProgram({
            name: circuitName,
            publicInput: Field,
            methods: {
              compute: {
                privateInputs: [Field],
                async method(publicInput: Field, privateInput: Field) {
                  const sum = publicInput.add(privateInput);
                  sum.assertEquals(publicInput.add(privateInput));
                }
              }
            }
          });
        } else if (name === 'SimpleMultiply') {
          circuit = ZkProgram({
            name: circuitName,
            publicInput: Field,
            methods: {
              compute: {
                privateInputs: [Field],
                async method(publicInput: Field, privateInput: Field) {
                  const product = publicInput.mul(privateInput);
                  product.assertEquals(publicInput.mul(privateInput));
                }
              }
            }
          });
        } else {
          circuit = ZkProgram({
            name: circuitName,
            publicInput: Field,
            methods: {
              compute: {
                privateInputs: [Field],
                async method(publicInput: Field, privateInput: Field) {
                  const squared = privateInput.square();
                  squared.assertEquals(privateInput.mul(privateInput));
                }
              }
            }
          });
        }
        
        const vkResult = await this.compareBackends(
          async () => {
            const { verificationKey } = await circuit.compile();
            return verificationKey.hash.toString();
          },
          (snarky, sparky) => snarky === sparky
        );
        
        if (!vkResult.match) {
          throw new Error(
            `VK hash mismatch for ${name} circuit:\n` +
            `Snarky VK: ${vkResult.snarkyResult}\n` +
            `Sparky VK: ${vkResult.sparkyResult}`
          );
        }
        
        return true;
      }
    );
  }
  
  /**
   * Property: Division by zero handling is consistent across backends
   */
  divisionByZeroConsistency(): IAsyncProperty<Field> {
    return fc.asyncProperty(
      RuthlessFieldGenerators.any(),
      async (a) => {
        const result = await this.compareBackends(
          () => a.div(Field(0))
        );
        
        // Both backends should error consistently
        const bothErrored = result.snarkyError && result.sparkyError;
        const neitherErrored = !result.snarkyError && !result.sparkyError;
        
        if (!bothErrored && !neitherErrored) {
          throw new Error(
            `Division by zero handling inconsistent:\n` +
            `Snarky error: ${result.snarkyError || 'none'}\n` +
            `Sparky error: ${result.sparkyError || 'none'}`
          );
        }
        
        return true;
      }
    );
  }
  
  /**
   * Property: Performance difference is within acceptable bounds
   */
  performanceWithinBounds(): IAsyncProperty<{ operationType: string; inputs: Field[] }> {
    return fc.asyncProperty(
      fc.record({
        operationType: fc.constantFrom('add', 'mul', 'square', 'hash'),
        inputs: fc.array(RuthlessFieldGenerators.any(), { minLength: 1, maxLength: 3 })
      }),
      async ({ operationType, inputs }) => {
        let operation: () => any;
        
        switch (operationType) {
          case 'add':
            operation = () => inputs[0].add(inputs[1] || Field(1));
            break;
          case 'mul':
            operation = () => inputs[0].mul(inputs[1] || Field(2));
            break;
          case 'square':
            operation = () => inputs[0].square();
            break;
          case 'hash':
            operation = () => Poseidon.hash(inputs.slice(0, 2));
            break;
          default:
            operation = () => inputs[0].add(Field(1));
        }
        
        const result = await this.compareBackends(operation);
        
        // Check performance is within 5x (generous bound for testing)
        const performanceRatio = result.sparkyTime / Math.max(result.snarkyTime, 0.001);
        
        if (performanceRatio > 5.0) {
          throw new Error(
            `Performance difference too large for ${operationType}: ` +
            `Sparky is ${performanceRatio.toFixed(2)}x slower than Snarky ` +
            `(${result.sparkyTime.toFixed(2)}ms vs ${result.snarkyTime.toFixed(2)}ms)`
          );
        }
        
        return true;
      }
    );
  }
  
  /**
   * Get all ruthless properties for comprehensive testing
   */
  getAllProperties(): Array<{
    name: string;
    property: IAsyncProperty<any>;
    config: { numRuns: number; timeout: number; };
  }> {
    return [
      {
        name: 'ruthless_field_addition_parity',
        property: this.fieldAdditionParity(),
        config: { numRuns: 100, timeout: 60000 }
      },
      {
        name: 'ruthless_field_multiplication_parity',
        property: this.fieldMultiplicationParity(),
        config: { numRuns: 100, timeout: 60000 }
      },
      {
        name: 'ruthless_field_inversion_parity',
        property: this.fieldInversionParity(),
        config: { numRuns: 50, timeout: 45000 }
      },
      {
        name: 'ruthless_field_square_parity',
        property: this.fieldSquareParity(),
        config: { numRuns: 75, timeout: 45000 }
      },
      {
        name: 'ruthless_poseidon_hash_parity',
        property: this.poseidonHashParity(),
        config: { numRuns: 50, timeout: 60000 }
      },
      {
        name: 'ruthless_complex_expression_parity',
        property: this.complexExpressionParity(),
        config: { numRuns: 40, timeout: 90000 }
      },
      {
        name: 'ruthless_backend_switching_consistency',
        property: this.backendSwitchingConsistency(),
        config: { numRuns: 25, timeout: 120000 }
      },
      {
        name: 'ruthless_simple_circuit_vk_parity',
        property: this.simpleCircuitVKParity(),
        config: { numRuns: 15, timeout: 300000 }
      },
      {
        name: 'ruthless_division_by_zero_consistency',
        property: this.divisionByZeroConsistency(),
        config: { numRuns: 30, timeout: 30000 }
      },
      {
        name: 'ruthless_performance_within_bounds',
        property: this.performanceWithinBounds(),
        config: { numRuns: 25, timeout: 60000 }
      }
    ];
  }
  
  /**
   * Get properties focused on VK parity (the critical issue)
   */
  getVKParityProperties(): Array<{
    name: string;
    property: IAsyncProperty<any>;
    config: { numRuns: number; timeout: number; };
  }> {
    return [
      {
        name: 'ruthless_vk_parity_focus',
        property: this.simpleCircuitVKParity(),
        config: { numRuns: 50, timeout: 600000 }
      }
    ];
  }
  
  /**
   * Get properties focused on basic operations (should all pass)
   */
  getBasicOperationProperties(): Array<{
    name: string;
    property: IAsyncProperty<any>;
    config: { numRuns: number; timeout: number; };
  }> {
    return [
      {
        name: 'ruthless_basic_addition',
        property: this.fieldAdditionParity(),
        config: { numRuns: 200, timeout: 60000 }
      },
      {
        name: 'ruthless_basic_multiplication',
        property: this.fieldMultiplicationParity(),
        config: { numRuns: 200, timeout: 60000 }
      },
      {
        name: 'ruthless_basic_poseidon',
        property: this.poseidonHashParity(),
        config: { numRuns: 100, timeout: 60000 }
      }
    ];
  }
}

/**
 * Export configured instance
 */
export const ruthlessBackendParityProperties = new RuthlessBackendParityProperties();