/**
 * Sparky WASM bindings integration for o1js
 * 
 * This module provides access to the Rust-based Sparky implementation
 * as a potential replacement for the OCaml-based snarky backend.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Determine if we're in Node.js or browser environment
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

let sparkyInstance: any;
let initPromise: Promise<void> | undefined;

/**
 * Initialize the Sparky WASM module
 */
export async function initSparky(): Promise<void> {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      if (isNode) {
        // Check if we're in a bundled environment (bundler creates tmp files)
        const isBundled = import.meta.url?.includes('.tmp.js') || globalThis.__bundled;
        
        if (isBundled) {
          // Use bundler-compatible ES module version
          const sparkyModule = await import('../../compiled/sparky_bundler/sparky_wasm.js');
          const { Snarky } = sparkyModule;
          sparkyInstance = new Snarky();
        } else {
          // Node.js environment - WASM is auto-initialized on import
          const sparkyModule = await import('../../compiled/sparky_node/sparky_wasm.js');
          const { Snarky } = sparkyModule;
          sparkyInstance = new Snarky();
        }
      } else {
        // Browser environment
        const sparkyModule = await import('../../compiled/sparky_web/sparky_wasm.js');
        const { default: init, Snarky } = sparkyModule;
        
        // Initialize WASM (will fetch automatically in browser)
        await init();
        
        // Create Sparky instance
        sparkyInstance = new Snarky();
      }
    } catch (error) {
      console.error('Failed to initialize Sparky WASM:', error);
      throw error;
    }
  })();
  
  return initPromise;
}

/**
 * Get the initialized Sparky instance
 */
export function getSparky(): any {
  if (!sparkyInstance) {
    throw new Error('Sparky not initialized. Call initSparky() first.');
  }
  return sparkyInstance;
}

/**
 * Create a field element using Sparky
 */
export async function createField(value: string | number): Promise<any> {
  await initSparky();
  const sparky = getSparky();
  const field = sparky.field;
  return field.constant(value);
}

/**
 * Poseidon hash using Sparky
 */
export async function poseidonHash(left: any, right: any): Promise<any> {
  await initSparky();
  const sparky = getSparky();
  const gates = sparky.gates;
  return gates.poseidonHash2(left, right);
}

/**
 * Run computation in prover mode
 */
export async function runAsProver<T>(fn: () => T): Promise<T> {
  await initSparky();
  const sparky = getSparky();
  const run = sparky.run;
  return run.asProver(fn as any) as T;
}

// Export types (conditionally based on environment)
export type SparkyInstance = any; // Will be properly typed once we have consistent types for both environments