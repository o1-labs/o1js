/**
 * Sparky Adapter Main Module
 *
 * This is the main entry point that assembles all the modular components
 * into the complete Snarky-compatible interface.
 */
import { initSparkyWasm, getSparkyInstance, getOCamlModules, resetSparkyState } from './module-loader.js';
import { resetWitnessStore } from './memory-manager.js';
import { activateSparkyRouting, activateOcamlRouting, updateGlobalSnarkyRouting, getConstraintFlowStats, resetConstraintFlowStats, setupGlobalSnarky } from './backend-routing.js';
import { fieldOperations } from './field-operations.js';
import { gateOperations } from './gate-operations.js';
import { poseidonOperations } from './poseidon-operations.js';
import { runOperations, constraintSystemOperations, setCompilingCircuit } from './constraint-system.js';
import { getSparkyExtensions, getExtension, getAvailableExtensions, isExtensionAvailable, initializeExtensions, cleanupExtensions } from './extensions/index.js';
// ===================================================================
// GLOBAL STATE
// ===================================================================
// Track accumulated constraints for OCaml bridge
let accumulatedConstraints = [];
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
function memoryBarrier() {
    // Force memory synchronization point
    // In JavaScript, this is mostly a no-op but marks critical sections
}
// ===================================================================
// OCAML BRIDGE FUNCTIONS
// ===================================================================
/**
 * Check if Sparky backend is active
 */
function isActiveSparkyBackend() {
    return globalThis.__sparkyActive === true ||
        globalThis.__currentBackend === 'sparky';
}
/**
 * Prepare for constraint accumulation
 * Called by OCaml before circuit compilation
 */
export function prepareConstraintAccumulation() {
    if (!isActiveSparkyBackend()) {
        return;
    }
    isCompilingCircuit = true;
    setCompilingCircuit(true);
    accumulatedConstraints = [];
    // Reset the Sparky compiler to clear any accumulated constraints
    try {
        const sparky = getSparkyInstance();
        if (sparky && sparky.run && sparky.run.reset) {
            sparky.run.reset();
        }
    }
    catch (error) {
        console.warn('Failed to reset Sparky compiler:', error);
    }
    // Enter constraint generation mode
    if (!globalThis.__sparkyConstraintHandle) {
        globalThis.__sparkyConstraintHandle = runOperations.enterConstraintSystem();
    }
}
/**
 * Get accumulated constraints
 * Called by OCaml after circuit execution
 */
export function getAccumulatedConstraints() {
    if (!isActiveSparkyBackend()) {
        return [];
    }
    try {
        memoryBarrier();
        const totalGateCalls = gateCallCounter;
        gateCallCounter = 0;
        // Get constraints from Sparky state
        const constraintsJson = constraintSystemOperations.toJson({});
        const constraints = typeof constraintsJson === 'string'
            ? JSON.parse(constraintsJson)
            : constraintsJson;
        if (constraints) {
            const gates = constraints.gates || [];
            if (gates.length > 100) {
                memoryBarrier();
            }
            return gates;
        }
        else {
            throw new Error('getConstraintSystem() returned null/undefined');
        }
    }
    catch (error) {
        throw new Error(`Failed to retrieve constraints from Sparky: ${error.message || error}`);
    }
}
/**
 * Get full constraint system
 * Called by zkprogram compilation
 */
export function getFullConstraintSystem() {
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
        const constraintSystem = typeof constraintsJson === 'string'
            ? JSON.parse(constraintsJson)
            : constraintsJson;
        if (constraintSystem) {
            const result = {
                gates: constraintSystem.gates || [],
                publicInputSize: constraintSystem.public_input_size || 0,
                constraintCount: (constraintSystem.gates || []).length,
                rowCount: constraintSystem.row_count || (constraintSystem.gates || []).length,
                metadata: constraintSystem.metadata || {},
                permutation: constraintSystem.permutation || null // Pass through permutation data!
            };
            // console.log('   ↳ Returning constraint system:', {
            //   gates: result.gates.length,
            //   publicInputSize: result.publicInputSize,
            //   constraintCount: result.constraintCount,
            //   rowCount: result.rowCount
            // });
            return result;
        }
        else {
            return {
                gates: [],
                publicInputSize: 0,
                constraintCount: 0,
                rowCount: 0,
                metadata: {}
            };
        }
    }
    catch (error) {
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
export function cleanupConstraintAccumulation() {
    if (!isActiveSparkyBackend()) {
        return;
    }
    isCompilingCircuit = false;
    setCompilingCircuit(false);
    accumulatedConstraints = [];
    // Exit constraint system mode
    if (globalThis.__sparkyConstraintHandle) {
        try {
            globalThis.__sparkyConstraintHandle();
        }
        catch (error) {
            console.warn('Failed to exit constraint system:', error);
        }
        globalThis.__sparkyConstraintHandle = null;
    }
}
/**
 * Test if variable is constant
 */
export function testFieldVarConstant(fieldVar) {
    if (!Array.isArray(fieldVar) || fieldVar.length < 2) {
        return false;
    }
    return fieldVar[0] === 0;
}
/**
 * Reset Sparky backend state
 */
function resetSparkyBackend() {
    resetSparkyState();
    resetWitnessStore();
    accumulatedConstraints = [];
    gateCallCounter = 0;
    isCompilingCircuit = false;
    setCompilingCircuit(false);
    // Clean up extensions when resetting backend
    try {
        cleanupExtensions();
    }
    catch (error) {
        console.warn('Failed to cleanup extensions during backend reset:', error);
    }
}
// ===================================================================
// MAIN SNARKY INTERFACE
// ===================================================================
/**
 * Main Snarky interface assembly
 */
const Snarky = {
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
let Pickles;
let Test;
let Ledger;
/**
 * Initialize Sparky
 */
async function initializeSparky() {
    await initSparkyWasm();
    const ocamlModules = getOCamlModules();
    Pickles = ocamlModules.Pickles;
    Test = ocamlModules.Test;
    Ledger = ocamlModules.Ledger;
    // Initialize extensions after WASM is ready
    try {
        initializeExtensions();
    }
    catch (error) {
        console.warn('Failed to initialize extensions:', error);
    }
}
// ===================================================================
// EXPORTS
// ===================================================================
// Export individual components
export { Snarky, Pickles, Test, Ledger, initializeSparky, activateSparkyRouting, activateOcamlRouting, updateGlobalSnarkyRouting, getConstraintFlowStats, resetConstraintFlowStats, resetSparkyBackend, 
// SPARKY EXTENSIONS - Available only when Sparky backend is active
getSparkyExtensions, getExtension, getAvailableExtensions, isExtensionAvailable };
// Set up global __snarky object for OCaml bridge
if (typeof globalThis !== 'undefined') {
    setupGlobalSnarky(Snarky);
    // Set up constraint bridge for OCaml integration
    globalThis.sparkyConstraintBridge = {
        prepareConstraintAccumulation,
        startConstraintAccumulation: prepareConstraintAccumulation, // Alias for compatibility
        getAccumulatedConstraints,
        getFullConstraintSystem,
        cleanupConstraintAccumulation,
        endConstraintAccumulation: cleanupConstraintAccumulation, // Alias for compatibility
        isActiveSparkyBackend,
        testFieldVarConstant,
        emitIfConstraint: fieldOperations.emitIfConstraint,
        emitBooleanAnd: fieldOperations.emitBooleanAnd,
        emitBooleanOr: fieldOperations.emitBooleanOr,
        emitBooleanNot: fieldOperations.emitBooleanNot
    };
}
// Export default for compatibility
export default {
    Snarky,
    Ledger,
    Pickles,
    Test
};
