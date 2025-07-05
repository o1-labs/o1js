/**
 * Poseidon Operations Module
 * 
 * This module provides the Poseidon hash function interface for the Sparky adapter,
 * delegating to the underlying WASM Poseidon implementation while maintaining
 * compatibility with the Snarky API.
 */

import { getSparkyInstance } from './module-loader.js';
import { FieldVar } from './types.js';

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
   * @param state - Array of field elements representing the state
   * @param input - Array of field elements to hash
   * @returns Updated state array
   */
  update(state: FieldVar[], input: FieldVar[]): FieldVar[] {
    return getPoseidonModule().update(state, input);
  },

  /**
   * Hash input to elliptic curve group element
   * @param input - Array of field elements to hash
   * @returns Group element (x, y coordinates)
   */
  hashToGroup(input: FieldVar[]): { x: FieldVar; y: FieldVar } {
    return getPoseidonModule().hashToGroup(input);
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