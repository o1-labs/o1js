/**
 * Constraint System Module
 * 
 * This module handles constraint accumulation, constraint system APIs,
 * and mode management (constraint vs witness generation).
 */

import type { FieldVar, ModeHandle } from './types.js';
import { getSparkyInstance } from './module-loader.js';
import { cvarToFieldVar, ensureFieldVar } from './format-converter.js';

// Compilation state tracking
let isCompilingCircuit = false;

/**
 * Get the run module from Sparky instance
 */
function getRunModule() {
  return getSparkyInstance().run;
}

/**
 * Get the field module from Sparky instance
 */
function getFieldModule() {
  return getSparkyInstance().field;
}

/**
 * Get the constraint system module from Sparky instance
 */
function getConstraintSystemModule() {
  return getSparkyInstance().constraintSystem;
}

/**
 * Set compilation state
 */
export function setCompilingCircuit(value: boolean): void {
  isCompilingCircuit = value;
}

/**
 * Get compilation state
 */
export function getCompilingCircuit(): boolean {
  return isCompilingCircuit;
}

/**
 * Run operations interface
 */
export const runOperations = {
  /**
   * Enter constraint generation mode
   * Returns a function that exits the mode and returns accumulated constraints
   */
  enterConstraintSystem(): () => any {
    // Set compilation state
    setCompilingCircuit(true);
    
    // Switch Sparky to constraint accumulation mode
    const handle = getRunModule().enterConstraintSystem();
    
    // Return closure that exits mode and retrieves constraints
    return () => {
      try {
        // Get accumulated constraints from global Sparky state
        const cs = getRunModule().getConstraintSystem();
        handle.exit(); // Exit constraint generation mode
        return cs;
      } finally {
        // Clear compilation state
        setCompilingCircuit(false);
      }
    };
  },
  
  /**
   * Enter witness generation mode
   * Returns a function that exits the mode
   */
  enterGenerateWitness(): () => void {
    // Enter witness generation mode - puts Sparky in prover mode
    const handle = getRunModule().enterGenerateWitness();
    
    return () => {
      try {
        // Exit witness generation mode
        handle.exit();
        
        // For constraint checking, don't return a value
        return undefined;
        
      } catch (error) {
        // If witness generation failed, constraints were not satisfied
        throw error;
      }
    };
  },
  
  /**
   * Enter prover mode for witness computation
   * Returns a function that handles witness provision or variable creation
   */
  enterAsProver(size: number): (fields: any) => any {
    // Switch to witness computation mode
    const handle = getRunModule().enterAsProver(size);
    
    // Return dual-mode closure
    return (fields: any) => {
      try {
        // OCaml option type handling: 0 = None, [0, values] = Some(values)
        if (fields !== 0) {
          // Witness provision mode: concrete values provided
          const actualValues = fields[1];
          // Skip MlArray tag (index 0) and map values
          const result = actualValues.slice(1).map((f: any) => {
            // Create witness variables with stored values
            const witnessCvar = getRunModule().existsOne(() => {
              // Convert Field object to BigInt for WASM layer
              return typeof f.toBigInt === 'function' ? f.toBigInt() : f;
            });
            return ensureFieldVar(witnessCvar);
          });
          // Return in MlArray format: [0, ...fieldVars]
          return [0, ...result];
        }
        
        // Variable creation mode: no witness provided
        const vars: FieldVar[] = [];
        for (let i = 0; i < size; i++) {
          // Create witness variable for later assignment
          const sparkyVar = getFieldModule().exists(null);
          const o1jsVar = ensureFieldVar(sparkyVar);
          vars.push(o1jsVar);
        }
        // Return in MlArray format
        return [0, ...vars];
      } finally {
        // Always exit prover mode to prevent state corruption
        handle.exit();
      }
    };
  },
  
  /**
   * Get the current constraint system
   */
  getConstraintSystem(): any {
    return getRunModule().getConstraintSystem();
  },
  
  /**
   * Create multiple witness variables
   */
  exists(size: number, compute?: () => any[]): FieldVar[] {
    const result = getRunModule().exists(size, compute);
    // Convert each Cvar to FieldVar
    const vars: FieldVar[] = [];
    for (let i = 0; i < result.length; i++) {
      vars.push(ensureFieldVar(result[i]));
    }
    return vars;
  },
  
  /**
   * Create a single witness variable
   */
  existsOne(compute?: () => any): FieldVar {
    const result = getRunModule().existsOne(compute);
    return ensureFieldVar(result);
  },
  
  /**
   * Check if in prover/witness mode
   */
  inProver(): boolean {
    return getRunModule().inProver();
  },
  
  /**
   * Execute a function in prover mode
   */
  asProver(f: () => void): void {
    getRunModule().asProver(f);
  },
  
  /**
   * Get inProverBlock function (same as inProver)
   */
  inProverBlock(): boolean {
    return getRunModule().inProverBlock();
  },
  
  /**
   * Set evaluation constraints mode
   */
  setEvalConstraints(value: boolean): void {
    getRunModule().setEvalConstraints(value);
  },
  
  /**
   * Run state operations
   */
  state: {
    /**
     * Allocate a new variable
     */
    allocVar(state: any): [1, number] {
      const runState = getRunModule().state;
      const varIndex = runState.allocVar();
      return [1, varIndex]; // [FieldType.Var, index]
    },
    
    /**
     * Store field element value
     */
    storeFieldElt(state: any, x: any): FieldVar {
      const runState = getRunModule().state;
      // Store the field element value for the variable
      if (Array.isArray(state) && state[0] === 1) {
        runState.storeFieldElt(state[1], x);
      }
      return ensureFieldVar(getFieldModule().constant(x));
    },
    
    /**
     * Get variable value
     */
    getVariableValue(state: any, x: FieldVar): string {
      return getFieldModule().readVar(x as any);
    },
    
    /**
     * Check if in prover mode
     */
    asProver(state: any): boolean {
      return getRunModule().inProver();
    },
    
    /**
     * Set prover mode
     */
    setAsProver(state: any, value: boolean): void {
      // Don't interfere with constraint generation mode
      if (isCompilingCircuit) {
        // During constraint compilation, maintain constraint generation mode
        return;
      }
      
      if (value) {
        getRunModule().witnessMode();
      } else {
        getRunModule().constraintMode();
      }
    },
    
    /**
     * Check if has witness values
     */
    hasWitness(state: any): boolean {
      return getRunModule().inProver();
    }
  }
};

