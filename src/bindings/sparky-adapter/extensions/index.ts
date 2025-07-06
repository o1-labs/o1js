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
// EXTENSION TYPES
// ===================================================================

/**
 * Available extension categories
 */
export type ExtensionCategory = 'optimization' | 'performance' | 'debugging';

/**
 * Complete extension interface when Sparky is active
 */
export interface SparkyExtensions {
  optimization: SparkyOptimizationExtensions;
  performance: SparkyPerformanceExtensions;
  debugging: SparkyDebuggingExtensions;
}

// ===================================================================
// EXTENSION INSTANCES
// ===================================================================

let optimizationExtensions: SparkyOptimizationExtensions | null = null;
let performanceExtensions: SparkyPerformanceExtensions | null = null;
let debuggingExtensions: SparkyDebuggingExtensions | null = null;

// ===================================================================
// EXTENSION LIFECYCLE
// ===================================================================

/**
 * Initialize all extension modules
 * Called when Sparky backend becomes active
 */
export function initializeExtensions(): void {
  if (getCurrentBackendType() !== 'sparky') {
    throw new Error('Extensions can only be initialized when Sparky backend is active');
  }
  
  optimizationExtensions = new SparkyOptimizationExtensions();
  performanceExtensions = new SparkyPerformanceExtensions();
  debuggingExtensions = new SparkyDebuggingExtensions();
}

/**
 * Cleanup all extension modules
 * Called when switching away from Sparky backend
 */
export function cleanupExtensions(): void {
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
export function getSparkyExtensions(): SparkyExtensions | null {
  if (getCurrentBackendType() !== 'sparky') {
    return null;
  }
  
  if (!optimizationExtensions || !performanceExtensions || !debuggingExtensions) {
    initializeExtensions();
  }
  
  return {
    optimization: optimizationExtensions!,
    performance: performanceExtensions!,
    debugging: debuggingExtensions!
  };
}

/**
 * Get specific extension category
 * 
 * @extension This function is only available with Sparky backend
 * @param category - Extension category to retrieve
 * @returns Extension instance or null if not available
 */
export function getExtension<T extends ExtensionCategory>(
  category: T
): T extends 'optimization' ? SparkyOptimizationExtensions | null
  : T extends 'performance' ? SparkyPerformanceExtensions | null
  : T extends 'debugging' ? SparkyDebuggingExtensions | null
  : never {
  
  if (getCurrentBackendType() !== 'sparky') {
    return null as any;
  }
  
  const extensions = getSparkyExtensions();
  if (!extensions) {
    return null as any;
  }
  
  return extensions[category] as any;
}

/**
 * Check which extension categories are available
 * 
 * @returns Array of available extension category names
 */
export function getAvailableExtensions(): ExtensionCategory[] {
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
export function isExtensionAvailable(category: ExtensionCategory): boolean {
  return getAvailableExtensions().includes(category);
}

// ===================================================================
// RUNTIME VALIDATION
// ===================================================================

/**
 * Ensure Sparky backend is active (used by extension methods)
 * @internal
 */
export function ensureSparkyBackend(): void {
  if (getCurrentBackendType() !== 'sparky') {
    throw new Error(
      'This extension method requires Sparky backend. Use switchBackend("sparky") first.'
    );
  }
}

/**
 * Ensure specific extension is available
 * @internal
 */
export function ensureExtensionAvailable(category: ExtensionCategory): void {
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