"use strict";
/**
 * Format Conversion System
 *
 * This module handles conversions between o1js FieldVar arrays and Sparky Cvar objects.
 * It provides bidirectional conversion with format preservation and type safety.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidFieldVar = exports.isValidCvar = exports.coeffsToStrings = exports.coeffToString = exports.fieldVarsToCvars = exports.cvarsToFieldVars = exports.jsArrayToMlArray = exports.mlArrayToJsArray = exports.ensureFieldVar = exports.toSparkyField = exports.fieldVarToCvar = exports.cvarToFieldVar = void 0;
// ===================================================================
// CVAR <-> FIELDVAR CONVERSION
// ===================================================================
/**
 * Convert Sparky Cvar to o1js FieldVar format
 *
 * Cvar format (Sparky):
 * - {type: 'var', id: number} -> [1, id]
 * - {type: 'constant', value: string} -> [0, [0, value]]
 *
 * @param cvar - Sparky constraint variable
 * @returns FieldVar in o1js format
 */
function cvarToFieldVar(cvar) {
    if (!cvar || typeof cvar !== 'object') {
        throw new Error(`Invalid Cvar: expected object, got ${typeof cvar}`);
    }
    switch (cvar.type) {
        case 'var':
            return [1, cvar.id];
        case 'constant':
            return [0, [0, cvar.value]];
        case 'add':
            // Addition: convert recursively
            return [2, cvarToFieldVar(cvar.left), cvarToFieldVar(cvar.right)];
        case 'mul':
            // Multiplication: convert recursively 
            return [3, cvarToFieldVar(cvar.left), cvarToFieldVar(cvar.right)];
        default:
            throw new Error(`Unknown Cvar type: ${cvar.type}`);
    }
}
exports.cvarToFieldVar = cvarToFieldVar;
/**
 * Convert o1js FieldVar to Sparky Cvar format
 *
 * FieldVar format (o1js):
 * - [1, id] -> {type: 'var', id: id}
 * - [0, [0, value]] -> {type: 'constant', value: value}
 *
 * @param fieldVar - o1js field variable
 * @returns Cvar in Sparky format
 */
function fieldVarToCvar(fieldVar) {
    if (!Array.isArray(fieldVar) || fieldVar.length < 2) {
        throw new Error(`Invalid FieldVar: expected array with at least 2 elements, got ${JSON.stringify(fieldVar)}`);
    }
    const [type, data] = fieldVar;
    switch (type) {
        case 0: // Constant
            if (!Array.isArray(data) || data.length !== 2 || data[0] !== 0) {
                throw new Error(`Invalid constant FieldVar format: ${JSON.stringify(fieldVar)}`);
            }
            return { type: 'constant', value: data[1] };
        case 1: // Variable
            if (typeof data !== 'number') {
                throw new Error(`Invalid variable FieldVar format: expected number, got ${typeof data}`);
            }
            return { type: 'var', id: data };
        case 2: // Addition: [2, FieldVar, FieldVar]
            if (data.length !== 2) {
                throw new Error(`Invalid addition FieldVar format: expected 2 operands, got ${data.length}`);
            }
            // Recursively convert nested FieldVars
            return { type: 'add', left: fieldVarToCvar(data[0]), right: fieldVarToCvar(data[1]) };
        case 3: // Scale: [3, FieldVar, FieldVar] 
            if (data.length !== 2) {
                throw new Error(`Invalid scale FieldVar format: expected 2 operands, got ${data.length}`);
            }
            // Recursively convert nested FieldVars
            return { type: 'mul', left: fieldVarToCvar(data[0]), right: fieldVarToCvar(data[1]) };
        default:
            throw new Error(`Unknown FieldVar type: ${type}`);
    }
}
exports.fieldVarToCvar = fieldVarToCvar;
/**
 * Convert Sparky field to o1js format
 * Handles both Cvar objects and pre-converted FieldVar arrays
 *
 * @param field - Field in either format
 * @returns FieldVar in o1js format
 */
function toSparkyField(field) {
    // Already in FieldVar format
    if (Array.isArray(field)) {
        return field;
    }
    // Cvar format - convert
    if (field && typeof field === 'object' && 'type' in field) {
        return cvarToFieldVar(field);
    }
    throw new Error(`Invalid field format: ${JSON.stringify(field)}`);
}
exports.toSparkyField = toSparkyField;
/**
 * Convert any value to FieldVar, handling both Cvar and FieldVar inputs
 */
