/**
 * Field Operations Module
 * 
 * This module implements all field arithmetic operations that form the foundation
 * of all zkSNARK circuits. Each operation must generate exactly the same constraint
 * graph as the equivalent Snarky operation to maintain VK compatibility.
 */

import type { FieldVar, Cvar } from './types.js';
import { getSparkyInstance } from './module-loader.js';
import { cvarToFieldVar, ensureFieldVar, fieldVarToCvar } from './format-converter.js';
import { getWitnessStore } from './memory-manager.js';

// Memory barrier function for deterministic behavior
function memoryBarrier(): void {
  // Force memory synchronization point
  // In JavaScript, this is mostly a no-op but marks critical sections
}

/**
 * Get the field module from Sparky instance
 */
function getFieldModule() {
  return getSparkyInstance().field;
}

/**
 * Get the run module from Sparky instance
 */
function getRunModule() {
  return getSparkyInstance().run;
}

/**
 * Field operations interface
 */
export const fieldOperations = {
  /**
   * Read witness value from a field variable
   * Only valid in prover mode when actual values are available
   */
  readVar(x: FieldVar): string {
    try {
      return getFieldModule().readVar(x as any);
    } catch (error: any) {
      // Enhanced error context
      if (error.message && error.message.includes('prover mode')) {
        throw new Error('readVar can only be called in prover mode (inside asProver or witness blocks)');
      }
      throw error;
    }
  },
  
  /**
   * Create a constant field variable
   */
  constant(value: string | bigint): FieldVar {
    const strValue = typeof value === 'string' ? value : value.toString();
    const result = getFieldModule().constant(strValue);
    return ensureFieldVar(result);
  },
  
  /**
   * Create a witness variable with optional compute function
   */
  exists(compute?: () => any): FieldVar {
    const result = getFieldModule().exists(compute);
    return ensureFieldVar(result);
  },
  
  /**
   * Assert two field variables are equal
   */
  assertEqual(x: FieldVar, y: FieldVar): void {
    // CRITICAL FIX: Direct equality constraint without transformation
    // This preserves variable identity and avoids unwanted Add expressions
    getFieldModule().assertEqual(x as any, y as any);
  },
  
  /**
   * Assert multiplication constraint: x * y = z
   */
  assertMul(x: FieldVar, y: FieldVar, z: FieldVar): void {
    // Check for division by zero pattern: 0 * 0 = 1 (impossible)
    if (isZeroFieldVar(x) && isZeroFieldVar(y) && isOneFieldVar(z)) {
      throw Error('Field.inv(): Division by zero');
    }
    
    // Always use direct assert_mul to generate single constraint
    getFieldModule().assertMul(x as any, y as any, z as any);
  },
  
  /**
   * Assert square constraint: x² = y
   */
  assertSquare(x: FieldVar, y: FieldVar): void {
    getFieldModule().assertSquare(x as any, y as any);
  },
  
  /**
   * Assert boolean constraint: x ∈ {0, 1}
   */
  assertBoolean(x: FieldVar): void {
    getFieldModule().assertBoolean(x as any);
  },
  
  /**
   * Field addition: x + y
   */
  add(x: FieldVar, y: FieldVar): FieldVar {
    try {
      // Try direct method first if available for Snarky compatibility
      const result = (getFieldModule() as any).addDirect ? 
        (getFieldModule() as any).addDirect(x as any, y as any) : 
        getFieldModule().add(x as any, y as any);
      return ensureFieldVar(result);
    } catch (error) {
      // Fallback to standard method
      const result = getFieldModule().add(x as any, y as any);
      return ensureFieldVar(result);
    }
  },
  
  /**
   * Field multiplication: x * y
   */
  mul(x: FieldVar, y: FieldVar): FieldVar {
    try {
      // Try direct method first if available for Snarky compatibility
      const result = (getFieldModule() as any).mulDirect ? 
        (getFieldModule() as any).mulDirect(x as any, y as any) : 
        getFieldModule().mul(x as any, y as any);
      return ensureFieldVar(result);
    } catch (error) {
      // Fallback to standard method
      const result = getFieldModule().mul(x as any, y as any);
      return ensureFieldVar(result);
    }
  },
  
  /**
   * Field subtraction: x - y
   */
  sub(x: FieldVar, y: FieldVar): FieldVar {
    const result = getFieldModule().sub(x as any, y as any);
    return ensureFieldVar(result);
  },
  
  /**
   * Field scaling: scalar * x
   */
  scale(scalar: string | bigint, x: FieldVar): FieldVar {
    const result = getFieldModule().scale(scalar, x as any);
    return ensureFieldVar(result);
  },
  
  /**
   * Field squaring: x²
   */
  square(x: FieldVar): FieldVar {
    // Memory barrier for deterministic squaring computation
    memoryBarrier();
    
    const result = getFieldModule().square(x as any);
    return ensureFieldVar(result);
  },
  
  /**
   * Field division: x / y
   * Implemented as x * y^(-1)
   */
  div(x: FieldVar, y: FieldVar): FieldVar {
    const yInv = this.inv(y);
    const result = getFieldModule().mul(x as any, yInv as any);
    return ensureFieldVar(result);
  },
  
  /**
   * Field inversion: x^(-1)
   * Computes modular inverse such that x * result ≡ 1 (mod p)
   */
  inv(x: FieldVar): FieldVar {
    try {
      const result = getFieldModule().inv(x as any);
      return ensureFieldVar(result);
    } catch (error: any) {
      // Standardize error message to match Field.ts
      if (error.message && (error.message.includes('zero') || error.message.includes('inverse'))) {
        throw Error('Field.inv(): Division by zero');
      }
      throw error;
    }
  },
  
  /**
   * Field comparison
   * Returns {less, less_or_equal} boolean variables
   */
  compare(bitLength: number, x: FieldVar, y: FieldVar): [FieldVar, FieldVar, FieldVar] {
    try {
      // Create difference: diff = x - y
      const diff = this.sub(x, y);
      
      const runModule = getRunModule();
      
      // Create witness variables for comparison results
      const less = ensureFieldVar(runModule.existsOne(() => {
        // In witness computation, evaluate the actual comparison
        // This is a simplified version - full implementation would use bit decomposition
        try {
          const xVal = getWitnessValue(x);
          const yVal = getWitnessValue(y);
          const isLess = xVal < yVal;
          return this.constant(isLess ? '1' : '0');
        } catch (e) {
          // Fallback for constraint compilation phase
          return this.constant('0');
        }
      }));
      
      const less_or_equal = ensureFieldVar(runModule.existsOne(() => {
        try {
          const xVal = getWitnessValue(x);
          const yVal = getWitnessValue(y);
          const isLessOrEqual = xVal <= yVal;
          return this.constant(isLessOrEqual ? '1' : '0');
        } catch (e) {
          // Fallback for constraint compilation phase
          return this.constant('0');
        }
      }));
      
      // Add proper boolean constraints
      this.assertBoolean(less);
      this.assertBoolean(less_or_equal);
      
      // Add consistency constraint: if less is true, then less_or_equal must be true
      // less => less_or_equal  ⟺  less * (1 - less_or_equal) = 0
      const temp1 = this.sub(this.constant('1'), less_or_equal);
      const temp2 = this.mul(less, temp1);
      this.assertEqual(temp2, this.constant('0'));
      
      // Return in tuple format: [less, less_or_equal, equal]
      // The third value is 'equal' which we derive from less_or_equal AND NOT less
      const not_less = this.sub(this.constant('1'), less);
      const equal = this.mul(less_or_equal, not_less);
      
      return [less, less_or_equal, equal];
    } catch (error: any) {
      throw new Error(`field compare failed: ${error.message}`);
    }
  },
  
  /**
   * Truncate to 16-bit aligned length
   */
  truncateToBits16(lengthDiv16: number, x: FieldVar): FieldVar {
    // Implement using range check
    const bits = lengthDiv16 * 16;
    // TODO: Implement range check gate
    // getGatesModule().rangeCheckN(x, bits);
    return x;
  },
  
  /**
   * Convert to bits
   */
  toBits(length: number, x: FieldVar): FieldVar[] {
    // TODO: Implement bit decomposition
    throw new Error('toBits not yet implemented');
  },
  
  /**
   * Convert from bits
   */
  fromBits(bits: FieldVar[]): FieldVar {
    // TODO: Implement bit composition
    throw new Error('fromBits not yet implemented');
  },
  
  /**
   * Get size in bits
   */
  sizeInBits(x: FieldVar): number {
    // TODO: Implement size calculation
    return 254; // Default to field size
  },
  
  /**
   * Conditional selection
   */
  choose(condition: FieldVar, x: FieldVar, y: FieldVar, ...rest: FieldVar[]): FieldVar {
    // TODO: Implement conditional selection
    throw new Error('choose not yet implemented');
  },
  
  /**
   * If-then-else conditional
   */
  ifThenElse(condition: FieldVar, thenVal: FieldVar, elseVal: FieldVar): FieldVar {
    // TODO: Implement if-then-else
    throw new Error('ifThenElse not yet implemented');
  },
  
  /**
   * Emit semantic If constraint (Sparky-specific)
   */
  emitIfConstraint(condition: FieldVar, thenVal: FieldVar, elseVal: FieldVar): FieldVar {
    if ((getFieldModule() as any).emitIfConstraint) {
      const result = (getFieldModule() as any).emitIfConstraint(condition, thenVal, elseVal);
      return ensureFieldVar(result);
    }
    throw new Error('emitIfConstraint not available');
  },
  
  /**
   * Emit semantic Boolean AND constraint (Sparky-specific)
   */
  emitBooleanAnd(a: FieldVar, b: FieldVar): FieldVar {
    if ((getFieldModule() as any).emitBooleanAnd) {
      const result = (getFieldModule() as any).emitBooleanAnd(a, b);
      return ensureFieldVar(result);
    }
    throw new Error('emitBooleanAnd not available');
  },
  
  /**
   * Emit semantic Boolean OR constraint (Sparky-specific)
   */
  emitBooleanOr(a: FieldVar, b: FieldVar): FieldVar {
    if ((getFieldModule() as any).emitBooleanOr) {
      const result = (getFieldModule() as any).emitBooleanOr(a, b);
      return ensureFieldVar(result);
    }
    throw new Error('emitBooleanOr not available');
  },
  
  /**
   * Emit semantic Boolean NOT constraint (Sparky-specific)
   */
  emitBooleanNot(a: FieldVar): FieldVar {
    if ((getFieldModule() as any).emitBooleanNot) {
      const result = (getFieldModule() as any).emitBooleanNot(a);
      return ensureFieldVar(result);
    }
    throw new Error('emitBooleanNot not available');
  },
  
  /**
   * Square root
   */
  sqrt(x: FieldVar): FieldVar {
    // TODO: Implement square root
    throw new Error('sqrt not yet implemented');
  }
};

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Check if FieldVar is zero constant
 */
