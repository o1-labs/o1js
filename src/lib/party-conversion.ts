import {
  Field,
  Party_,
  ProtocolStatePredicate_,
  EpochDataPredicate_,
  FeePayerParty,
} from '../snarky';
import {
  Body,
  EpochDataPredicate,
  Party,
  ProtocolStatePredicate,
} from './party';
import { UInt32 } from './int';

export { toParty, toPartyBody, toFeePayerPartyBody, toProtocolState };

function toParty(party: Party): Party_ {
  return {
    body: toPartyBody(party.body),
    authorization: party.authorization,
  };
}

function toPartyBody(body: Body): Party_['body'] {
  let accountPrecondition: Party_['body']['accountPrecondition'];
  if (body.accountPrecondition === undefined) {
    accountPrecondition = { kind: 'accept' };
  } else if (body.accountPrecondition instanceof UInt32) {
    accountPrecondition = { kind: 'nonce', value: body.accountPrecondition };
  } else {
    accountPrecondition = { kind: 'full', value: body.accountPrecondition };
  }
  return {
    ...body,
    events: body.events.events,
    depth: parseInt(body.depth.toString(), 10),
    accountPrecondition,
    // TODO
    sequenceEvents: [],
    callData: Field.zero,
    protocolState: toProtocolState(body.protocolState),
  };
}

function toFeePayerPartyBody(
  body: Body & { accountPrecondition: UInt32 }
): FeePayerParty['body'] {
  return {
    ...body,
    events: body.events.events,
    depth: parseInt(body.depth.toString(), 10),
    // TODO
    sequenceEvents: [],
    callData: Field.zero,
    protocolState: toProtocolState(body.protocolState),
  };
}

function toProtocolState(
  protocolState: ProtocolStatePredicate
): ProtocolStatePredicate_ {
  let {
    snarkedLedgerHash_: snarkedLedgerHash,
    snarkedNextAvailableToken,
    timestamp,
    blockchainLength,
    minWindowDensity,
    lastVrfOutput_: lastVrfOutput,
    totalCurrency,
    globalSlotSinceHardFork,
    globalSlotSinceGenesis,
    stakingEpochData,
    nextEpochData,
  } = protocolState;
  return {
    snarkedLedgerHash,
    snarkedNextAvailableToken,
    timestamp,
    blockchainLength,
    minWindowDensity,
    lastVrfOutput,
    totalCurrency,
    globalSlotSinceHardFork,
    globalSlotSinceGenesis,
    stakingEpochData: toEpochDataPredicate(stakingEpochData),
    nextEpochData: toEpochDataPredicate(nextEpochData),
  };
}

function toEpochDataPredicate(
  predicate: EpochDataPredicate
): EpochDataPredicate_ {
  let {
    ledger,
    epochLength,
    lockCheckpoint_: lockCheckpoint,
    seed_: seed,
    startCheckpoint_: startCheckpoint,
  } = predicate;
  return {
    ledger: {
      totalCurrency: ledger.totalCurrency,
      hash: ledger.hash_,
    },
    epochLength,
    lockCheckpoint,
    seed,
    startCheckpoint,
  };
}
