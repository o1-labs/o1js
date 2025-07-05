/**
 * Backend Routing System
 * 
 * This module handles global constraint routing to direct constraints to the
 * currently active backend (Sparky or OCaml Snarky). It provides debugging
 * capabilities and ensures proper backend switching.
 */

import type { BackendType, ConstraintFlowStats } from './types.js';

// ===================================================================
// GLOBAL STATE
// ===================================================================

let constraintCallCount = 0;

// ===================================================================
// CONSTRAINT FLOW DEBUGGING
// ===================================================================

/**
 * Track constraint flow for debugging purposes
 * 
 * @param operation - The operation being performed
 * @param backend - The backend handling the operation
 * @param args - Operation arguments
 */
export function debugConstraintFlow(operation: string, backend: BackendType, ...args: any[]): void {
  constraintCallCount++;
  
  // Track constraint count inflation
  if (typeof (globalThis as any).constraintFlowStats === 'undefined') {
    (globalThis as any).constraintFlowStats = { sparky: 0, snarky: 0 };
  }
  (globalThis as any).constraintFlowStats[backend]++;
}

/**
 * Wrap backend object with debugging to trace constraint flow
 * 
 * @param backendObject - The backend object to wrap
 * @param backendType - The type of backend ('sparky' or 'snarky')
 * @returns Wrapped backend with debugging
 */
export function wrapBackendWithDebugging(backendObject: any, backendType: BackendType): any {
  if (!backendObject || !backendObject.field) return backendObject;
  
  const wrappedField: any = {};
  for (const [methodName, method] of Object.entries(backendObject.field)) {
    if (typeof method === 'function') {
      wrappedField[methodName] = function(...args: any[]) {
        debugConstraintFlow(`field.${methodName}`, backendType, ...args);
        return method.apply(this, args);
      };
    } else {
      wrappedField[methodName] = method;
    }
  }
  
  return {
    ...backendObject,
    field: wrappedField
  };
}

// ===================================================================
// GLOBAL ROUTING SYSTEM
// ===================================================================

/**
 * Update global Snarky routing
 * 
 * CRITICAL BUG FIX: This function resolves the constraint routing issue
 * where constraints were always directed to OCaml regardless of active backend.
 * 
 * THE ROUTING PROBLEM:
 * o1js uses globalThis.__snarky.Snarky for constraint operations,
 * but this reference wasn't updated when switching between backends,
 * causing constraints to go to the wrong system.
 * 
 * THE SOLUTION:
 * Dynamically update the global routing pointer to direct constraints
 * to the currently active backend (Sparky or OCaml Snarky).
 * 
 * @param backendType - The backend type to route to
 * @param backendObject - The backend object to use
 */
export function updateGlobalSnarkyRouting(backendType: BackendType, backendObject: any): void {
  if (typeof globalThis !== 'undefined') {
    // Ensure global namespace exists
    (globalThis as any).__snarky = (globalThis as any).__snarky || {};
    
    // Add constraint flow tracking to backend object
    const wrappedBackend = wrapBackendWithDebugging(backendObject, backendType);
    (globalThis as any).__snarky.Snarky = wrappedBackend;
    
    // Update constraint bridge routing state
    if (typeof (globalThis as any).sparkyConstraintBridge !== 'undefined') {
      try {
        (globalThis as any).sparkyConstraintBridge.setActiveBackend(backendType);
      } catch (e) {
        // Constraint bridge might not have this method in older versions
      }
    }
    
    // Reset statistics for new routing session
    (globalThis as any).constraintFlowStats = { sparky: 0, snarky: 0 };
    constraintCallCount = 0;
  }
}

/**
 * Set up Sparky routing (called when switching TO Sparky)
 * 
 * @param sparkyBackend - The Sparky backend object
 */
export function activateSparkyRouting(sparkyBackend: any): void {
  // Set global backend state for OCaml synchronization
  (globalThis as any).__currentBackend = 'sparky';
  (globalThis as any).currentBackend = 'sparky';  
  (globalThis as any).__sparkyActive = true;
  
  // Debug logging disabled - uncomment if needed
  // console.log('🔧 BACKEND SWITCH: Setting global Sparky backend state');
  // console.log('  - globalThis.__currentBackend:', (globalThis as any).__currentBackend);
  // console.log('  - globalThis.__sparkyActive:', (globalThis as any).__sparkyActive);
  
  updateGlobalSnarkyRouting('sparky', sparkyBackend);
}

/**
 * Set up OCaml routing (called when switching TO Snarky)
 * 
 * @param ocamlSnarky - The OCaml Snarky backend object
 */
export function activateOcamlRouting(ocamlSnarky: any): void {
  // Clear global Sparky backend state when switching to Snarky
  (globalThis as any).__currentBackend = 'snarky';
  (globalThis as any).currentBackend = 'snarky';
  (globalThis as any).__sparkyActive = false;
  
  // Debug logging disabled - uncomment if needed
  // console.log('🔧 BACKEND SWITCH: Setting global Snarky backend state');
  // console.log('  - globalThis.__currentBackend:', (globalThis as any).__currentBackend);
  // console.log('  - globalThis.__sparkyActive:', (globalThis as any).__sparkyActive);
  
  if (ocamlSnarky) {
    updateGlobalSnarkyRouting('snarky', ocamlSnarky);
  }
}

/**
 * Get constraint flow statistics for debugging
 * 
 * @returns Statistics about constraint routing
 */
export function getConstraintFlowStats(): {
  totalCalls: number;
  routingStats: ConstraintFlowStats;
  lastUpdate: string;
} {
  return {
    totalCalls: constraintCallCount,
    routingStats: (globalThis as any).constraintFlowStats || { sparky: 0, snarky: 0 },
    lastUpdate: new Date().toISOString()
  };
}

/**
 * Reset constraint flow debugging
 */
export function resetConstraintFlowStats(): void {
  constraintCallCount = 0;
  (globalThis as any).constraintFlowStats = { sparky: 0, snarky: 0 };
}

// ===================================================================
// BACKEND STATE MANAGEMENT
// ===================================================================

/**
 * Get current backend type from global state
 * 
 * @returns Current backend type
 */
export function getCurrentBackendType(): BackendType {
  if (typeof globalThis !== 'undefined') {
    const backend = (globalThis as any).__currentBackend;
    if (backend === 'sparky' || backend === 'snarky') {
      return backend;
    }
  }
  return 'snarky'; // Default to snarky
}

/**
 * Check if Sparky is currently active
 * 
 * @returns True if Sparky is the active backend
 */
export function isSparkyActive(): boolean {
  return getCurrentBackendType() === 'sparky';
}

/**
 * Set up global Snarky object for initial load
 * 
 * @param snarkyObject - The Snarky object to set globally
 */
export function setupGlobalSnarky(snarkyObject: any): void {
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__snarky = (globalThis as any).__snarky || {};
    (globalThis as any).__snarky.Snarky = snarkyObject;
  }
}