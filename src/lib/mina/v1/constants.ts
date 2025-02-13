/**
 * This file contains constants used in the Mina protocol.
 * Originally defined in the mina_compile_config file in the mina repo:
 * https://github.com/MinaProtocol/mina/blob/develop/src/lib/mina_compile_config/mina_compile_config.ml
 */

// Constants used to calculate cost of a transaction
export namespace TransactionCost {
  // Defined in https://github.com/MinaProtocol/mina/blob/e8c743488cf0c8f0b7925b7a48a914ca73ed13a1/src/lib/mina_compile_config/mina_compile_config.ml#L67
  export const PROOF_COST = 10.26 as const;

  // Defined in https://github.com/MinaProtocol/mina/blob/e8c743488cf0c8f0b7925b7a48a914ca73ed13a1/src/lib/mina_compile_config/mina_compile_config.ml#L69
  export const SIGNED_PAIR_COST = 10.08 as const;

  // Defined in https://github.com/MinaProtocol/mina/blob/e39abf79b7fdf96717eb8a8ee88ec42ba1e2663d/src/lib/mina_compile_config/mina_compile_config.ml#L71
  export const SIGNED_SINGLE_COST = 9.14 as const;

  // Defined in https://github.com/MinaProtocol/mina/blob/e39abf79b7fdf96717eb8a8ee88ec42ba1e2663d/src/lib/mina_compile_config/mina_compile_config.ml#L73
  export const COST_LIMIT = 69.45 as const;
}

// Constants to define the maximum number of events and actions in a transaction
export namespace TransactionLimits {
  // Defined in https://github.com/MinaProtocol/mina/blob/e39abf79b7fdf96717eb8a8ee88ec42ba1e2663d/src/lib/mina_compile_config/mina_compile_config.ml#L75
  export const MAX_ACTION_ELEMENTS = 100 as const;
  // Defined in https://github.com/MinaProtocol/mina/blob/e39abf79b7fdf96717eb8a8ee88ec42ba1e2663d/src/lib/mina_compile_config/mina_compile_config.ml#L77
  export const MAX_EVENT_ELEMENTS = 100 as const;
}