/**
 * Constraint system operations interface
 */
export const constraintSystemOperations = {
  /**
   * Get number of constraints in the system
   */
  rows(system: any): number {
    return getConstraintSystemModule().rows(system);
  },
  
  /**
   * Get constraint system digest
   */
  digest(system: any): any {
    return getConstraintSystemModule().digest(system);
  },
  
  /**
   * Convert constraint system to JSON
   */
  toJson(system: any): any {
    const json = getConstraintSystemModule().toJson(system);
    
    // Validate JSON structure
    if (!json) {
      throw new Error('Constraint system toJson() returned null/undefined');
    }
    
    if (typeof json !== 'object') {
      throw new Error(`Constraint system toJson() returned invalid type: ${typeof json}`);
    }
    
    // Validate required fields
    if (!json.hasOwnProperty('gates') && !json.hasOwnProperty('constraints')) {
      throw new Error('Constraint system JSON missing both gates and constraints fields');
    }
    
    if (!json.hasOwnProperty('public_input_size')) {
      throw new Error('Constraint system JSON missing public_input_size field');
    }
    
    // Convert constraints to gates format if needed
    if (!json.gates) {
      if (!json.constraints) {
        throw new Error('Constraint system JSON has no gates or constraints data');
      }
      json.gates = json.constraints;
    }
    
    // Sparky now generates Snarky-compatible JSON format directly
    return json;
  }
};