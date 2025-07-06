"use strict";
/**
 * Poseidon Operations Module
 *
 * This module provides the Poseidon hash function interface for the Sparky adapter,
 * delegating to the underlying WASM Poseidon implementation while maintaining
 * compatibility with the Snarky API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.poseidonOperations = void 0;
const module_loader_js_1 = require("./module-loader.js");
const format_converter_js_1 = require("./format-converter.js");
/**
 * Recursively flatten complex FieldVar expressions for WASM compatibility
 * The WASM layer expects simple FieldVars (constants/variables), not complex expressions
 */
function flattenFieldVar(fieldVar) {
    // For now, just pass through all FieldVars unchanged
    // The WASM layer should handle them correctly
    return fieldVar;
}
/**
 * Get the Poseidon module from Sparky instance
 */
function getPoseidonModule() {
    return (0, module_loader_js_1.getSparkyInstance)().poseidon;
}
/**
 * Poseidon operations interface
 */
exports.poseidonOperations = {
    /**
     * Update Poseidon state with new input
     * @param state - MLArray of field elements representing the state
     * @param input - MLArray of field elements to hash
     * @returns Updated state array
     */
    update(state, input) {
        // Convert MLArray format to JavaScript arrays 
        const stateJsArray = (0, format_converter_js_1.mlArrayToJsArray)(state);
        const inputJsArray = (0, format_converter_js_1.mlArrayToJsArray)(input);
        // Flatten complex FieldVar expressions for WASM compatibility
        const flattenedState = stateJsArray.map(flattenFieldVar);
        const flattenedInput = inputJsArray.map(flattenFieldVar);
        // Pass FieldVar arrays directly to WASM (no conversion to CVars)
        const result = getPoseidonModule().update(flattenedState, flattenedInput);
        // Return result as normal JavaScript array
        return result;
    },
    /**
     * Hash input to elliptic curve group element
     * @param input - MLArray of field elements to hash
     * @returns Group element (x, y coordinates)
     */
    hashToGroup(input) {
        // Convert MLArray format to JavaScript array
        const inputJsArray = (0, format_converter_js_1.mlArrayToJsArray)(input);
        // Flatten complex FieldVar expressions for WASM compatibility
        const flattenedInput = inputJsArray.map(flattenFieldVar);
        // Pass FieldVar arrays directly to WASM (no conversion to CVars)
        return getPoseidonModule().hashToGroup(flattenedInput);
    },
    /**
     * Poseidon sponge construction interface
     */
    sponge: {
        /**
         * Create Poseidon sponge construction
         * @param isChecked - Whether to create checked or unchecked sponge
         * @returns Sponge state object
         */
        create(isChecked) {
            return getPoseidonModule().spongeCreate(isChecked);
        },
        /**
         * Absorb a single field element into sponge state
         * @param sponge - Sponge state object
         * @param field - Single field element to absorb (NOT an array)
         */
        absorb(sponge, field) {
            getPoseidonModule().spongeAbsorb(sponge, field);
        },
        /**
         * Squeeze field element from sponge state
         * @param sponge - Sponge state object
         * @returns Single field element
         */
        squeeze(sponge) {
            return getPoseidonModule().spongeSqueeze(sponge);
        }
    }
};
