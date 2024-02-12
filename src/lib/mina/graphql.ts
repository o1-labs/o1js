import { ActionStatesStringified, removeJsonQuotes } from '../fetch.js';
import { UInt32 } from '../int.js';
import { ZkappCommand } from '../account_update.js';

export {
  type EpochData,
  type LastBlockQueryResponse,
  type GenesisConstants,
  type FailureReasonResponse,
  type LastBlockQueryFailureCheckResponse,
  type FetchedBlock,
  type TransactionStatus,
  type TransactionStatusQueryResponse,
  type EventQueryResponse,
  type ActionQueryResponse,
  type EventActionFilterOptions,
  type SendZkAppResponse,
  getEventsQuery,
  getActionsQuery,
  sendZkappQuery,
  transactionStatusQuery,
  lastBlockQuery,
  lastBlockQueryFailureCheck,
  genesisConstantsQuery,
};

type GenesisConstants = {
  genesisTimestamp: string;
  coinbase: number;
  accountCreationFee: number;
  epochDuration: number;
  k: number;
  slotDuration: number;
  slotsPerEpoch: number;
};

type EpochData = {
  ledger: {
    hash: string;
    totalCurrency: string;
  };
  seed: string;
  startCheckpoint: string;
  lockCheckpoint: string;
  epochLength: string;
};

type LastBlockQueryResponse = {
  bestChain: {
    protocolState: {
      blockchainState: {
        snarkedLedgerHash: string;
        stagedLedgerHash: string;
        date: string;
        utcDate: string;
        stagedLedgerProofEmitted: boolean;
      };
      previousStateHash: string;
      consensusState: {
        blockHeight: string;
        slotSinceGenesis: string;
        slot: string;
        nextEpochData: EpochData;
        stakingEpochData: EpochData;
        epochCount: string;
        minWindowDensity: string;
        totalCurrency: string;
        epoch: string;
      };
    };
  }[];
};

type FailureReasonResponse = {
  failures: string[];
  index: number;
}[];

type LastBlockQueryFailureCheckResponse = {
  bestChain: {
    transactions: {
      zkappCommands: {
        hash: string;
        failureReason: FailureReasonResponse;
      }[];
    };
  }[];
};

type FetchedBlock = {
  protocolState: {
    blockchainState: {
      snarkedLedgerHash: string; // hash-like encoding
      stagedLedgerHash: string; // hash-like encoding
      date: string; // String(Date.now())
      utcDate: string; // String(Date.now())
      stagedLedgerProofEmitted: boolean; // bool
    };
    previousStateHash: string; // hash-like encoding
    consensusState: {
      blockHeight: string; // String(number)
      slotSinceGenesis: string; // String(number)
      slot: string; // String(number)
      nextEpochData: {
        ledger: {
          hash: string; // hash-like encoding
          totalCurrency: string; // String(number)
        };
        seed: string; // hash-like encoding
        startCheckpoint: string; // hash-like encoding
        lockCheckpoint: string; // hash-like encoding
        epochLength: string; // String(number)
      };
      stakingEpochData: {
        ledger: {
          hash: string; // hash-like encoding
          totalCurrency: string; // String(number)
        };
        seed: string; // hash-like encoding
        startCheckpoint: string; // hash-like encoding
        lockCheckpoint: string; // hash-like encoding
        epochLength: string; // String(number)
      };
      epochCount: string; // String(number)
      minWindowDensity: string; // String(number)
      totalCurrency: string; // String(number)
      epoch: string; // String(number)
    };
  };
};

/**
 * INCLUDED: A transaction that is on the longest chain
 *
 * PENDING: A transaction either in the transition frontier or in transaction pool but is not on the longest chain
 *
 * UNKNOWN: The transaction has either been snarked, reached finality through consensus or has been dropped
 *
 */
type TransactionStatus = 'INCLUDED' | 'PENDING' | 'UNKNOWN';

type TransactionStatusQueryResponse = {
  transactionStatus: TransactionStatus;
};

type SendZkAppResponse = {
  sendZkapp: {
    zkapp: {
      hash: string;
      id: string;
      zkappCommand: ZkappCommand;
      failureReasons: FailureReasonResponse;
    };
  };
};

