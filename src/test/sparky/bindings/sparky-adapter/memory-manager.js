"use strict";
/**
 * Memory Pressure Determinism System
 *
 * This module implements a deterministic memory management system for witness generation.
 * It ensures that witness values are stored and retrieved consistently across different
 * execution environments, preventing non-deterministic behavior during proof generation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeWithMemoryPressure = exports.tryGarbageCollection = exports.isUnderMemoryPressure = exports.getWitnessStoreStats = exports.resetWitnessStore = exports.getWitnessStore = exports.WitnessMemoryStoreImpl = void 0;
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
class WitnessMemoryStoreImpl {
    store = new Map();
    /**
     * Serialize FieldVar to a deterministic string key
     * This ensures consistent key generation regardless of object reference
     */
    serializeKey(cvar) {
        return JSON.stringify(cvar);
    }
    /**
     * Add a Cvar-value pair to the store
     *
     * @param cvar - The field variable
     * @param value - The witness value as a string
     */
    addCvar(cvar, value) {
        const key = this.serializeKey(cvar);
        this.store.set(key, value);
    }
    /**
     * Retrieve the value for a Cvar
     *
     * @param cvar - The field variable
     * @returns The witness value or undefined if not found
     */
    getCvarValue(cvar) {
        const key = this.serializeKey(cvar);
        return this.store.get(key);
    }
    /**
     * Clear all stored values
     * Called when resetting the constraint system
     */
    clear() {
        this.store.clear();
    }
    /**
     * Get the number of stored values
     * Useful for debugging and memory monitoring
     */
    size() {
        return this.store.size;
    }
    /**
     * Check if a Cvar exists in the store
     *
     * @param cvar - The field variable
     * @returns True if the Cvar has a stored value
     */
    has(cvar) {
        const key = this.serializeKey(cvar);
        return this.store.has(key);
    }
    /**
     * Get all stored Cvars
     * Useful for debugging and serialization
     *
     * @returns Array of [FieldVar, value] pairs
     */
    entries() {
        const result = [];
        for (const [keyStr, value] of this.store.entries()) {
            const cvar = JSON.parse(keyStr);
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
    snapshot() {
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
    restore(snapshot) {
        this.store.clear();
        for (const [key, value] of snapshot.store.entries()) {
            this.store.set(key, value);
        }
    }
}
exports.WitnessMemoryStoreImpl = WitnessMemoryStoreImpl;
// ===================================================================
// GLOBAL WITNESS STORE
// ===================================================================
// Global instance for the current witness computation
let globalWitnessStore = null;
/**
 * Get or create the global witness store
 */
function getWitnessStore() {
    if (!globalWitnessStore) {
        globalWitnessStore = new WitnessMemoryStoreImpl();
    }
    return globalWitnessStore;
}
exports.getWitnessStore = getWitnessStore;
/**
 * Reset the global witness store
 * Called when starting a new constraint system or proof generation
 */
function resetWitnessStore() {
    if (globalWitnessStore) {
        globalWitnessStore.clear();
    }
    else {
        globalWitnessStore = new WitnessMemoryStoreImpl();
    }
}
exports.resetWitnessStore = resetWitnessStore;
/**
 * Get witness store statistics
 * Useful for monitoring memory usage and debugging
 */
function getWitnessStoreStats() {
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
exports.getWitnessStoreStats = getWitnessStoreStats;
// ===================================================================
// MEMORY PRESSURE UTILITIES
// ===================================================================
/**
 * Check if system is under memory pressure
 * This is a simplified check - in production, would use more sophisticated metrics
 */
function isUnderMemoryPressure() {
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
exports.isUnderMemoryPressure = isUnderMemoryPressure;
/**
 * Perform garbage collection if needed and available
 * Note: This requires --expose-gc flag in Node.js
 */
function tryGarbageCollection() {
    if (typeof global !== 'undefined' && global.gc) {
        global.gc();
    }
}
exports.tryGarbageCollection = tryGarbageCollection;
/**
 * Memory-aware computation wrapper
 * Ensures witness values are stored even under memory pressure
 *
 * @param compute - Function that computes the witness value
 * @param cvar - The field variable to store the result for
 * @returns The computed value
 */
function computeWithMemoryPressure(compute, cvar) {
    const store = getWitnessStore();
    // Check if already computed
    const existing = store.getCvarValue(cvar);
    if (existing !== undefined) {
        return JSON.parse(existing);
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
exports.computeWithMemoryPressure = computeWithMemoryPressure;
