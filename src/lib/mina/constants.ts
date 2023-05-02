/**
 * This file contains constants used in the Mina protocol.
 * Originally defined in the mina_compile_config file in the mina repo:
 * https://github.com/MinaProtocol/mina/blob/develop/src/lib/mina_compile_config/mina_compile_config.ml
 */

// ---- Constants used to calculate cost of a transaction ----
// Defined in https://github.com/MinaProtocol/mina/blob/e39abf79b7fdf96717eb8a8ee88ec42ba1e2663d/src/lib/mina_compile_config/mina_compile_config.ml#LL67C21
export const proofCost = 10.26 as const;

// Defined in https://github.com/MinaProtocol/mina/blob/e39abf79b7fdf96717eb8a8ee88ec42ba1e2663d/src/lib/mina_compile_config/mina_compile_config.ml#LL69C8
export const signedPairCost = 10.08 as const;

// Defined in https://github.com/MinaProtocol/mina/blob/e39abf79b7fdf96717eb8a8ee88ec42ba1e2663d/src/lib/mina_compile_config/mina_compile_config.ml#L71
export const signedSingleCost = 9.14 as const;

// Defined in https://github.com/MinaProtocol/mina/blob/e39abf79b7fdf96717eb8a8ee88ec42ba1e2663d/src/lib/mina_compile_config/mina_compile_config.ml#L73
export const costLimit = 69.45 as const;
// ----

// ---- Constants to define the maximum number of events and actions in a transaction ----
// Defined in https://github.com/MinaProtocol/mina/blob/e39abf79b7fdf96717eb8a8ee88ec42ba1e2663d/src/lib/mina_compile_config/mina_compile_config.ml#L75
export const maxActionElements = 100 as const;
// Defined in https://github.com/MinaProtocol/mina/blob/e39abf79b7fdf96717eb8a8ee88ec42ba1e2663d/src/lib/mina_compile_config/mina_compile_config.ml#L77
export const maxEventElements = 100 as const;
// ----
