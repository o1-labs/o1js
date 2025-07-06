"use strict";
/**
 * Module Loading & Environment Detection
 *
 * This module handles the complex dual-module loading required for Sparky operation:
 * 1. Load OCaml bindings (Pickles, Test) - proof generation still happens in OCaml
 * 2. Load Sparky WASM - constraint generation happens in Rust
 * 3. Coordinate between environments (Node.js vs Browser)
 * 4. Handle various import/require fallback strategies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNodeEnvironment = exports.resetSparkyState = exports.getOCamlModules = exports.getSparkyInstance = exports.initSparkyWasm = void 0;
// ===================================================================
// MODULE STATE
// ===================================================================
// Hybrid architecture: Sparky handles constraint generation,
// but OCaml Pickles still handles proof generation and verification
let PicklesOCaml;
let TestOCaml;
let LedgerOCaml;
// Environment detection
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node !== undefined;
// Dynamic import handles
let fileURLToPath;
// Sparky WASM state
let sparkyWasm;
let sparkyInstance;
let initPromise;
// ===================================================================
// INITIALIZATION
// ===================================================================
/**
 * Initialize Sparky WASM module
 *
 * CRITICAL INITIALIZATION SEQUENCE:
 * - OCaml and WASM modules must be loaded in this specific order
 * - Pickles needs to be available before constraint generation begins
 *
 * ERROR HANDLING: Multiple fallback strategies ensure loading works in:
 * - Bundled environments (webpack, rollup)
 * - Non-bundled Node.js (direct require)
 * - Browser environments (dynamic imports)
 * - Development vs production builds
 */
async function initSparkyWasm() {
    // Singleton pattern: only initialize once
    if (initPromise)
        return initPromise;
    initPromise = (async () => {
        // First, import Pickles and Test from OCaml bindings
        if (isNode) {
            // Node.js environment - use createRequire for CommonJS compatibility
            let snarky;
            try {
                // Import createRequire to load CommonJS modules in ES module environment
                const moduleImport = await Promise.resolve().then(() => require('module'));
                const createRequire = moduleImport.createRequire || moduleImport.default?.createRequire;
                const require = createRequire(import.meta.url);
                // Load CommonJS modules using require
                snarky = require('../compiled/_node_bindings/o1js_node.bc.cjs');
                // Also load WASM module using createRequire (CommonJS module)
                const sparkyNodePath = '../compiled/_node_bindings/sparky_wasm.cjs';
                const sparkyModule = require(sparkyNodePath);
                // Store WASM module for later use
                global.sparkyModuleCache = sparkyModule;
            }
            catch (importError) {
                throw new Error(`Failed to load OCaml/WASM bindings via require: ${importError.message}`);
            }
            ({ Pickles: PicklesOCaml, Test: TestOCaml, Ledger: LedgerOCaml } = snarky);
            // Import URL utilities for Node.js
            const urlModule = await Promise.resolve().then(() => require('url'));
            fileURLToPath = urlModule.fileURLToPath;
        }
        else {
            // Browser environment
            try {
                // Dynamic import for OCaml bindings in browser
                // Try different paths for web bindings
                let snarky;
                try {
                    snarky = await Promise.resolve(`${'../../web_bindings/o1js_web.bc.js'}`).then(s => require(s));
                }
                catch {
                    try {
                        snarky = await Promise.resolve(`${'../compiled/web_bindings/o1js_web.bc.js'}`).then(s => require(s));
                    }
                    catch {
                        throw new Error('Failed to load o1js web bindings from any known location');
                    }
                }
                ({ Pickles: PicklesOCaml, Test: TestOCaml, Ledger: LedgerOCaml } = snarky);
            }
            catch (importError) {
                throw new Error(`Failed to load OCaml bindings in browser: ${importError.message}`);
            }
        }
        // Export OCaml modules to global for coordination
        if (typeof globalThis !== 'undefined') {
            globalThis.ocamlBackendBridge = { Pickles: PicklesOCaml, Test: TestOCaml, Ledger: LedgerOCaml };
        }
        // Second, initialize WASM module based on environment
        if (isNode) {
            // Node.js-specific WASM loading
            await loadNodeWASM();
        }
        else {
            // Browser-specific WASM loading
            await loadBrowserWASM();
        }
        // Create Sparky instance from WASM module
        if (!sparkyWasm) {
            throw new Error('Failed to load Sparky WASM module');
        }
        // Initialize Sparky instance
        sparkyInstance = sparkyWasm.initSparky();
        // Transform the interface to match expected adapter API
        // The WASM provides methods but adapter expects properties
        if (sparkyInstance) {
            if (typeof sparkyInstance.run === 'function') {
                sparkyInstance.run = sparkyInstance.run();
            }
            if (typeof sparkyInstance.field === 'function') {
                sparkyInstance.field = sparkyInstance.field();
            }
            if (typeof sparkyInstance.constraintSystem === 'function') {
                sparkyInstance.constraintSystem = sparkyInstance.constraintSystem();
            }
            if (typeof sparkyInstance.gates === 'function') {
                sparkyInstance.gates = sparkyInstance.gates();
            }
        }
        // The layered architecture fix worked! The generated JavaScript now has correct getters:
        // - snarky_gates() function is called (not snarky_field)
        // - takeObject(ret) is used properly
        // - No property wrappers needed anymore
        // Export to global for debugging
        if (typeof globalThis !== 'undefined') {
            globalThis.__sparkyWasm = sparkyWasm;
            globalThis.__sparkyInstance = sparkyInstance;
        }
    })();
    return initPromise;
}
exports.initSparkyWasm = initSparkyWasm;
/**
 * Load WASM module in Node.js environment
 */
