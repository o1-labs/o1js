/**
 * This file contains constants used in the Mina protocol.
 */

// Constants to define the maximum number of segments, events, and actions in a transaction
export namespace TransactionLimits {
  export const MAX_ZKAPP_SEGMENT_PER_TRANSACTION = 16;
  export const MAX_ACTION_ELEMENTS = 1024 as const;
  export const MAX_EVENT_ELEMENTS = 1024 as const;
}

export namespace ZkappConstants {
  export const MAX_ZKAPP_STATE_FIELDS = 32 as const;
  export const ACCOUNT_ACTION_STATE_BUFFER_SIZE = 5 as const;
  export const ACCOUNT_CREATION_FEE = 1000000000n as const;
}
