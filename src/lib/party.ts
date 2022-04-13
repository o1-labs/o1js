import { CircuitValue } from './circuit_value';
import { Group, Field, Bool, Control, Circuit, Ledger } from '../snarky';
import { PrivateKey, PublicKey } from './signature';
import { UInt64, UInt32, Int64 } from './int';
import * as Mina from './mina';

export { FeePayer, LazyControl, signJsonTransaction };

const ZkappStateLength = 8;

/**
 * Timing info inside an account.
 */
export type Timing = {
  initialMinimumBalance: UInt64;
  cliffTime: UInt32;
  cliffAmount: UInt64;
  vestingPeriod: UInt32;
  vestingIncrement: UInt64;
};

/**
 * Either set a value or keep it the same.
 */
export class SetOrKeep<T> {
  set: Bool;
  value: T;

  setValue(x: T) {
    this.set = Bool(true);
    this.value = x;
  }

  constructor(set: Bool, value: T) {
    this.set = set;
    this.value = value;
  }
}

const True = () => Bool(true);
const False = () => Bool(false);

/**
 * One specific permission value.
 *
 * A [[ Permission ]] tells one specific permission for our zkapp how it should behave
 * when presented with requested modifications.
 *
 * Use static factory methods on this class to use a specific behavior. See
 * documentation on those methods to learn more.
 */
export type Permission = {
  constant: Bool;
  signatureNecessary: Bool;
  signatureSufficient: Bool;
};
export let Permission = {
  /**
   * Modification is impossible.
   */
  impossible: (): Permission => ({
    constant: True(),
    signatureNecessary: True(),
    signatureSufficient: False(),
  }),

  /**
   * Modification is always permitted
   */
  none: (): Permission => ({
    constant: True(),
    signatureNecessary: False(),
    signatureSufficient: False(),
  }),

  /**
   * Modification is permitted by zkapp proofs only
   */
  proof: (): Permission => ({
    constant: False(),
    signatureNecessary: False(),
    signatureSufficient: False(),
  }),

  /**
   * Modification is permitted by signatures only, using the private key of the zkapp account
   */
  signature: (): Permission => ({
    constant: False(),
    signatureNecessary: True(),
    signatureSufficient: True(),
  }),

  /**
   * Modification is permitted by zkapp proofs or signatures
   */
  proofOrSignature: (): Permission => ({
    constant: False(),
    signatureNecessary: False(),
    signatureSufficient: True(),
  }),
};

/**
 * Permissions specify how specific aspects of the zkapp account are allowed to
 * be modified. All fields are denominated by a [[ Permission ]].
 */
export type Permissions = {
  /**
   * The [[ Permission ]] corresponding to the 8 state fields associated with an
   * account.
   */
  editState: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to send transactions from this
   * account.
   */
  send: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to receive transactions to this
   * account.
   */
  receive: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to set the delegate field of
   * the account.
   */
  setDelegate: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to set the permissions field of
   * the account.
   */
  setPermissions: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to set the verification key
   * associated with the circuit tied to this account. Effectively
   * "upgradability" of the smart contract.
   */
  setVerificationKey: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to set the zkapp uri typically
   * pointing to the source code of the smart contract. Usually this should be
   * changed whenever the [[ Permissions.setVerificationKey ]] is changed.
   * Effectively "upgradability" of the smart contract.
   */
  setZkappUri: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to change the sequence state
   * associated with the account.
   *
   * TODO: Define sequence state here as well.
   */
  editSequenceState: Permission;

  /**
   * The [[ Permission ]] corresponding to the ability to set the token symbol for
   * this account.
   */
  setTokenSymbol: Permission;

  // TODO: doccomments
  incrementNonce: Permission;
  setVotingFor: Permission;
};
export let Permissions = {
  ...Permission,
  /**
   * Default permissions are:
   *   [[ Permissions.editState ]]=[[ Permission.proof ]]
   *   [[ Permissions.send ]]=[[ Permission.signature ]]
   *   [[ Permissions.receive ]]=[[ Permission.proof ]]
   *   [[ Permissions.setDelegate ]]=[[ Permission.signature ]]
   *   [[ Permissions.setPermissions ]]=[[ Permission.signature ]]
   *   [[ Permissions.setVerificationKey ]]=[[ Permission.signature ]]
   *   [[ Permissions.setZkappUri ]]=[[ Permission.signature ]]
   *   [[ Permissions.editSequenceState ]]=[[ Permission.proof ]]
   *   [[ Permissions.setTokenSymbol ]]=[[ Permission.signature ]]
   */
  default: (): Permissions => ({
    editState: Permission.proof(),
    send: Permission.signature(),
    receive: Permission.proof(),
    setDelegate: Permission.signature(),
    setPermissions: Permission.signature(),
    setVerificationKey: Permission.signature(),
    setZkappUri: Permission.signature(),
    editSequenceState: Permission.proof(),
    setTokenSymbol: Permission.signature(),
    incrementNonce: Permission.signature(),
    setVotingFor: Permission.signature(),
  }),
};

