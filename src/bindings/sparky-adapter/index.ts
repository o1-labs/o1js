/**
 * Sparky Adapter Main Module
 * 
 * This is the main entry point that assembles all the modular components
 * into the complete Snarky-compatible interface.
 */

import type { SnarkyAdapter, OCamlModules } from './types.js';
import { 
  initSparkyWasm, 
  getSparkyInstance, 
  getOCamlModules,
  resetSparkyState
} from './module-loader.js';
import { 
  cvarToFieldVar, 
  fieldVarToCvar,
  toSparkyField
} from './format-converter.js';
import { 
  getWitnessStore, 
  resetWitnessStore 
} from './memory-manager.js';
import {
  activateSparkyRouting,
  activateOcamlRouting,
  updateGlobalSnarkyRouting,
  getConstraintFlowStats,
  resetConstraintFlowStats,
  setupGlobalSnarky
} from './backend-routing.js';
import { fieldOperations } from './field-operations.js';
import { gateOperations } from './gate-operations.js';
import { poseidonOperations } from './poseidon-operations.js';
import { 
  runOperations, 
  constraintSystemOperations,
  setCompilingCircuit,
  getCompilingCircuit
} from './constraint-system.js';

// ===================================================================
// GLOBAL STATE
// ===================================================================

// Track accumulated constraints for OCaml bridge
let accumulatedConstraints: any[] = [];

// Track if we're actively compiling a circuit
let isCompilingCircuit = false;

// Gate call counter for debugging
let gateCallCounter = 0;

// ===================================================================
// MEMORY PRESSURE UTILITIES
// ===================================================================

/**
 * Memory barrier for deterministic behavior
 */
function memoryBarrier(): void {
  // Force memory synchronization point
  // In JavaScript, this is mostly a no-op but marks critical sections
}

// ===================================================================
// OCAML BRIDGE FUNCTIONS
// ===================================================================

/**
 * Check if Sparky backend is active
 */
function isActiveSparkyBackend(): boolean {
  return (globalThis as any).__sparkyActive === true || 
         (globalThis as any).__currentBackend === 'sparky';
}

/**
 * Prepare for constraint accumulation
 * Called by OCaml before circuit compilation
 */
export function prepareConstraintAccumulation(): void {
  if (!isActiveSparkyBackend()) {
    return;
  }
  
  isCompilingCircuit = true;
  setCompilingCircuit(true);
  accumulatedConstraints = [];
  
  // Enter constraint generation mode
  if (!(globalThis as any).__sparkyConstraintHandle) {
    (globalThis as any).__sparkyConstraintHandle = runOperations.enterConstraintSystem();
  }
}

/**
 * Get accumulated constraints
 * Called by OCaml after circuit execution
 */
export function getAccumulatedConstraints(): any[] {
  if (!isActiveSparkyBackend()) {
    return [];
  }
  
  try {
    memoryBarrier();
    
    const totalGateCalls = gateCallCounter;
    gateCallCounter = 0;
    
    // Get constraints from Sparky state
    const constraintsJson = constraintSystemOperations.toJson({});
    
    if (constraintsJson) {
      const constraints = typeof constraintsJson === 'string' 
        ? JSON.parse(constraintsJson) 
        : constraintsJson;
      
      const gates = constraints.gates || [];
      
      if (gates.length > 100) {
        memoryBarrier();
      }
      
      return gates;
    } else {
      throw new Error('getConstraintSystem() returned null/undefined');
    }
  } catch (error: any) {
    throw new Error(`Failed to retrieve constraints from Sparky: ${error.message || error}`);
  }
}

/**
 * Get full constraint system
 * Called by zkprogram compilation
 */