function ensureFieldVar(value) {
    if (Array.isArray(value)) {
        return value;
    }
    if (value && typeof value === 'object' && 'type' in value) {
        return cvarToFieldVar(value);
    }
    throw new Error(`Cannot convert to FieldVar: ${JSON.stringify(value)}`);
}
exports.ensureFieldVar = ensureFieldVar;
// ===================================================================
// ARRAY CONVERSION
// ===================================================================
/**
 * Convert MlArray to JavaScript array
 * MlArray format: [0, ...elements]
 *
 * @param mlArray - OCaml-style array
 * @returns JavaScript array
 */
function mlArrayToJsArray(mlArray) {
    if (!Array.isArray(mlArray) || mlArray.length === 0 || mlArray[0] !== 0) {
        throw new Error(`Invalid MlArray format: ${JSON.stringify(mlArray)}`);
    }
    return mlArray.slice(1);
}
exports.mlArrayToJsArray = mlArrayToJsArray;
/**
 * Convert JavaScript array to MlArray
 *
 * @param jsArray - JavaScript array
 * @returns MlArray format
 */
function jsArrayToMlArray(jsArray) {
    // Type assertion needed due to TypeScript's strict tuple checking
    return [0, ...jsArray];
}
exports.jsArrayToMlArray = jsArrayToMlArray;
// ===================================================================
// BULK CONVERSIONS
// ===================================================================
/**
 * Convert array of Cvars to array of FieldVars
 *
 * @param cvars - Array of Sparky constraint variables
 * @returns Array of o1js field variables
 */
function cvarsToFieldVars(cvars) {
    return cvars.map(cvarToFieldVar);
}
exports.cvarsToFieldVars = cvarsToFieldVars;
/**
 * Convert array of FieldVars to array of Cvars
 *
 * @param fieldVars - Array of o1js field variables
 * @returns Array of Sparky constraint variables
 */
function fieldVarsToCvars(fieldVars) {
    return fieldVars.map(fieldVarToCvar);
}
exports.fieldVarsToCvars = fieldVarsToCvars;
// ===================================================================
// COEFFICIENT CONVERSION
// ===================================================================
/**
 * Convert coefficient to string format expected by Sparky
 *
 * @param coeff - Coefficient as string, number, or bigint
 * @returns String representation
 */
function coeffToString(coeff) {
    if (typeof coeff === 'string') {
        return coeff;
    }
    return coeff.toString();
}
exports.coeffToString = coeffToString;
/**
 * Convert array of coefficients to string array
 *
 * @param coeffs - Array of coefficients
 * @returns Array of string coefficients
 */
function coeffsToStrings(coeffs) {
    return coeffs.map(coeffToString);
}
exports.coeffsToStrings = coeffsToStrings;
// ===================================================================
// VALIDATION UTILITIES
// ===================================================================
/**
 * Validate that a value is a valid Cvar
 *
 * @param value - Value to check
 * @returns True if valid Cvar
 */
function isValidCvar(value) {
    if (!value || typeof value !== 'object')
        return false;
    switch (value.type) {
        case 'var':
            return typeof value.id === 'number' && value.id >= 0;
        case 'constant':
            return typeof value.value === 'string';
        case 'add':
        case 'mul':
            return isValidCvar(value.left) && isValidCvar(value.right);
        default:
            return false;
    }
}
exports.isValidCvar = isValidCvar;
/**
 * Validate that a value is a valid FieldVar
 *
 * @param value - Value to check
 * @returns True if valid FieldVar
 */
function isValidFieldVar(value) {
    if (!Array.isArray(value) || value.length < 2)
        return false;
    const [type, data] = value;
    switch (type) {
        case 0: // Constant
            return Array.isArray(data) && data.length === 2 && data[0] === 0 && typeof data[1] === 'string';
        case 1: // Variable
            return typeof data === 'number' && data >= 0;
        case 2: // Addition
            return Array.isArray(data) && data.length === 2 && isValidFieldVar(data[0]) && isValidFieldVar(data[1]);
        default:
            return false;
    }
}
exports.isValidFieldVar = isValidFieldVar;