/* TODO: How should we handle "String"s, should we bridge them from OCaml? */
class String_ extends CircuitValue {}

export type Update = {
  appState: Array<SetOrKeep<Field>>;
  delegate: SetOrKeep<PublicKey>;
  verificationKey: SetOrKeep<string>;
  permissions: SetOrKeep<Permissions>;
  zkappUri: SetOrKeep<String_>;
  tokenSymbol: SetOrKeep<Field>;
  timing: SetOrKeep<Timing>;
  votingFor: SetOrKeep<Field>;
};
export const defaultTokenId = Field.one;

// TODO
class Events {
  hash: Field;
  events: Array<Array<Field>>;

  // TODO
  constructor(hash: Field, events: Array<Array<Field>>) {
    this.hash = hash;
    this.events = events;
  }
}

// TODO
class MerkleList<T> {
  constructor() {}
}

export type Precondition = undefined | UInt32 | AccountPrecondition;

/**
 * The body of describing how some [[ Party ]] should change.
 *
 * TODO: We need to rename this still.
 */
export type Body = {
  /**
   * The address for this body.
   */
  publicKey: PublicKey;

  /**
   * Specify [[ Update ]]s to tweakable pieces of the account record backing
   * this address in the ledger.
   */
  update: Update;

  /**
   * The TokenId for this account.
   */
  tokenId: Field;

  /**
   * By what [[ Int64 ]] should the balance of this account change. All
   * deltas must balance by the end of smart contract execution.
   */
  delta: Int64;

  /**
   * Recent events that have been emitted from this account.
   *
   * TODO: Add a reference to general explanation of events.
   */
  events: Events;
  sequenceEvents: Field;
  callData: MerkleList<Array<Field>>;
  depth: Field; // TODO: this is an `int As_prover.t`
  protocolState: ProtocolStatePredicate;
  accountPrecondition: Precondition;
  useFullCommitment: Bool;
  incrementNonce: Bool;
};

export let Body = {
  /**
   * A body that Don't change part of the underlying account record.
   */
  keepAll(publicKey: PublicKey): Body {
    function keep<A>(dummy: A): SetOrKeep<A> {
      return new SetOrKeep(False(), dummy);
    }

    const appState: Array<SetOrKeep<Field>> = [];

    for (let i = 0; i < ZkappStateLength; ++i) {
      appState.push(keep(Field.zero));
    }

    const update: Update = {
      appState,
      delegate: keep(new PublicKey(Group.generator)),
      verificationKey: keep(''),
      permissions: keep(Permissions.default()),
      zkappUri: keep(undefined as any),
      tokenSymbol: keep(undefined as any),
      timing: keep(undefined as any),
      votingFor: keep(Field.zero),
    };
    return {
      publicKey,
      update,
      tokenId: defaultTokenId,
      delta: Int64.zero,
      events: new Events(Field.zero, []),
      sequenceEvents: Field.zero,
      callData: new MerkleList(),
      depth: Field.zero,
      protocolState: ProtocolStatePredicate.ignoreAll(),
      accountPrecondition: AccountPrecondition.ignoreAll(),
      // the default assumption is that snarkyjs transactions don't include the fee payer
      // so useFullCommitment has to be false for signatures to be correct
      useFullCommitment: Bool(false),
      // this should be set to true if parties are signed
      incrementNonce: Bool(false),
    };
  },

  keepAllWithNonce(publicKey: PublicKey, nonce: UInt32) {
    let body = Body.keepAll(publicKey);
    body.accountPrecondition = nonce;
    return body as Body & { accountPrecondition: UInt32 };
  },

  dummy(): Body {
    return Body.keepAll(PublicKey.empty());
  },

  dummyFeePayer() {
    return Body.keepAllWithNonce(PublicKey.empty(), UInt32.zero);
  },
};

