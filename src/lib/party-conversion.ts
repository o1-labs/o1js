import {
  Field,
  Party_,
  ProtocolStatePredicate_,
  EpochDataPredicate_,
  Control,
  Bool,
  FeePayerParty,
} from '../snarky';
import {
  Body,
  EpochDataPredicate,
  Party,
  Predicate,
  ProtocolStatePredicate,
} from './party';
import { UInt32 } from './int';

export { toParty, toPartyBody, toFeePayerPartyBody, toProtocolState };

function toParty(party: Party): Party_ {
  return {
    body: toPartyBody(party.body, party.predicate),
    authorization: party.authorization,
  };
}

function toPartyBody(body: Body, predicate: Predicate): Party_['body'] {
  let accountPrecondition: Party_['body']['accountPrecondition'];
  if (predicate === undefined) {
    accountPrecondition = { kind: 'accept' };
  } else if (predicate instanceof UInt32) {
    accountPrecondition = { kind: 'nonce', value: predicate };
  } else {
    accountPrecondition = { kind: 'full', value: predicate };
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
  body: Body,
  predicate: UInt32
): FeePayerParty['body'] {
  return {
    ...body,
    events: body.events.events,
    depth: parseInt(body.depth.toString(), 10),
    accountPrecondition: predicate,
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
