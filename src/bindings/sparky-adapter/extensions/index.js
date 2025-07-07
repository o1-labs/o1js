/**
 * Sparky Extensions Index
 *
 * Central registry for all Sparky-specific extension modules.
 * Extensions are only available when Sparky backend is active.
 *
 * Created: July 6, 2025 12:45 PM UTC
 * Last Modified: July 6, 2025 12:45 PM UTC
 */
import { SparkyOptimizationExtensions } from './optimization.js';
import { SparkyPerformanceExtensions } from './performance.js';
import { SparkyDebuggingExtensions } from './debugging.js';
import { getCurrentBackendType } from '../backend-routing.js';
// ===================================================================
// EXTENSION INSTANCES
// ===================================================================
let optimizationExtensions = null;
let performanceExtensions = null;
let debuggingExtensions = null;
// ===================================================================
// EXTENSION LIFECYCLE
// ===================================================================
/**
 * Initialize all extension modules
 * Called when Sparky backend becomes active
 */
export function initializeExtensions() {
    // No need to check backend type here - this is only called from Sparky initialization
    optimizationExtensions = new SparkyOptimizationExtensions();
    performanceExtensions = new SparkyPerformanceExtensions();
    debuggingExtensions = new SparkyDebuggingExtensions();
}
/**
 * Cleanup all extension modules
 * Called when switching away from Sparky backend
 */
export function cleanupExtensions() {
    optimizationExtensions?.cleanup?.();
    performanceExtensions?.cleanup?.();
    debuggingExtensions?.cleanup?.();
    optimizationExtensions = null;
    performanceExtensions = null;
    debuggingExtensions = null;
}
// ===================================================================
// EXTENSION ACCESS API
// ===================================================================
/**
 * Get all available Sparky extensions
 * Returns null if Sparky backend is not active
 *
 * @extension This function is only available with Sparky backend
 * @returns Complete extension interface or null
 */
export function getSparkyExtensions() {
    if (getCurrentBackendType() !== 'sparky') {
        return null;
    }
    // Extensions should already be initialized during backend setup
    // If not, initialize them now (this can happen in edge cases)
    if (!optimizationExtensions || !performanceExtensions || !debuggingExtensions) {
        try {
            initializeExtensions();
        }
        catch (error) {
            console.warn('Failed to lazy-initialize extensions:', error);
            return null;
        }
    }
    return {
        optimization: optimizationExtensions,
        performance: performanceExtensions,
        debugging: debuggingExtensions
    };
}
/**
 * Get specific extension category
 *
 * @extension This function is only available with Sparky backend
 * @param category - Extension category to retrieve
 * @returns Extension instance or null if not available
 */
export function getExtension(category) {
    if (getCurrentBackendType() !== 'sparky') {
        return null;
    }
    const extensions = getSparkyExtensions();
    if (!extensions) {
        return null;
    }
    return extensions[category];
}
/**
 * Check which extension categories are available
 *
 * @returns Array of available extension category names
 */
export function getAvailableExtensions() {
    if (getCurrentBackendType() !== 'sparky') {
        return [];
    }
    return ['optimization', 'performance', 'debugging'];
}
/**
 * Check if a specific extension category is available
 *
 * @param category - Extension category to check
 * @returns True if extension is available
 */
export function isExtensionAvailable(category) {
    return getAvailableExtensions().includes(category);
}
// ===================================================================
// RUNTIME VALIDATION
// ===================================================================
/**
 * Ensure Sparky backend is active (used by extension methods)
 * @internal
 */
export function ensureSparkyBackend() {
    if (getCurrentBackendType() !== 'sparky') {
        throw new Error('This extension method requires Sparky backend. Use switchBackend("sparky") first.');
    }
}
/**
 * Ensure specific extension is available
 * @internal
 */
export function ensureExtensionAvailable(category) {
    ensureSparkyBackend();
    if (!isExtensionAvailable(category)) {
        throw new Error(`Extension category '${category}' is not available`);
    }
}
// ===================================================================
// EXPORTS
// ===================================================================
// Export individual extension classes
export { SparkyOptimizationExtensions } from './optimization.js';
export { SparkyPerformanceExtensions } from './performance.js';
export { SparkyDebuggingExtensions } from './debugging.js';
// Export extension types
export * from './types.js';