export function getFullConstraintSystem(): any {
  // Debug logging disabled - uncomment if needed
  // console.log('🔍 DEBUG: getFullConstraintSystem() called from OCaml');
  
  if (!isActiveSparkyBackend()) {
    // console.log('   ↳ Snarky backend active, returning null');
    return null;
  }
  
  // console.log('   ↳ Sparky backend active, extracting constraints...');
  
  try {
    memoryBarrier();
    
    const constraintsJson = constraintSystemOperations.toJson({});
    
    if (constraintsJson) {
      const constraintSystem = typeof constraintsJson === 'string' 
        ? JSON.parse(constraintsJson) 
        : constraintsJson;
      
      const result = {
        gates: constraintSystem.gates || [],
        publicInputSize: constraintSystem.public_input_size || 0,
        constraintCount: (constraintSystem.gates || []).length,
        rowCount: constraintSystem.row_count || (constraintSystem.gates || []).length,
        metadata: constraintSystem.metadata || {}
      };
      
      // console.log('   ↳ Returning constraint system:', {
      //   gates: result.gates.length,
      //   publicInputSize: result.publicInputSize,
      //   constraintCount: result.constraintCount,
      //   rowCount: result.rowCount
      // });
      
      return result;
    } else {
      return {
        gates: [],
        publicInputSize: 0,
        constraintCount: 0,
        rowCount: 0,
        metadata: {}
      };
    }
  } catch (error: any) {
    console.warn(`Failed to retrieve full constraint system from Sparky: ${error.message || error}`);
    return {
      gates: [],
      publicInputSize: 0,
      constraintCount: 0,
      rowCount: 0,
      metadata: {},
      error: error.message || error.toString()
    };
  }
}

/**
 * Cleanup constraint accumulation
 * Called by OCaml after constraint retrieval
 */
export function cleanupConstraintAccumulation(): void {
  if (!isActiveSparkyBackend()) {
    return;
  }
  
  isCompilingCircuit = false;
  setCompilingCircuit(false);
  accumulatedConstraints = [];
  
  // Exit constraint system mode
  if ((globalThis as any).__sparkyConstraintHandle) {
    try {
      (globalThis as any).__sparkyConstraintHandle();
    } catch (error) {
      console.warn('Failed to exit constraint system:', error);
    }
    (globalThis as any).__sparkyConstraintHandle = null;
  }
}

/**
 * Test if variable is constant
 */
export function testFieldVarConstant(fieldVar: any): boolean {
  if (!Array.isArray(fieldVar) || fieldVar.length < 2) {
    return false;
  }
  return fieldVar[0] === 0;
}

/**
 * Reset Sparky backend state
 */
function resetSparkyBackend(): void {
  resetSparkyState();
  resetWitnessStore();
  accumulatedConstraints = [];
  gateCallCounter = 0;
  isCompilingCircuit = false;
  setCompilingCircuit(false);
}

// ===================================================================
// MAIN SNARKY INTERFACE
// ===================================================================

/**
 * Main Snarky interface assembly
 */
const Snarky: SnarkyAdapter = {
  poseidon: poseidonOperations,
  
  field: fieldOperations,
  
  run: runOperations,
  
  constraintSystem: constraintSystemOperations,
  
  gates: gateOperations
};

// ===================================================================
// LAZY INITIALIZATION
// ===================================================================

// Module references (lazy loaded)
let Pickles: any;
let Test: any;
let Ledger: any;

/**
 * Initialize Sparky
 */
async function initializeSparky(): Promise<void> {
  await initSparkyWasm();
  const ocamlModules = getOCamlModules();
  Pickles = ocamlModules.Pickles;
  Test = ocamlModules.Test;
  Ledger = ocamlModules.Ledger;
}

// ===================================================================
// EXPORTS
// ===================================================================

// Export individual components
export { 
  Snarky, 
  Pickles, 
  Test, 
  Ledger,
  initializeSparky,
  activateSparkyRouting,
  activateOcamlRouting,
  updateGlobalSnarkyRouting,
  getConstraintFlowStats,
  resetConstraintFlowStats,
  resetSparkyBackend
};

// Set up global __snarky object for OCaml bridge
if (typeof globalThis !== 'undefined') {
  setupGlobalSnarky(Snarky);
  
  // Set up constraint bridge for OCaml integration
  (globalThis as any).sparkyConstraintBridge = {
    prepareConstraintAccumulation,
    startConstraintAccumulation: prepareConstraintAccumulation,  // Alias for compatibility
    getAccumulatedConstraints,
    getFullConstraintSystem,
    cleanupConstraintAccumulation,
    endConstraintAccumulation: cleanupConstraintAccumulation,  // Alias for compatibility
    isActiveSparkyBackend,
    testFieldVarConstant,
    emitIfConstraint: fieldOperations.emitIfConstraint,
    emitBooleanAnd: fieldOperations.emitBooleanAnd
  };
}

// Export default for compatibility
export default {
  Snarky,
  Ledger,
  Pickles,
  Test
};