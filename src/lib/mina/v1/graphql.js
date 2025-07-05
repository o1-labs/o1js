import { TokenId } from './account-update.js';
export { getEventsQuery, getActionsQuery, sendZkappQuery, transactionStatusQuery, lastBlockQueryFailureCheck, accountQuery, currentSlotQuery, genesisConstantsQuery, lastBlockQuery, removeJsonQuotes, };
// removes the quotes on JSON keys
function removeJsonQuotes(json) {
    let cleaned = JSON.stringify(JSON.parse(json), null, 2);
    return cleaned.replace(/\"(\S+)\"\s*:/gm, '$1:');
}
const transactionStatusQuery = (txId) => `query {
    transactionStatus(zkappTransaction:"${txId}")
  }`;
const getEventsQuery = (inputs) => {
    inputs.tokenId ?? (inputs.tokenId = TokenId.toBase58(TokenId.default));
    const { publicKey, tokenId, to, from } = inputs;
    let input = `address: "${publicKey}", tokenId: "${tokenId}"`;
    if (to !== undefined) {
        input += `, to: ${to.toString()}`;
    }
    if (from !== undefined) {
        input += `, from: ${from.toString()}`;
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
const getActionsQuery = (inputs) => {
    inputs.tokenId ?? (inputs.tokenId = TokenId.toBase58(TokenId.default));
    const { publicKey, tokenId, actionStates, from, to } = inputs;
    const { fromActionState, endActionState } = actionStates ?? {};
    let input = `address: "${publicKey}", tokenId: "${tokenId}"`;
    if (fromActionState !== undefined) {
        input += `, fromActionState: "${fromActionState}"`;
    }
    if (endActionState !== undefined) {
        input += `, endActionState: "${endActionState}"`;
    }
    if (to !== undefined) {
        input += `, to: ${to}`;
    }
    if (from !== undefined) {
        input += `, from: ${from}`;
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
        transactionInfo { 
          sequenceNumber 
          zkappAccountUpdateIds 
        }
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
const lastBlockQueryFailureCheck = (length) => `{
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
function sendZkappQuery(json) {
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
const accountQuery = (publicKey, tokenId) => `{
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