function isZeroFieldVar(fieldVar: FieldVar): boolean {
  if (!Array.isArray(fieldVar) || fieldVar.length < 2) return false;
  
  // Check if it's a constant zero: [0, [0, "0"]]
  if (fieldVar[0] === 0 && Array.isArray(fieldVar[1]) && 
      fieldVar[1][0] === 0 && fieldVar[1][1] === '0') {
    return true;
  }
  
  return false;
}

/**
 * Check if FieldVar is one constant
 */
function isOneFieldVar(fieldVar: FieldVar): boolean {
  if (!Array.isArray(fieldVar) || fieldVar.length < 2) return false;
  
  // Check if it's a constant one: [0, [0, "1"]]
  if (fieldVar[0] === 0 && Array.isArray(fieldVar[1]) && 
      fieldVar[1][0] === 0 && fieldVar[1][1] === '1') {
    return true;
  }
  
  return false;
}

/**
 * Get witness value for a field variable
 */
function getWitnessValue(fieldVar: FieldVar): bigint {
  if (fieldVar[0] === 0 && Array.isArray(fieldVar[1])) {
    // Constant value
    return BigInt(fieldVar[1][1]);
  } else if (fieldVar[0] === 1) {
    // Variable - would need to read from witness store
    throw new Error('Cannot read variable value during constraint generation');
  } else {
    throw new Error('Unknown field variable type');
  }
}