/**
 * Either check a value or ignore it.
 *
 * Used within [[ AccountPredicate ]]s and [[ ProtocolStatePredicate ]]s.
 */
export class OrIgnore<A> {
  check: Bool;
  value: A;

  constructor(check: Bool, value: A) {
    this.check = check;
    this.value = value;
  }
}

/**
 * An interval representing all the values between `lower` and `upper` inclusive
 * of both the `lower` and `upper` values.
 *
 * @typeParam A something with an ordering where one can quantify a lower and
 *            upper bound.
 */
export class ClosedInterval<A> {
  lower_: A | undefined;
  upper_: A | undefined;

  constructor(lower: A | undefined, upper: A | undefined) {
    this.lower_ = lower;
    this.upper_ = upper;
  }

  /**
   * Change this interval to have new lower and upper bounds.
   *
   * @param lower The lower part
   * @param upper The upper part
   */
  assertBetween(lower: A, upper: A) {
    this.lower = lower;
    this.upper = upper;
  }

  set lower(x: A) {
    this.lower_ = x;
  }

  get lower(): A {
    if (this.lower_ === undefined) {
      throw new Error('Cannot get lower before it was set.');
    } else {
      return this.lower_;
    }
  }

  set upper(x: A) {
    this.upper_ = x;
  }

  get upper(): A {
    if (this.upper_ === undefined) {
      throw new Error('Cannot get upper before it was set.');
    } else {
      return this.upper_;
    }
  }
}

export class EpochLedgerPredicate {
  hash_: OrIgnore<Field>;
  totalCurrency: ClosedInterval<UInt64>;

  constructor(hash_: OrIgnore<Field>, totalCurrency_: ClosedInterval<UInt64>) {
    this.hash_ = hash_;
    this.totalCurrency = totalCurrency_;
  }
}

export class EpochDataPredicate {
  ledger: EpochLedgerPredicate;
  seed_: OrIgnore<Field>;
  startCheckpoint_: OrIgnore<Field>;
  lockCheckpoint_: OrIgnore<Field>;
  epochLength: ClosedInterval<UInt32>;

  constructor(
    ledger: EpochLedgerPredicate,
    seed_: OrIgnore<Field>,
    startCheckpoint_: OrIgnore<Field>,
    lockCheckpoint_: OrIgnore<Field>,
    epochLength: ClosedInterval<UInt32>
  ) {
    this.ledger = ledger;
    this.seed_ = seed_;
    this.startCheckpoint_ = startCheckpoint_;
    this.lockCheckpoint_ = lockCheckpoint_;
    this.epochLength = epochLength;
  }

  // TODO: Should return promise
  get seed(): Field {
    if (this.seed_.value === null) {
      throw new Error('Cannot get seed before it was set.');
    } else {
      return this.seed_.value;
    }
  }

  get startCheckpoint(): Field {
    if (this.startCheckpoint_.value === null) {
      throw new Error('Cannot get startCheckpoint before it was set.');
    } else {
      return this.startCheckpoint_.value;
    }
  }

  get lockCheckpoint(): Field {
    if (this.lockCheckpoint_.value === null) {
      throw new Error('Cannot get lockCheckpoint before it was set.');
    } else {
      return this.lockCheckpoint_.value;
    }
  }
}

export class ProtocolStatePredicate {
  snarkedLedgerHash_: OrIgnore<Field>;
  snarkedNextAvailableToken: ClosedInterval<UInt64>;
  timestamp: ClosedInterval<UInt64>;
  blockchainLength: ClosedInterval<UInt32>;
  minWindowDensity: ClosedInterval<UInt32>;
  lastVrfOutput_: OrIgnore<Field>;
  totalCurrency: ClosedInterval<UInt64>;
  globalSlotSinceHardFork: ClosedInterval<UInt32>;
  globalSlotSinceGenesis: ClosedInterval<UInt32>;
  stakingEpochData: EpochDataPredicate;
  nextEpochData: EpochDataPredicate;

  static ignoreAll(): ProtocolStatePredicate {
    const ledger = new EpochLedgerPredicate(ignore(Field.zero), uint64());
    const epochData = new EpochDataPredicate(
      ledger,
      ignore(Field.zero),
      ignore(Field.zero),
      ignore(Field.zero),
      uint32()
    );
    return new ProtocolStatePredicate(
      ignore(Field.zero),
      uint64(),
      uint64(),
      uint32(),
      uint32(),
      ignore(Field.zero),
      uint64(),
      uint32(),
      uint32(),
      epochData,
      epochData
    );
  }

