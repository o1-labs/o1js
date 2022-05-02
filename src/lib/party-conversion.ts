import {
  Circuit,
  Ledger,
  Field,
  FeePayerParty,
  Parties,
  Party_,
  ProtocolStatePredicate_,
  EpochDataPredicate_,
} from '../snarky';
import {
  Body,
  EpochDataPredicate,
  Predicate,
  ProtocolStatePredicate,
} from './party';
import { UInt32 } from './int';

export { toParty, toPartyBody, toProtocolState };

function toParty(party: { body: Body; predicate: Predicate }): Party_ {
  let predicate: Party_['predicate'];
  if (party.predicate === undefined) {
    predicate = { type: 'accept' };
  } else if (party.predicate instanceof UInt32) {
    predicate = { type: 'nonce', value: party.predicate };
  } else {
    predicate = { type: 'full', value: party.predicate };
  }
  return {
    predicate,
    body: toPartyBody(party.body),
  };
}

function toPartyBody(body: Body): Party_['body'] {
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
