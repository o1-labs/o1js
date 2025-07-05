/**
 * Module Loading & Environment Detection
 * 
 * This module handles the complex dual-module loading required for Sparky operation:
 * 1. Load OCaml bindings (Pickles, Test) - proof generation still happens in OCaml
 * 2. Load Sparky WASM - constraint generation happens in Rust
 * 3. Coordinate between environments (Node.js vs Browser)
 * 4. Handle various import/require fallback strategies
 */

import type { OCamlModules, SparkyWasmModule, Snarky } from './types.js';

// ===================================================================
// MODULE STATE
// ===================================================================

// Hybrid architecture: Sparky handles constraint generation,
// but OCaml Pickles still handles proof generation and verification
let PicklesOCaml: any;
let TestOCaml: any;
let LedgerOCaml: any;

// Environment detection
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node !== undefined;

// Dynamic import handles
let fileURLToPath: any;

// Sparky WASM state
let sparkyWasm: any;
let sparkyInstance: Snarky | undefined;
let initPromise: Promise<void> | undefined;

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
export async function initSparkyWasm(): Promise<void> {
  // Singleton pattern: only initialize once
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    // First, import Pickles and Test from OCaml bindings
    if (isNode) {
      // Node.js environment - use createRequire for CommonJS compatibility
      let snarky: any;
      try {
        // Import createRequire to load CommonJS modules in ES module environment
        const { createRequire } = await import('module') as any;
        const require = createRequire(import.meta.url);
        
        // Load CommonJS modules using require
        snarky = require('../compiled/_node_bindings/o1js_node.bc.cjs');
        
        // DON'T load Sparky WASM here - it will fail due to import mismatch
        // We'll load it later in loadNodeWASM() with proper import patching
      } catch (importError: any) {
        throw new Error(`Failed to load OCaml/WASM bindings via require: ${importError.message}`);
      }
      ({ Pickles: PicklesOCaml, Test: TestOCaml, Ledger: LedgerOCaml } = snarky);
      
      // Import URL utilities for Node.js
      const urlModule = await import('url');
      fileURLToPath = urlModule.fileURLToPath;
    } else {
      // Browser environment
      try {
        // Dynamic import for OCaml bindings in browser
        // Try different paths for web bindings
        let snarky: any;
        try {
          snarky = await import(/* webpackIgnore: true */ '../../web_bindings/o1js_web.bc.js' as any);
        } catch {
          try {
            snarky = await import(/* webpackIgnore: true */ '../compiled/web_bindings/o1js_web.bc.js' as any);
          } catch {
            throw new Error('Failed to load o1js web bindings from any known location');
          }
        }
        ({ Pickles: PicklesOCaml, Test: TestOCaml, Ledger: LedgerOCaml } = snarky);
      } catch (importError: any) {
        throw new Error(`Failed to load OCaml bindings in browser: ${importError.message}`);
      }
    }
    
    // Export OCaml modules to global for coordination
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).ocamlBackendBridge = { Pickles: PicklesOCaml, Test: TestOCaml, Ledger: LedgerOCaml };
    }
    
    // Second, initialize WASM module based on environment
    if (isNode) {
      // Node.js-specific WASM loading
      await loadNodeWASM();
    } else {
      // Browser-specific WASM loading
      await loadBrowserWASM();
    }
    
    // Create Sparky instance from WASM module
    if (!sparkyWasm) {
      throw new Error('Failed to load Sparky WASM module');
    }
    
    // Initialize Sparky instance
    sparkyInstance = sparkyWasm.initSparky();
    
    // The layered architecture fix worked! The generated JavaScript now has correct getters:
    // - snarky_gates() function is called (not snarky_field)
    // - takeObject(ret) is used properly
    // - No property wrappers needed anymore
    
    // Export to global for debugging
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).__sparkyWasm = sparkyWasm;
      (globalThis as any).__sparkyInstance = sparkyInstance;
    }
  })();
  
  return initPromise;
}

/**
 * Load WASM module in Node.js environment
 */
async function loadNodeWASM(): Promise<void> {
  // Check for cached module first
  if ((global as any).sparkyModuleCache) {
    sparkyWasm = (global as any).sparkyModuleCache;
    return;
  }
  
  try {
    // Import Node.js modules for file reading
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    // Import the web target ES module
    sparkyWasm = await import('../compiled/_node_bindings/sparky_wasm.js');
    
    // Get the directory of this module
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Read the WASM file directly
    const wasmPath = path.join(__dirname, '../compiled/_node_bindings/sparky_wasm_bg.wasm');
    const wasmBytes = fs.readFileSync(wasmPath);
    
    // Initialize with the bytes directly using initSync
    sparkyWasm.initSync(wasmBytes);
    
    // Cache it for future use
    (global as any).sparkyModuleCache = sparkyWasm;
    
  } catch (error: any) {
    throw new Error(`Failed to load Sparky WASM in Node.js: ${error.message}`);
  }
}

/**
 * Load WASM module in browser environment
 */
async function loadBrowserWASM(): Promise<void> {
  try {
    // Dynamic import for browser with webpack ignore comment
    sparkyWasm = await import(/* webpackIgnore: true */ '../compiled/sparky_web/sparky_wasm.js') as unknown as SparkyWasmModule;
  } catch (error: any) {
    throw new Error(`Failed to load Sparky WASM in browser: ${error.message}`);
  }
}

// ===================================================================
// MODULE ACCESS
// ===================================================================

/**
 * Get initialized Sparky instance
 */
export function getSparkyInstance(): Snarky {
  if (!sparkyInstance) {
    throw new Error('Sparky not initialized. Call initSparkyWasm() first.');
  }
  return sparkyInstance;
}

/**
 * Get OCaml modules
 */
export function getOCamlModules(): OCamlModules {
  if (!PicklesOCaml || !TestOCaml || !LedgerOCaml) {
    throw new Error('OCaml modules not loaded. Call initSparkyWasm() first.');
  }
  return {
    Pickles: PicklesOCaml,
    Test: TestOCaml,
    Ledger: LedgerOCaml
  };
}

/**
 * Reset Sparky state
 */
export function resetSparkyState(): void {
  if (sparkyInstance && sparkyInstance.run) {
    sparkyInstance.run.reset();
  }
}

/**
 * Check if running in Node.js
 */
export function isNodeEnvironment(): boolean {
  return isNode;
}