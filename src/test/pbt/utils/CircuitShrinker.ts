/**
 * Circuit shrinking utilities for minimizing failing test cases
 * 
 * This module provides functionality to automatically reduce complex
 * failing circuits to their minimal form while preserving the failure.
 */

/**
 * Circuit operation types
 */
export type OperationType = 
  | 'field_add' 
  | 'field_mul' 
  | 'field_div'
  | 'field_sqrt'
  | 'poseidon'
  | 'ec_scale'
  | 'foreign_field_add'
  | 'assertion'
  | 'conditional';

/**
 * Basic circuit structure
 */
export interface Circuit {
  publicInputs: any[];
  operations: Operation[];
  assertions: Assertion[];
  metadata?: {
    originalSize?: number;
    shrinkingSteps?: number;
  };
}

/**
 * Circuit operation
 */
export interface Operation {
  type: OperationType;
  inputs: any[];
  output?: any;
  id: string;
}

/**
 * Circuit assertion
 */
export interface Assertion {
  type: 'equals' | 'boolean' | 'range';
  value: any;
  expected?: any;
  id: string;
}

/**
 * Shrinking result
 */
export interface ShrinkResult {
  circuit: Circuit;
  steps: number;
  reductions: string[];
}

/**
 * Circuit shrinker for minimizing failing test cases
 */
export class CircuitShrinker {
  private steps: number = 0;
  private reductions: string[] = [];
  private testFn: (circuit: Circuit) => Promise<boolean>;

  constructor(testFn: (circuit: Circuit) => Promise<boolean>) {
    this.testFn = testFn;
  }

  /**
   * Shrink a failing circuit to its minimal form
   */
  async shrink(failingCircuit: Circuit): Promise<ShrinkResult> {
    this.steps = 0;
    this.reductions = [];
    
    let current = this.cloneCircuit(failingCircuit);
    current.metadata = {
      originalSize: this.circuitSize(current),
      shrinkingSteps: 0
    };

    // Apply shrinking strategies in order of effectiveness
    current = await this.shrinkByRemovingOperations(current);
    current = await this.shrinkBySimplifyingOperations(current);
    current = await this.shrinkByReducingValues(current);
    current = await this.shrinkByRemovingAssertions(current);
    
    current.metadata!.shrinkingSteps = this.steps;

    return {
      circuit: current,
      steps: this.steps,
      reductions: this.reductions
    };
  }

  /**
   * Strategy 1: Remove operations while preserving failure
   */
  private async shrinkByRemovingOperations(circuit: Circuit): Promise<Circuit> {
    let current = circuit;
    let changed = true;

    while (changed) {
      changed = false;
      
      // Try removing each operation
      for (let i = current.operations.length - 1; i >= 0; i--) {
        const candidate = this.cloneCircuit(current);
        candidate.operations.splice(i, 1);
        
        if (await this.stillFails(candidate)) {
          current = candidate;
          changed = true;
          this.steps++;
          this.reductions.push(`Removed operation at index ${i}`);
          break; // Start over with new circuit
        }
      }
    }

    return current;
  }

  /**
   * Strategy 2: Simplify operations
   */
  private async shrinkBySimplifyingOperations(circuit: Circuit): Promise<Circuit> {
    let current = circuit;
    let changed = true;

    while (changed) {
      changed = false;

      for (let i = 0; i < current.operations.length; i++) {
        const simplifiedOps = this.simplifyOperation(current.operations[i]);
        
        for (const simplified of simplifiedOps) {
          const candidate = this.cloneCircuit(current);
          candidate.operations[i] = simplified;
          
          if (await this.stillFails(candidate)) {
            current = candidate;
            changed = true;
            this.steps++;
            this.reductions.push(`Simplified operation ${current.operations[i].id}`);
            break;
          }
        }
        
        if (changed) break;
      }
    }

    return current;
  }

  /**
   * Strategy 3: Reduce numeric values
   */
  private async shrinkByReducingValues(circuit: Circuit): Promise<Circuit> {
    let current = circuit;
    let changed = true;

    while (changed) {
      changed = false;

      // Reduce public inputs
      for (let i = 0; i < current.publicInputs.length; i++) {
        const reducedValues = this.reduceValue(current.publicInputs[i]);
        
        for (const reduced of reducedValues) {
          const candidate = this.cloneCircuit(current);
          candidate.publicInputs[i] = reduced;
          
          if (await this.stillFails(candidate)) {
            current = candidate;
            changed = true;
            this.steps++;
            this.reductions.push(`Reduced public input ${i}`);
            break;
          }
        }
        
        if (changed) break;
      }

      // Reduce operation inputs
      if (!changed) {
        for (let i = 0; i < current.operations.length; i++) {
          const op = current.operations[i];
          
          for (let j = 0; j < op.inputs.length; j++) {
            const reducedValues = this.reduceValue(op.inputs[j]);
            
            for (const reduced of reducedValues) {
              const candidate = this.cloneCircuit(current);
              candidate.operations[i].inputs[j] = reduced;
              
              if (await this.stillFails(candidate)) {
                current = candidate;
                changed = true;
                this.steps++;
                this.reductions.push(`Reduced input ${j} of operation ${op.id}`);
                break;
              }
            }
            
            if (changed) break;
          }
          
          if (changed) break;
        }
      }
    }

    return current;
  }

  /**
   * Strategy 4: Remove assertions
   */
  private async shrinkByRemovingAssertions(circuit: Circuit): Promise<Circuit> {
    let current = circuit;
    let changed = true;

    while (changed && current.assertions.length > 0) {
      changed = false;
      
      for (let i = current.assertions.length - 1; i >= 0; i--) {
        const candidate = this.cloneCircuit(current);
        candidate.assertions.splice(i, 1);
        
        if (await this.stillFails(candidate)) {
          current = candidate;
          changed = true;
          this.steps++;
          this.reductions.push(`Removed assertion at index ${i}`);
          break;
        }
      }
    }

    return current;
  }

