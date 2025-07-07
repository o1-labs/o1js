/**
 * Type definitions for Sparky Adapter
 *
 * This file contains all TypeScript type definitions for the sparky-adapter module,
 * including WASM interfaces, OCaml module interfaces, and internal data structures.
 */
// ===================================================================
// Utility Types
// ===================================================================
/**
 * Type guard for FieldVar
 */
export function isFieldVar(x) {
    return Array.isArray(x) && x.length >= 2 && typeof x[0] === 'number';
}
/**
 * Type guard for Cvar
 */
export function isCvar(x) {
    return x && typeof x === 'object' && 'type' in x;
}
/**
 * Type guard for MlArray
 */
export function isMlArray(x) {
    return Array.isArray(x) && x.length > 0 && x[0] === 0;
}
