"use strict";
/**
 * Type definitions for Sparky Adapter
 *
 * This file contains all TypeScript type definitions for the sparky-adapter module,
 * including WASM interfaces, OCaml module interfaces, and internal data structures.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMlArray = exports.isCvar = exports.isFieldVar = void 0;
// ===================================================================
// Utility Types
// ===================================================================
/**
 * Type guard for FieldVar
 */
function isFieldVar(x) {
    return Array.isArray(x) && x.length >= 2 && typeof x[0] === 'number';
}
exports.isFieldVar = isFieldVar;
/**
 * Type guard for Cvar
 */
function isCvar(x) {
    return x && typeof x === 'object' && 'type' in x;
}
exports.isCvar = isCvar;
/**
 * Type guard for MlArray
 */
function isMlArray(x) {
    return Array.isArray(x) && x.length > 0 && x[0] === 0;
}
exports.isMlArray = isMlArray;