async function loadNodeWASM() {
    // Check for cached module first (from require above)
    if (global.sparkyModuleCache) {
        sparkyWasm = global.sparkyModuleCache;
        return;
    }
    // Fallback to dynamic import
    try {
        // Import Node.js file system utilities
        const fs = await Promise.resolve().then(() => require('fs'));
        const url = await Promise.resolve().then(() => require('url'));
        const path = await Promise.resolve().then(() => require('path'));
        // Try loading WASM module directly
        const currentFileUrl = import.meta.url;
        const currentFilePath = url.fileURLToPath(currentFileUrl);
        const currentDir = path.dirname(currentFilePath);
        // Try compiled path first
        const wasmPath = path.join(currentDir, '../compiled/_node_bindings/sparky_wasm.cjs');
        // Dynamic require fallback
        const { createRequire } = await Promise.resolve().then(() => require('module'));
        const require = createRequire(import.meta.url);
        sparkyWasm = require(wasmPath);
    }
    catch (error) {
        throw new Error(`Failed to load Sparky WASM in Node.js: ${error.message}`);
    }
}
/**
 * Load WASM module in browser environment
 */
async function loadBrowserWASM() {
    try {
        // Dynamic import for browser with webpack ignore comment
        sparkyWasm = await Promise.resolve().then(() => require(/* webpackIgnore: true */ '../compiled/sparky_web/sparky_wasm.js'));
    }
    catch (error) {
        throw new Error(`Failed to load Sparky WASM in browser: ${error.message}`);
    }
}
// ===================================================================
// MODULE ACCESS
// ===================================================================
/**
 * Get initialized Sparky instance
 */
function getSparkyInstance() {
    if (!sparkyInstance) {
        throw new Error('Sparky not initialized. Call initSparkyWasm() first.');
    }
    return sparkyInstance;
}
exports.getSparkyInstance = getSparkyInstance;
/**
 * Get OCaml modules
 */
function getOCamlModules() {
    if (!PicklesOCaml || !TestOCaml || !LedgerOCaml) {
        throw new Error('OCaml modules not loaded. Call initSparkyWasm() first.');
    }
    return {
        Pickles: PicklesOCaml,
        Test: TestOCaml,
        Ledger: LedgerOCaml
    };
}
exports.getOCamlModules = getOCamlModules;
/**
 * Reset Sparky state
 */
function resetSparkyState() {
    if (sparkyInstance && sparkyInstance.run) {
        sparkyInstance.run.reset();
    }
}
exports.resetSparkyState = resetSparkyState;
/**
 * Check if running in Node.js
 */
function isNodeEnvironment() {
    return isNode;
}
exports.isNodeEnvironment = isNodeEnvironment;
