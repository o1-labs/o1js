/**
 * Sparky WASM bindings integration for o1js
 * 
 * This module provides access to the Rust-based Sparky implementation
 * as a potential replacement for the OCaml-based snarky backend.
 */

import type { Snarky as SparkyWasm } from '../compiled/sparky_web/sparky_wasm';

let sparkyInstance: SparkyWasm | undefined;
let initPromise: Promise<void> | undefined;

/**
 * Initialize the Sparky WASM module
 */
export async function initSparky(): Promise<void> {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      // Dynamic import for web compatibility
      const sparkyModule = await import('../compiled/sparky_web/sparky_wasm.js');
      const { default: init, Snarky } = sparkyModule;
      
      // Initialize WASM
      await init();
      
      // Create Sparky instance
      sparkyInstance = new Snarky();
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
export function getSparky(): SparkyWasm {
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

// Export types
export type { Snarky as SparkyInstance } from '../compiled/sparky_web/sparky_wasm';