  constructor(
    snarkedLedgerHash_: OrIgnore<Field>,
    snarkedNextAvailableToken: ClosedInterval<UInt64>,
    timestamp: ClosedInterval<UInt64>,
    blockchainLength: ClosedInterval<UInt32>,
    minWindowDensity: ClosedInterval<UInt32>,
    lastVrfOutput_: OrIgnore<Field>,
    totalCurrency: ClosedInterval<UInt64>,
    globalSlotSinceHardFork: ClosedInterval<UInt32>,
    globalSlotSinceGenesis: ClosedInterval<UInt32>,
    stakingEpochData: EpochDataPredicate,
    nextEpochData: EpochDataPredicate
  ) {
    this.snarkedLedgerHash_ = snarkedLedgerHash_;
    this.snarkedNextAvailableToken = snarkedNextAvailableToken;
    this.timestamp = timestamp;
    this.blockchainLength = blockchainLength;
    this.minWindowDensity = minWindowDensity;
    this.lastVrfOutput_ = lastVrfOutput_;
    this.totalCurrency = totalCurrency;
    this.globalSlotSinceHardFork = globalSlotSinceHardFork;
    this.globalSlotSinceGenesis = globalSlotSinceGenesis;
    this.stakingEpochData = stakingEpochData;
    this.nextEpochData = nextEpochData;
  }

  get snarkedLedgerHash(): Field {
    this.snarkedLedgerHash_.check = Bool(true);

    if (this.snarkedLedgerHash_.value === null) {
      throw new Error('Cannot get snarkedLedgerHash before it was set.');
    } else {
      return this.snarkedLedgerHash_.value;
    }
  }

  get lastVrfOutput(): Field {
    this.lastVrfOutput_.check = Bool(true);

    if (this.lastVrfOutput_.value === null) {
      throw new Error('Cannot get lastVrfOutput before it was set.');
    } else {
      return this.lastVrfOutput_.value;
    }
  }
}

/**
 * Ignores a `dummy`
 *
 * @param dummy The value to ignore
 * @returns Always an ignored value regardless of the input.
 */
function ignore<A>(dummy: A): OrIgnore<A> {
  return new OrIgnore(Bool(false), dummy);
}
/*
function check<A>(dummy: A): OrIgnore<A> {
  return new OrIgnore(new Optional(True, dummy));
} */

/**
 * Ranges between all uint32 values
 */
const uint32 = () => new ClosedInterval(UInt32.fromNumber(0), UInt32.MAXINT());

/**
 * Ranges between all uint64 values
 */
const uint64 = () => new ClosedInterval(UInt64.fromNumber(0), UInt64.MAXINT());

export type AccountPrecondition = {
  balance: ClosedInterval<UInt64>;
  nonce: ClosedInterval<UInt32>;
  receiptChainHash: OrIgnore<Field>;
  publicKey: OrIgnore<PublicKey>;
  delegate: OrIgnore<PublicKey>;
  state: Array<OrIgnore<Field>>;
  sequenceState: OrIgnore<Field>;
  provedState: OrIgnore<Bool>;
};
export let AccountPrecondition = {
  ignoreAll(): AccountPrecondition {
    let appState: Array<OrIgnore<Field>> = [];
    for (let i = 0; i < ZkappStateLength; ++i) {
      appState.push(ignore(Field.zero));
    }
    return {
      balance: uint64(),
      nonce: uint32(),
      receiptChainHash: ignore(Field.zero),
      publicKey: ignore(new PublicKey(Group.generator)),
      delegate: ignore(new PublicKey(Group.generator)),
      state: appState,
      sequenceState: ignore(Field.zero),
      provedState: ignore(Bool(false)),
    };
  },
};

export class PartyBalance {
  private body: Body;
  constructor(body: Body) {
    this.body = body;
  }

  addInPlace(x: Int64 | UInt32 | UInt64) {
    this.body.delta = this.body.delta.add(x);
  }

  subInPlace(x: Int64 | UInt32 | UInt64) {
    this.body.delta = this.body.delta.sub(x);
  }
}

type LazyControl =
  | Control
  | { kind: 'lazy-signature'; privateKey?: PrivateKey };