type EventQueryResponse = {
  events: {
    blockInfo: {
      distanceFromMaxBlockHeight: number;
      globalSlotSinceGenesis: number;
      height: number;
      stateHash: string;
      parentHash: string;
      chainStatus: string;
    };
    eventData: {
      transactionInfo: {
        hash: string;
        memo: string;
        status: string;
      };
      data: string[];
    }[];
  }[];
};

type ActionQueryResponse = {
  actions: {
    blockInfo: {
      distanceFromMaxBlockHeight: number;
    };
    actionState: {
      actionStateOne: string;
      actionStateTwo: string;
    };
    actionData: {
      accountUpdateId: string;
      data: string[];
    }[];
  }[];
};

type EventActionFilterOptions = {
  to?: UInt32;
  from?: UInt32;
};

const transactionStatusQuery = (txId: string) => `query {
    transactionStatus(zkappTransaction:"${txId}")
  }`;

const getEventsQuery = (
  publicKey: string,
  tokenId: string,
  filterOptions?: EventActionFilterOptions
) => {
  const { to, from } = filterOptions ?? {};
  let input = `address: "${publicKey}", tokenId: "${tokenId}"`;
  if (to !== undefined) {
    input += `, to: ${to}`;
  }
  if (from !== undefined) {
    input += `, from: ${from}`;
  }
  return `{
  events(input: { ${input} }) {
    blockInfo {
      distanceFromMaxBlockHeight
      height
      globalSlotSinceGenesis
      stateHash
      parentHash
      chainStatus
    }
    eventData {
      transactionInfo {
        hash
        memo
        status
      }
      data
    }
  }
}`;
};

const getActionsQuery = (
  publicKey: string,
  actionStates: ActionStatesStringified,
  tokenId: string,
  _filterOptions?: EventActionFilterOptions
) => {
  const { fromActionState, endActionState } = actionStates ?? {};
  let input = `address: "${publicKey}", tokenId: "${tokenId}"`;
  if (fromActionState !== undefined) {
    input += `, fromActionState: "${fromActionState}"`;
  }
  if (endActionState !== undefined) {
    input += `, endActionState: "${endActionState}"`;
  }
  return `{
  actions(input: { ${input} }) {
    blockInfo {
      distanceFromMaxBlockHeight
    }
    actionState {
      actionStateOne
      actionStateTwo
    }
    actionData {
      accountUpdateId
      data
    }
  }
}`;
};

const genesisConstantsQuery = `{
    genesisConstants {
      genesisTimestamp
      coinbase
      accountCreationFee
    }
    daemonStatus {
      consensusConfiguration {
        epochDuration
        k
        slotDuration
        slotsPerEpoch
      }
    }
  }`;

const lastBlockQuery = `{
  bestChain(maxLength: 1) {
    protocolState {
      blockchainState {
        snarkedLedgerHash
        stagedLedgerHash
        date
        utcDate
        stagedLedgerProofEmitted
      }
      previousStateHash
      consensusState {
        blockHeight
        slotSinceGenesis
        slot
        nextEpochData {
          ledger {hash totalCurrency}
          seed
          startCheckpoint
          lockCheckpoint
          epochLength
        }
        stakingEpochData {
          ledger {hash totalCurrency}
          seed
          startCheckpoint
          lockCheckpoint
          epochLength
        }
        epochCount
        minWindowDensity
        totalCurrency
        epoch
      }
    }
  }
}`;

const lastBlockQueryFailureCheck = (length: number) => `{
  bestChain(maxLength: ${length}) {
    transactions {
      zkappCommands {
        hash
        failureReason {
          failures
          index
        }
      }
    }
  }
}`;

// TODO: Decide an appropriate response structure.
function sendZkappQuery(json: string) {
  return `mutation {
  sendZkapp(input: {
    zkappCommand: ${removeJsonQuotes(json)}
  }) {
    zkapp {
      hash
      id
      failureReason {
        failures
        index
      }
      zkappCommand {
        memo
        feePayer {
          body {
            publicKey
          }
        }
        accountUpdates {
          body {
            publicKey
            useFullCommitment
            incrementNonce
          }
        }
      }
    }
  }
}
`;
}