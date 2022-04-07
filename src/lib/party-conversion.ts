import {
  Field,
  Party_,
  ProtocolStatePredicate_,
  EpochDataPredicate_,
  Control,
  Bool,
} from '../snarky';
import {
  Body,
  EpochDataPredicate,
  Party,
  ProtocolStatePredicate,
} from './party';
import { UInt32 } from './int';

export { toParty, toPartyBody, toProtocolState };

type PartyPredicated = Party_['data'];

function toParty(party: Party): Party_ {
  let predicate: PartyPredicated['predicate'];
  if (party.predicate === undefined) {
    predicate = { kind: 'accept' };
  } else if (party.predicate instanceof UInt32) {
    predicate = { kind: 'nonce', value: party.predicate };
  } else {
    predicate = { kind: 'full', value: party.predicate };
  }
  return {
    data: {
      predicate,
      body: toPartyBody(party.body),
    },
    authorization: party.authorization,
  };
}

function toPartyBody(body: Body): PartyPredicated['body'] {
  let p = body.update.permissions;
  let permissions = { set: new Bool(false) };
  // TODO
  if (p.set) {
  }
  return {
    ...body,
    update: {
      ...body.update,
      permissions,
    },
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
