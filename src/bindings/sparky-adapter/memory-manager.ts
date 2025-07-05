/**
 * Memory Pressure Determinism System
 * 
 * This module implements a deterministic memory management system for witness generation.
 * It ensures that witness values are stored and retrieved consistently across different
 * execution environments, preventing non-deterministic behavior during proof generation.
 */

import type { FieldVar, WitnessMemoryStore } from './types.js';

// ===================================================================
// WITNESS MEMORY STORE
// ===================================================================

/**
 * WitnessMemoryStore Implementation
 * 
 * PURPOSE: Provide deterministic storage for witness values during constraint generation
 * and witness computation phases.
 * 
 * PROBLEM SOLVED: JavaScript garbage collection and memory pressure can cause
 * non-deterministic behavior when witness values are computed on-demand. This store
 * ensures values are computed once and retrieved consistently.
 * 
 * DESIGN: Uses a Map with serialized FieldVar keys for O(1) lookups while maintaining
 * deterministic iteration order (insertion order in JavaScript Maps).
 */
export class WitnessMemoryStoreImpl implements WitnessMemoryStore {
  private store: Map<string, string> = new Map();
  
  /**
   * Serialize FieldVar to a deterministic string key
   * This ensures consistent key generation regardless of object reference
   */
  private serializeKey(cvar: FieldVar): string {
    return JSON.stringify(cvar);
  }
  
  /**
   * Add a Cvar-value pair to the store
   * 
   * @param cvar - The field variable
   * @param value - The witness value as a string
   */
  addCvar(cvar: FieldVar, value: string): void {
    const key = this.serializeKey(cvar);
    this.store.set(key, value);
  }
  
  /**
   * Retrieve the value for a Cvar
   * 
   * @param cvar - The field variable
   * @returns The witness value or undefined if not found
   */
  getCvarValue(cvar: FieldVar): string | undefined {
    const key = this.serializeKey(cvar);
    return this.store.get(key);
  }
  
  /**
   * Clear all stored values
   * Called when resetting the constraint system
   */
  clear(): void {
    this.store.clear();
  }
  
  /**
   * Get the number of stored values
   * Useful for debugging and memory monitoring
   */
  size(): number {
    return this.store.size;
  }
  
  /**
   * Check if a Cvar exists in the store
   * 
   * @param cvar - The field variable
   * @returns True if the Cvar has a stored value
   */
  has(cvar: FieldVar): boolean {
    const key = this.serializeKey(cvar);
    return this.store.has(key);
  }
  
  /**
   * Get all stored Cvars
   * Useful for debugging and serialization
   * 
   * @returns Array of [FieldVar, value] pairs
   */
  entries(): Array<[FieldVar, string]> {
    const result: Array<[FieldVar, string]> = [];
    for (const [keyStr, value] of this.store.entries()) {
      const cvar = JSON.parse(keyStr) as FieldVar;
      result.push([cvar, value]);
    }
    return result;
  }
  
  /**
   * Create a snapshot of the current store state
   * Useful for checkpointing during complex computations
   * 
   * @returns A new WitnessMemoryStore with copied values
   */
  snapshot(): WitnessMemoryStoreImpl {
    const snapshot = new WitnessMemoryStoreImpl();
    for (const [key, value] of this.store.entries()) {
      snapshot.store.set(key, value);
    }
    return snapshot;
  }
  
  /**
   * Restore from a snapshot
   * 
   * @param snapshot - A previously created snapshot
   */
  restore(snapshot: WitnessMemoryStoreImpl): void {
    this.store.clear();
    for (const [key, value] of snapshot.store.entries()) {
      this.store.set(key, value);
    }
  }
}

// ===================================================================
// GLOBAL WITNESS STORE
// ===================================================================

// Global instance for the current witness computation
let globalWitnessStore: WitnessMemoryStoreImpl | null = null;

/**
 * Get or create the global witness store
 */
export function getWitnessStore(): WitnessMemoryStoreImpl {
  if (!globalWitnessStore) {
    globalWitnessStore = new WitnessMemoryStoreImpl();
  }
  return globalWitnessStore;
}

/**
 * Reset the global witness store
 * Called when starting a new constraint system or proof generation
 */
export function resetWitnessStore(): void {
  if (globalWitnessStore) {
    globalWitnessStore.clear();
  } else {
    globalWitnessStore = new WitnessMemoryStoreImpl();
  }
}

/**
 * Get witness store statistics
 * Useful for monitoring memory usage and debugging
 */
export function getWitnessStoreStats(): {
  size: number;
  memoryEstimate: number;
} {
  const store = getWitnessStore();
  const size = store.size();
  
  // Estimate memory usage (rough approximation)
  // Each entry: ~100 bytes for key + value + Map overhead
  const memoryEstimate = size * 100;
  
  return {
    size,
    memoryEstimate
  };
}

// ===================================================================
// MEMORY PRESSURE UTILITIES
// ===================================================================

/**
 * Check if system is under memory pressure
 * This is a simplified check - in production, would use more sophisticated metrics
 */
export function isUnderMemoryPressure(): boolean {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;
    const heapTotal = usage.heapTotal;
    
    // Consider under pressure if heap is >90% full
    return heapUsed / heapTotal > 0.9;
  }
  
  // In browser, we can't reliably detect memory pressure
  return false;
}

/**
 * Perform garbage collection if needed and available
 * Note: This requires --expose-gc flag in Node.js
 */
export function tryGarbageCollection(): void {
  if (typeof global !== 'undefined' && (global as any).gc) {
    (global as any).gc();
  }
}

/**
 * Memory-aware computation wrapper
 * Ensures witness values are stored even under memory pressure
 * 
 * @param compute - Function that computes the witness value
 * @param cvar - The field variable to store the result for
 * @returns The computed value
 */
export function computeWithMemoryPressure<T>(
  compute: () => T,
  cvar: FieldVar
): T {
  const store = getWitnessStore();
  
  // Check if already computed
  const existing = store.getCvarValue(cvar);
  if (existing !== undefined) {
    return JSON.parse(existing) as T;
  }
  
  // Compute new value
  const value = compute();
  
  // Store immediately to prevent loss under memory pressure
  store.addCvar(cvar, JSON.stringify(value));
  
  // If under memory pressure, try to free up space
  if (isUnderMemoryPressure()) {
    tryGarbageCollection();
  }
  
  return value;
}