  /**
   * Generate simplified versions of an operation
   */
  private simplifyOperation(op: Operation): Operation[] {
    const simplified: Operation[] = [];

    // Try replacing with simpler operations
    switch (op.type) {
      case 'field_mul':
        // Try replacing multiplication with addition
        simplified.push({
          ...op,
          type: 'field_add'
        });
        break;
        
      case 'field_div':
        // Try replacing division with multiplication
        simplified.push({
          ...op,
          type: 'field_mul'
        });
        break;
        
      case 'poseidon':
        // Try with fewer inputs
        if (op.inputs.length > 1) {
          simplified.push({
            ...op,
            inputs: [op.inputs[0]]
          });
        }
        break;
        
      case 'conditional':
        // Try removing the condition
        simplified.push({
          ...op,
          type: 'field_add',
          inputs: op.inputs.slice(1)
        });
        break;
    }

    return simplified;
  }

  /**
   * Generate reduced versions of a value
   */
  private reduceValue(value: any): any[] {
    const reduced: any[] = [];

    if (typeof value === 'bigint' || (value && typeof value.toBigInt === 'function')) {
      const bigIntValue = typeof value === 'bigint' ? value : value.toBigInt();
      
      // Try common small values
      reduced.push(0n);
      reduced.push(1n);
      
      // Try halving
      if (bigIntValue > 2n) {
        reduced.push(bigIntValue / 2n);
      }
      
      // Try order of magnitude reduction
      if (bigIntValue > 1000n) {
        reduced.push(bigIntValue / 10n);
        reduced.push(bigIntValue / 100n);
      }
    } else if (typeof value === 'number') {
      reduced.push(0);
      reduced.push(1);
      if (value > 2) {
        reduced.push(Math.floor(value / 2));
      }
    } else if (Array.isArray(value)) {
      // Try with fewer elements
      if (value.length > 1) {
        reduced.push([value[0]]);
        reduced.push(value.slice(0, Math.floor(value.length / 2)));
      }
    }

    return reduced;
  }

  /**
   * Test if circuit still fails
   */
  private async stillFails(circuit: Circuit): Promise<boolean> {
    try {
      return await this.testFn(circuit);
    } catch (error) {
      // If test throws, consider it a failure
      return true;
    }
  }

  /**
   * Calculate circuit size for comparison
   */
  private circuitSize(circuit: Circuit): number {
    let size = 0;
    
    size += circuit.publicInputs.length;
    size += circuit.operations.length * 2; // Operations count more
    size += circuit.assertions.length;
    
    // Count operation complexity
    for (const op of circuit.operations) {
      size += op.inputs.length;
    }
    
    return size;
  }

  /**
   * Deep clone a circuit
   */
  private cloneCircuit(circuit: Circuit): Circuit {
    return JSON.parse(JSON.stringify(circuit));
  }

  /**
   * Get shrinking steps for reporting
   */
  getSteps(): number {
    return this.steps;
  }

  /**
   * Get reduction log
   */
  getReductions(): string[] {
    return this.reductions;
  }

  /**
   * Binary search shrinking for arrays (more efficient for large arrays)
   */
  async binarySearchShrink<T>(
    items: T[],
    buildCircuit: (items: T[]) => Circuit
  ): Promise<T[]> {
    if (items.length <= 1) return items;

    const isFailingSubset = async (subset: T[]): Promise<boolean> => {
      const circuit = buildCircuit(subset);
      return this.stillFails(circuit);
    };

    // Try first half
    const mid = Math.floor(items.length / 2);
    const firstHalf = items.slice(0, mid);
    
    if (await isFailingSubset(firstHalf)) {
      this.steps++;
      this.reductions.push(`Binary search: reduced to first half (${firstHalf.length} items)`);
      return this.binarySearchShrink(firstHalf, buildCircuit);
    }

    // Try second half
    const secondHalf = items.slice(mid);
    if (await isFailingSubset(secondHalf)) {
      this.steps++;
      this.reductions.push(`Binary search: reduced to second half (${secondHalf.length} items)`);
      return this.binarySearchShrink(secondHalf, buildCircuit);
    }

    // Neither half fails alone, try removing individual elements
    for (let i = 0; i < items.length; i++) {
      const subset = [...items.slice(0, i), ...items.slice(i + 1)];
      if (await isFailingSubset(subset)) {
        this.steps++;
        this.reductions.push(`Binary search: removed item at index ${i}`);
        return this.binarySearchShrink(subset, buildCircuit);
      }
    }

    // Cannot shrink further
    return items;
  }
}

/**
 * Format shrink result for display
 */
export function formatShrinkResult(result: ShrinkResult): string {
  const lines: string[] = [
    '=== Circuit Shrinking Result ===',
    `Original size: ${result.circuit.metadata?.originalSize || 'unknown'}`,
    `Final size: ${new CircuitShrinker(() => Promise.resolve(false)).circuitSize(result.circuit)}`,
    `Shrinking steps: ${result.steps}`,
    '',
    'Reductions applied:',
    ...result.reductions.map(r => `  - ${r}`),
    '',
    'Minimal failing circuit:',
    `  Public inputs: ${result.circuit.publicInputs.length}`,
    `  Operations: ${result.circuit.operations.length}`,
    `  Assertions: ${result.circuit.assertions.length}`
  ];
  
  return lines.join('\n');
}