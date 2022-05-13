import { Field, Ledger } from '../snarky';
import { Parties as Parties_ } from '../snarky/parties';
import {
  AccountPrecondition,
  Body,
  ClosedInterval,
  EpochDataPredicate,
  FeePayer,
  LazyControl,
  OrIgnore,
  Party,
  Precondition,
  ProtocolStatePredicate,
  SetOrKeep,
  Update,
} from './party';
import { UInt32 } from './int';

export { toParties, toParty, toProtocolState };

type Party_ = Parties_['otherParties'][number];
type ProtocolStatePrecondition_ = Party_['body']['protocolStatePrecondition'];
type EpochDataPrecondition_ = ProtocolStatePrecondition_['nextEpochData'];
type FeePayerParty_ = Parties_['feePayer'];
type Control_ = Party_['authorization'];

function toParties({
  feePayer,
  otherParties,
}: {
  feePayer: FeePayer;
  otherParties: Party[];
}): Parties_ {
  return {
    feePayer: toFeePayer(feePayer),
    otherParties: otherParties.map(toParty),
    // TODO expose to Mina.transaction
    memo: Ledger.memoToBase58(''),
  };
}

function toParty(party: Party): Party_ {
  return {
    body: toPartyBody(party.body),
    authorization: toControl(party.authorization),
  };
}

function toFeePayer(party: FeePayer): FeePayerParty_ {
  return {
    body: toFeePayerPartyBody(party.body),
    authorization: toFeePayerControl(party.authorization),
  };
}

function toControl<T extends LazyControl>(authorization: T): Control_ {
  if (authorization.kind === 'signature')
    return { signature: authorization.value };
  if (authorization.kind === 'proof') return { proof: authorization.value };
  return {};
}
function toFeePayerControl<T extends LazyControl>(
  authorization: T
): Exclude<Control_['signature'], undefined> {
  // TODO: this should add an actual dummy signature to allow signing later
  if (authorization.kind !== 'signature') {
    return 'dummy';
  }
  return authorization.value;
}

function toPartyBody(body: Body): Party_['body'] {
  return {
    // TODO
    balanceChange: { magnitude: body.delta, sgn: Field.one },
    // TODO add to Party and set to defaultTokenId (which is Field.one)
    caller: Field.one,
    incrementNonce: body.incrementNonce.toBoolean(),
    publicKey: body.publicKey,
    tokenId: body.tokenId,
    update: toUpdate(body.update),
    useFullCommitment: body.useFullCommitment.toBoolean(),
    events: body.events.events,
    callDepth: parseInt(body.depth.toString(), 10),
    accountPrecondition: toAccountPrecondition(body.accountPrecondition),
    // TODO
    sequenceEvents: [],
    callData: Field.zero,
    protocolStatePrecondition: toProtocolState(body.protocolState),
  };
}

function toFeePayerPartyBody(
  body: Body & { accountPrecondition: UInt32 }
): FeePayerParty_['body'] {
  return {
    // TODO
    fee: new UInt32(body.delta.uint64Value()),
    nonce: body.accountPrecondition,
    publicKey: body.publicKey,
    update: toUpdate(body.update),
    events: body.events.events,
    // TODO
    sequenceEvents: [],
    protocolStatePrecondition: toProtocolState(body.protocolState),
  };
}

function toUpdate({
  appState,
  delegate,
  permissions,
  timing,
  tokenSymbol,
  verificationKey,
  zkappUri,
  votingFor,
}: Update): Party_['body']['update'] {
  return {
    appState: appState.map(fromSetOrKeep),
    delegate: fromSetOrKeep(delegate),
    permissions: fromSetOrKeep(permissions),
    timing: fromSetOrKeep(timing),
    // TODO -- should be a string in party.ts!
    tokenSymbol: fromSetOrKeep(tokenSymbol)?.toString(),
    verificationKey: verificationKey.set.toBoolean()
      ? {
          data: verificationKey.value,
          hash: Field.zero, // TODO
        }
      : undefined,
    zkappUri: fromSetOrKeep(zkappUri),
    votingFor: fromSetOrKeep(votingFor),
  };
}

function toAccountPrecondition(
  accountPrecondition: Precondition
): Party_['body']['accountPrecondition'] {
  let full: AccountPrecondition; // TODO make type names better
  if (accountPrecondition === undefined) {
    full = AccountPrecondition.ignoreAll();
  } else if (accountPrecondition instanceof UInt32) {
    full = AccountPrecondition.nonce(accountPrecondition);
  } else {
    full = accountPrecondition;
  }
  return {
    state: full.state.map(fromOrIgnore),
    balance: fromClosedInterval(full.balance),
    delegate: fromOrIgnore(full.delegate),
    nonce: fromClosedInterval(full.nonce),
    provedState: fromOrIgnore(full.provedState)?.toBoolean(),
    receiptChainHash: fromOrIgnore(full.receiptChainHash),
    sequenceState: fromOrIgnore(full.sequenceState),
  };
}

function toProtocolState(
  protocolState: ProtocolStatePredicate
): ProtocolStatePrecondition_ {
  // TODO: remove unused values from ProtocolStatePredicate
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
    snarkedLedgerHash: fromOrIgnore(snarkedLedgerHash),
    timestamp: fromClosedInterval(timestamp),
    blockchainLength: fromClosedInterval(blockchainLength),
    minWindowDensity: fromClosedInterval(minWindowDensity),
    totalCurrency: fromClosedInterval(totalCurrency),
    globalSlotSinceHardFork: fromClosedInterval(globalSlotSinceHardFork),
    globalSlotSinceGenesis: fromClosedInterval(globalSlotSinceGenesis),
    stakingEpochData: toEpochDataPredicate(stakingEpochData),
    nextEpochData: toEpochDataPredicate(nextEpochData),
  };
}

function toEpochDataPredicate(
  predicate: EpochDataPredicate
): EpochDataPrecondition_ {
  let {
    ledger,
    epochLength,
    lockCheckpoint_: lockCheckpoint,
    seed_: seed,
    startCheckpoint_: startCheckpoint,
  } = predicate;
  return {
    ledger: {
      totalCurrency: fromClosedInterval(ledger.totalCurrency),
      hash: fromOrIgnore(ledger.hash_),
    },
    epochLength: fromClosedInterval(epochLength),
    lockCheckpoint: fromOrIgnore(lockCheckpoint),
    seed: fromOrIgnore(seed),
    startCheckpoint: fromOrIgnore(startCheckpoint),
  };
}

function fromOrIgnore<T>({ check, value }: OrIgnore<T>) {
  return check.toBoolean() ? value : undefined;
}
function fromSetOrKeep<T>({ set, value }: SetOrKeep<T>) {
  return set.toBoolean() ? value : undefined;
}
function fromClosedInterval<T>(intv: ClosedInterval<T>) {
  return { lower: intv.lower, upper: intv.upper };
}
