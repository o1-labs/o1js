"use strict";
/**
 * Sparky Adapter Main Module
 *
 * This is the main entry point that assembles all the modular components
 * into the complete Snarky-compatible interface.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExtensionAvailable = exports.getAvailableExtensions = exports.getExtension = exports.getSparkyExtensions = exports.resetSparkyBackend = exports.resetConstraintFlowStats = exports.getConstraintFlowStats = exports.updateGlobalSnarkyRouting = exports.activateOcamlRouting = exports.activateSparkyRouting = exports.initializeSparky = exports.Ledger = exports.Test = exports.Pickles = exports.Snarky = exports.testFieldVarConstant = exports.cleanupConstraintAccumulation = exports.getFullConstraintSystem = exports.getAccumulatedConstraints = exports.prepareConstraintAccumulation = void 0;
const module_loader_js_1 = require("./module-loader.js");
const memory_manager_js_1 = require("./memory-manager.js");
const backend_routing_js_1 = require("./backend-routing.js");
Object.defineProperty(exports, "activateSparkyRouting", { enumerable: true, get: function () { return backend_routing_js_1.activateSparkyRouting; } });
Object.defineProperty(exports, "activateOcamlRouting", { enumerable: true, get: function () { return backend_routing_js_1.activateOcamlRouting; } });
Object.defineProperty(exports, "updateGlobalSnarkyRouting", { enumerable: true, get: function () { return backend_routing_js_1.updateGlobalSnarkyRouting; } });
Object.defineProperty(exports, "getConstraintFlowStats", { enumerable: true, get: function () { return backend_routing_js_1.getConstraintFlowStats; } });
Object.defineProperty(exports, "resetConstraintFlowStats", { enumerable: true, get: function () { return backend_routing_js_1.resetConstraintFlowStats; } });
const field_operations_js_1 = require("./field-operations.js");
const gate_operations_js_1 = require("./gate-operations.js");
const poseidon_operations_js_1 = require("./poseidon-operations.js");
const constraint_system_js_1 = require("./constraint-system.js");
const index_js_1 = require("./extensions/index.js");
Object.defineProperty(exports, "getSparkyExtensions", { enumerable: true, get: function () { return index_js_1.getSparkyExtensions; } });
Object.defineProperty(exports, "getExtension", { enumerable: true, get: function () { return index_js_1.getExtension; } });
Object.defineProperty(exports, "getAvailableExtensions", { enumerable: true, get: function () { return index_js_1.getAvailableExtensions; } });
Object.defineProperty(exports, "isExtensionAvailable", { enumerable: true, get: function () { return index_js_1.isExtensionAvailable; } });
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
function prepareConstraintAccumulation() {
    if (!isActiveSparkyBackend()) {
        return;
    }
    isCompilingCircuit = true;
    (0, constraint_system_js_1.setCompilingCircuit)(true);
    accumulatedConstraints = [];
    // Enter constraint generation mode
    if (!globalThis.__sparkyConstraintHandle) {
        globalThis.__sparkyConstraintHandle = constraint_system_js_1.runOperations.enterConstraintSystem();
    }
}
exports.prepareConstraintAccumulation = prepareConstraintAccumulation;
/**
 * Get accumulated constraints
 * Called by OCaml after circuit execution
 */
function getAccumulatedConstraints() {
    if (!isActiveSparkyBackend()) {
        return [];
    }
    try {
        memoryBarrier();
        const totalGateCalls = gateCallCounter;
        gateCallCounter = 0;
        // Get constraints from Sparky state
        const constraintsJson = constraint_system_js_1.constraintSystemOperations.toJson({});
        if (constraintsJson) {
            const constraints = typeof constraintsJson === 'string'
                ? JSON.parse(constraintsJson)
                : constraintsJson;
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
exports.getAccumulatedConstraints = getAccumulatedConstraints;
/**
 * Get full constraint system
 * Called by zkprogram compilation
 */
function getFullConstraintSystem() {
    // Debug logging disabled - uncomment if needed
    // console.log('🔍 DEBUG: getFullConstraintSystem() called from OCaml');
    if (!isActiveSparkyBackend()) {
        // console.log('   ↳ Snarky backend active, returning null');
        return null;
    }
    // console.log('   ↳ Sparky backend active, extracting constraints...');
    try {
        memoryBarrier();
        const constraintsJson = constraint_system_js_1.constraintSystemOperations.toJson({});
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
exports.getFullConstraintSystem = getFullConstraintSystem;
/**
 * Cleanup constraint accumulation
 * Called by OCaml after constraint retrieval
 */
function cleanupConstraintAccumulation() {
    if (!isActiveSparkyBackend()) {
        return;
    }
    isCompilingCircuit = false;
    (0, constraint_system_js_1.setCompilingCircuit)(false);
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
exports.cleanupConstraintAccumulation = cleanupConstraintAccumulation;
/**
 * Test if variable is constant
 */
function testFieldVarConstant(fieldVar) {
    if (!Array.isArray(fieldVar) || fieldVar.length < 2) {
        return false;
    }
    return fieldVar[0] === 0;
}
exports.testFieldVarConstant = testFieldVarConstant;
/**
 * Reset Sparky backend state
 */
function resetSparkyBackend() {
    (0, module_loader_js_1.resetSparkyState)();
    (0, memory_manager_js_1.resetWitnessStore)();
    accumulatedConstraints = [];
    gateCallCounter = 0;
    isCompilingCircuit = false;
    (0, constraint_system_js_1.setCompilingCircuit)(false);
    // Clean up extensions when resetting backend
    try {
        (0, index_js_1.cleanupExtensions)();
    }
    catch (error) {
        console.warn('Failed to cleanup extensions during backend reset:', error);
    }
}
exports.resetSparkyBackend = resetSparkyBackend;
// ===================================================================
// MAIN SNARKY INTERFACE
// ===================================================================
/**
 * Main Snarky interface assembly
 */
const Snarky = {
    poseidon: poseidon_operations_js_1.poseidonOperations,
    field: field_operations_js_1.fieldOperations,
    run: constraint_system_js_1.runOperations,
    constraintSystem: constraint_system_js_1.constraintSystemOperations,
    gates: gate_operations_js_1.gateOperations
};
exports.Snarky = Snarky;
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
    await (0, module_loader_js_1.initSparkyWasm)();
    const ocamlModules = (0, module_loader_js_1.getOCamlModules)();
    exports.Pickles = Pickles = ocamlModules.Pickles;
    exports.Test = Test = ocamlModules.Test;
    exports.Ledger = Ledger = ocamlModules.Ledger;
    // Initialize extensions after WASM is ready
    try {
        (0, index_js_1.initializeExtensions)();
    }
    catch (error) {
        console.warn('Failed to initialize extensions:', error);
    }
}
exports.initializeSparky = initializeSparky;
// Set up global __snarky object for OCaml bridge
if (typeof globalThis !== 'undefined') {
    (0, backend_routing_js_1.setupGlobalSnarky)(Snarky);
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
        emitIfConstraint: field_operations_js_1.fieldOperations.emitIfConstraint,
        emitBooleanAnd: field_operations_js_1.fieldOperations.emitBooleanAnd,
        emitBooleanOr: field_operations_js_1.fieldOperations.emitBooleanOr,
        emitBooleanNot: field_operations_js_1.fieldOperations.emitBooleanNot
    };
}
// Export default for compatibility
exports.default = {
    Snarky,
    Ledger,
    Pickles,
    Test
};
