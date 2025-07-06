/**
 * Poseidon Operations Module
 * 
 * This module provides the Poseidon hash function interface for the Sparky adapter,
 * delegating to the underlying WASM Poseidon implementation while maintaining
 * compatibility with the Snarky API.
 */

import { getSparkyInstance } from './module-loader.js';
import { FieldVar, MlArray, isMlArray } from './types.js';
import { jsArrayToMlArray, mlArrayToJsArray } from './format-converter.js';

/**
 * Get the Poseidon module from Sparky instance
 */
function getPoseidonModule() {
  return getSparkyInstance().poseidon;
}

/**
 * Poseidon operations interface
 */
export const poseidonOperations = {
  /**
   * Update Poseidon state with new input
   * @param state - MLArray of field elements representing the state
   * @param input - MLArray of field elements to hash
   * @returns Updated state array
   */
  update(state: MlArray<FieldVar>, input: MlArray<FieldVar>): FieldVar[] {
    // Convert MLArray format to JavaScript arrays before passing to Rust WASM
    const stateJsArray = mlArrayToJsArray(state) as FieldVar[];
    const inputJsArray = mlArrayToJsArray(input) as FieldVar[];
    
    // Call Rust WASM with normal JavaScript arrays
    const result = getPoseidonModule().update(stateJsArray, inputJsArray);
    
    // Return result as normal JavaScript array
    return result;
  },

  /**
   * Hash input to elliptic curve group element
   * @param input - MLArray of field elements to hash
   * @returns Group element (x, y coordinates)
   */
  hashToGroup(input: MlArray<FieldVar>): { x: FieldVar; y: FieldVar } {
    // Convert MLArray format to JavaScript array before passing to Rust WASM
    const inputJsArray = mlArrayToJsArray(input) as FieldVar[];
    
    // Call Rust WASM with normal JavaScript array
    return getPoseidonModule().hashToGroup(inputJsArray);
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
    create(isChecked: boolean): any {
      return getPoseidonModule().spongeCreate(isChecked);
    },

    /**
     * Absorb a single field element into sponge state
     * @param sponge - Sponge state object
     * @param field - Single field element to absorb (NOT an array)
     */
    absorb(sponge: any, field: FieldVar): void {
      getPoseidonModule().spongeAbsorb(sponge, field);
    },

    /**
     * Squeeze field element from sponge state
     * @param sponge - Sponge state object
     * @returns Single field element
     */
    squeeze(sponge: any): FieldVar {
      return getPoseidonModule().spongeSqueeze(sponge);
    }
  }
};