import { UInt32 } from '../provable/int.js';
import type { ZkappCommand } from './account-update.js';
import type { ActionStatesStringified } from './fetch.js';
import { Types } from '../../bindings/mina-transaction/types.js';

export {
  type EpochData,
  type LastBlockQueryResponse,
  type GenesisConstantsResponse,
  type FailureReasonResponse,
  type LastBlockQueryFailureCheckResponse,
  type FetchedAction,
  type FetchedBlock,
  type TransactionStatus,
  type TransactionStatusQueryResponse,
  type EventQueryResponse,
  type ActionQueryResponse,
  type EventActionFilterOptions,
  type SendZkAppResponse,
  type FetchedAccount,
  type FetchedAccountResponse,
  type CurrentSlotResponse,
  getEventsQuery,
  getActionsQuery,
  sendZkappQuery,
  transactionStatusQuery,
  lastBlockQueryFailureCheck,
  accountQuery,
  currentSlotQuery,
  genesisConstantsQuery,
  lastBlockQuery,
  removeJsonQuotes,
};

// removes the quotes on JSON keys
function removeJsonQuotes(json: string) {
  let cleaned = JSON.stringify(JSON.parse(json), null, 2);
  return cleaned.replace(/\"(\S+)\"\s*:/gm, '$1:');
}

type AuthRequired = Types.Json.AuthRequired;
// TODO auto-generate this type and the query
type FetchedAccount = {
  publicKey: string;
  token: string;
  nonce: string;
  balance: { total: string };
  tokenSymbol: string | null;
  receiptChainHash: string | null;
  timing: {
    initialMinimumBalance: string | null;
    cliffTime: string | null;
    cliffAmount: string | null;
    vestingPeriod: string | null;
    vestingIncrement: string | null;
  };
  permissions: {
    editState: AuthRequired;
    access: AuthRequired;
    send: AuthRequired;
    receive: AuthRequired;
    setDelegate: AuthRequired;
    setPermissions: AuthRequired;
    setVerificationKey: {
      auth: AuthRequired;
      txnVersion: string;
    };
    setZkappUri: AuthRequired;
    editActionState: AuthRequired;
    setTokenSymbol: AuthRequired;
    incrementNonce: AuthRequired;
    setVotingFor: AuthRequired;
    setTiming: AuthRequired;
  } | null;
  delegateAccount: { publicKey: string } | null;
  votingFor: string | null;
  zkappState: string[] | null;
  verificationKey: { verificationKey: string; hash: string } | null;
  actionState: string[] | null;
  provedState: boolean | null;
  zkappUri: string | null;
};
type FetchedAccountResponse = {
  account: FetchedAccount;
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

type GenesisConstantsResponse = {
  genesisConstants: {
    genesisTimestamp: string;
    coinbase: string;
    accountCreationFee: string;
  };
  daemonStatus: {
    consensusConfiguration: {
      epochDuration: string;
      k: string;
      slotDuration: string;
      slotsPerEpoch: string;
    };
  };
};

type CurrentSlotResponse = {
  bestChain: Array<{
    protocolState: {
      consensusState: {
        slot: number;
      };
    };
  }>;
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

type FetchedAction = {
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
};

type ActionQueryResponse = {
  actions: FetchedAction[];
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
    stateHash
    protocolState {
      consensusState {
        blockHeight
        epoch
        slotSinceGenesis
      }
      previousStateHash
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

const accountQuery = (publicKey: string, tokenId: string) => `{
  account(publicKey: "${publicKey}", token: "${tokenId}") {
    publicKey
    token
    nonce
    balance { total }
    tokenSymbol
    receiptChainHash
    timing {
      initialMinimumBalance
      cliffTime
      cliffAmount
      vestingPeriod
      vestingIncrement
    }
    permissions {
      editState
      access
      send
      receive
      setDelegate
      setPermissions
      setVerificationKey {
        auth
        txnVersion
      }
      setZkappUri
      editActionState
      setTokenSymbol
      incrementNonce
      setVotingFor
      setTiming
    }
    delegateAccount { publicKey }
    votingFor
    zkappState
    verificationKey {
      verificationKey
      hash
    }
    actionState
    provedState
    zkappUri
  }
}
`;

const currentSlotQuery = `{
    bestChain(maxLength: 1) {
      protocolState {
        consensusState {
          slot
        }
      }
    }
}`;