export class Party {
  body: Body;
  authorization: LazyControl = { kind: 'none' };

  constructor(body: Body) {
    this.body = body;
  }

  get balance(): PartyBalance {
    return new PartyBalance(this.body);
  }

  get update(): Update {
    return this.body.update;
  }

  get publicKey(): PublicKey {
    return this.body.publicKey;
  }

  static defaultParty(address: PublicKey) {
    const body = Body.keepAll(address);
    return new Party(body) as Party & {
      body: { accountPrecondition: AccountPrecondition };
    };
  }

  static defaultFeePayer(address: PublicKey, key: PrivateKey, nonce: UInt32) {
    let body = Body.keepAllWithNonce(address, nonce);
    let party = new Party(body) as FeePayer;
    party.authorization = { kind: 'lazy-signature', privateKey: key };
    return party;
  }

  static dummyFeePayer() {
    return new Party(Body.dummyFeePayer()) as FeePayer;
  }

  static createUnsigned(publicKey: PublicKey) {
    // TODO: This should be a witness block that uses the setVariable
    // API to set the value of a variable after it's allocated

    const pk = publicKey;
    const body: Body = Body.keepAll(pk);
    if (Mina.currentTransaction === undefined) {
      throw new Error(
        'Party.createUnsigned: Cannot run outside of a transaction'
      );
    }

    const party = new Party(body);
    Mina.currentTransaction.nextPartyIndex++;
    Mina.currentTransaction.parties.push(party);
    return party;
  }

  static createSigned(
    signer: PrivateKey,
    options?: { isSameAsFeePayer?: Bool | boolean }
  ) {
    // TODO: This should be a witness block that uses the setVariable
    // API to set the value of a variable after it's allocated

    let publicKey = signer.toPublicKey();
    let body = Body.keepAll(publicKey);
    let account = Mina.getAccount(publicKey);

    if (Mina.currentTransaction === undefined) {
      throw new Error(
        'Party.createSigned: Cannot run outside of a transaction'
      );
    }

    if (account == null) {
      throw new Error('Party.createSigned: Account not found');
    }

    // if the fee payer is the same party as this one, we have to start the nonce predicate at one higher bc the fee payer already increases its nonce
    let nonceIncrease = options?.isSameAsFeePayer
      ? new UInt32(Field.one)
      : UInt32.zero;
    // now, we check how often this party already updated its nonce in this tx, and increase nonce from `getAccount` by that amount
    for (let party of Mina.currentTransaction.parties) {
      let shouldIncreaseNonce = party.publicKey
        .equals(publicKey)
        .and(party.body.incrementNonce);
      nonceIncrease.add(new UInt32(shouldIncreaseNonce.toField()));
    }
    let nonce = account.nonce.add(nonceIncrease);

    body.accountPrecondition = nonce;
    body.incrementNonce = Bool(true);

    let party = new Party(body) as Party & {
      body: { accountPrecondition: UInt32 };
    };
    party.authorization = { kind: 'lazy-signature', privateKey: signer };

    Mina.currentTransaction.nextPartyIndex++;
    Mina.currentTransaction.parties.push(party);
    return party;
  }
}

type FeePayer = Party & {
  authorization: Exclude<LazyControl, { kind: 'proof'; value: string }>;
} & {
  body: { accountPrecondition: UInt32 };
};

/**
 * Sign all parties of a transaction which belong to the account determined by [[ `privateKey` ]].
 * @returns the modified transaction JSON
 */
function signJsonTransaction(
  transactionJson: string,
  privateKey: PrivateKey | string
) {
  if (typeof privateKey === 'string')
    privateKey = PrivateKey.fromBase58(privateKey);
  let publicKey = privateKey.toPublicKey().toBase58();
  // TODO: we really need types for the parties json
  let parties = JSON.parse(transactionJson);
  let feePayer = parties.feePayer;
  if (feePayer.body.publicKey === publicKey) {
    parties = JSON.parse(
      Ledger.signFeePayer(JSON.stringify(parties), privateKey)
    );
  }
  for (let i = 0; i < parties.otherParties.length; i++) {
    let party = parties.otherParties[i];
    if (
      party.body.publicKey === publicKey &&
      party.authorization.proof === null
    ) {
      parties = JSON.parse(
        Ledger.signOtherParty(JSON.stringify(parties), privateKey, i)
      );
    }
  }
  return JSON.stringify(parties);
}
