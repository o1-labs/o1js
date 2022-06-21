import { cloneCircuitValue } from './circuit_value';
import { Field, Bool, Ledger, Circuit, Pickles, Types } from '../snarky';
import { PrivateKey, PublicKey } from './signature';
import { UInt64, UInt32, Int64 } from './int';
import * as Mina from './mina';
import { SmartContract } from './zkapp';
import { withContextAsync } from './global-context';
import * as Precondition from './precondition';

export {
  SetOrKeep,
  Permission,
  Permissions,
  Preconditions,
  Body,
  Party,
  FeePayerUnsigned,
  Parties,
  LazyProof,
  LazySignature,
  LazyControl,
  toPartyUnsafe,
  toPartiesUnsafe,
  partiesToJson,
  addMissingSignatures,
  addMissingProofs,
  signJsonTransaction,
  ZkappStateLength,
};

const ZkappStateLength = 8;

type PartyBody = Types.Party['body'];
type Update = PartyBody['update'];

/**
 * Preconditions for the network and accounts
 */
type Preconditions = PartyBody['preconditions'];

/**
 * Timing info inside an account.
 */
type Timing = Update['timing']['value'];

/**
 * Either set a value or keep it the same.
 */
type SetOrKeep<T> = { isSome: Bool; value: T };

function keep<T>(dummy: T): SetOrKeep<T> {
  return { isSome: Bool(false), value: dummy };
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
type Permission = Types.AuthRequired;
let Permission = {
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
    signatureSufficient: True(),
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

// TODO: we could replace the interface below if we could bridge annotations from OCaml
type Permissions_ = Update['permissions']['value'];

/**
 * Permissions specify how specific aspects of the zkapp account are allowed to
 * be modified. All fields are denominated by a [[ Permission ]].
 */
interface Permissions extends Permissions_ {
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
}
let Permissions = {
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
    incrementNonce: Permissions.signature(),
    setVotingFor: Permission.signature(),
  }),

  initial: (): Permissions => ({
    editState: Permission.signature(),
    send: Permission.signature(),
    receive: Permission.none(),
    setDelegate: Permission.signature(),
    setPermissions: Permission.signature(),
    setVerificationKey: Permission.signature(),
    setZkappUri: Permission.signature(),
    editSequenceState: Permission.signature(),
    setTokenSymbol: Permission.signature(),
    incrementNonce: Permissions.signature(),
    setVotingFor: Permission.signature(),
  }),
};

const getDefaultTokenId = () => Field.one;

// TODO
class Events {
  hash: Field;
  data: Field[][];

  // TODO don't hard-code, implement hashes
  static empty() {
    let emptyHash = Field(
      '23641812384071365026036270005604392899711718400522999453895455265440046333209'
    );
    return new Events(emptyHash, []);
  }
  static emptySequenceState() {
    return Field(
      '19777675955122618431670853529822242067051263606115426372178827525373304476695'
    );
  }

  constructor(hash: Field, events: Field[][]) {
    this.hash = hash;
    this.data = events;
  }
}

// TODO: get docstrings from OCaml and delete this interface
/**
 * The body of describing how some [[ Party ]] should change.
 *
 * TODO: We need to rename this still.
 */
interface Body extends PartyBody {
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
   * balanceChanges must balance by the end of smart contract execution.
   */
  balanceChange: Int64;

  /**
   * Recent events that have been emitted from this account.
   *
   * TODO: Add a reference to general explanation of events.
   */
  events: Events;
  sequenceEvents: Events;
  caller: Field;
  callData: Field; //MerkleList<Array<Field>>;
  callDepth: number; // TODO: this is an `int As_prover.t`
  preconditions: Preconditions;
  useFullCommitment: Bool;
  incrementNonce: Bool;
}
const Body = {
  noUpdate(): Update {
    return {
      appState: Array(ZkappStateLength)
        .fill(0)
        .map(() => keep(Field.zero)),
      delegate: keep(PublicKey.empty()),
      // TODO
      verificationKey: keep({ data: '', hash: Field.zero }),
      permissions: keep(Permissions.initial()),
      // TODO don't hard code
      zkappUri: keep({
        data: '',
        hash: Field(
          '22930868938364086394602058221028773520482901241511717002947639863679740444066'
        ),
      }),
      // TODO
      tokenSymbol: keep({ data: '', hash: Field.zero }),
      timing: keep<Timing>({
        cliffAmount: UInt64.zero,
        cliffTime: UInt32.zero,
        initialMinimumBalance: UInt64.zero,
        vestingIncrement: UInt64.zero,
        vestingPeriod: UInt32.zero,
      }),
      votingFor: keep(Field.zero),
    };
  },

  /**
   * A body that Don't change part of the underlying account record.
   */
  keepAll(publicKey: PublicKey): Body {
    return {
      publicKey,
      update: Body.noUpdate(),
      tokenId: getDefaultTokenId(),
      balanceChange: Int64.zero,
      events: Events.empty(),
      sequenceEvents: Events.empty(),
      caller: getDefaultTokenId(),
      callData: Field.zero, // TODO new MerkleList(),
      callDepth: 0,
      preconditions: Preconditions.ignoreAll(),
      // the default assumption is that snarkyjs transactions don't include the fee payer
      // so useFullCommitment has to be false for signatures to be correct
      useFullCommitment: Bool(false),
      // this should be set to true if parties are signed
      incrementNonce: Bool(false),
    };
  },

  dummy(): Body {
    return Body.keepAll(PublicKey.empty());
  },
};

type FeePayer = Types.Parties['feePayer'];
type FeePayerBody = FeePayer['body'];
const FeePayerBody = {
  keepAll(publicKey: PublicKey, nonce: UInt32): FeePayerBody {
    return {
      publicKey,
      nonce,
      fee: UInt64.zero,
      update: Body.noUpdate(),
      events: Events.empty(),
      sequenceEvents: Events.empty(),
      networkPrecondition: NetworkPrecondition.ignoreAll(),
    };
  },
};
type FeePayerUnsigned = {
  body: FeePayerBody;
  authorization: UnfinishedSignature | string;
};

/**
 * Either check a value or ignore it.
 *
 * Used within [[ AccountPredicate ]]s and [[ ProtocolStatePredicate ]]s.
 */
type OrIgnore<T> = { isSome: Bool; value: T };

/**
 * An interval representing all the values between `lower` and `upper` inclusive
 * of both the `lower` and `upper` values.
 *
 * @typeParam A something with an ordering where one can quantify a lower and
 *            upper bound.
 */
type ClosedInterval<T> = { lower: T; upper: T };

type NetworkPrecondition = Preconditions['network'];
let NetworkPrecondition = {
  ignoreAll(): NetworkPrecondition {
    let stakingEpochData = {
      ledger: { hash: ignore(Field.zero), totalCurrency: uint64() },
      seed: ignore(Field.zero),
      startCheckpoint: ignore(Field.zero),
      lockCheckpoint: ignore(Field.zero),
      epochLength: uint32(),
    };
    let nextEpochData = cloneCircuitValue(stakingEpochData);
    return {
      snarkedLedgerHash: ignore(Field.zero),
      timestamp: uint64(),
      blockchainLength: uint32(),
      minWindowDensity: uint32(),
      totalCurrency: uint64(),
      globalSlotSinceHardFork: uint32(),
      globalSlotSinceGenesis: uint32(),
      stakingEpochData,
      nextEpochData,
    };
  },
};

/**
 * Ignores a `dummy`
 *
 * @param dummy The value to ignore
 * @returns Always an ignored value regardless of the input.
 */
function ignore<T>(dummy: T): OrIgnore<T> {
  return { isSome: Bool(false), value: dummy };
}

/**
 * Ranges between all uint32 values
 */
const uint32 = () => ({ lower: UInt32.fromNumber(0), upper: UInt32.MAXINT() });

/**
 * Ranges between all uint64 values
 */
const uint64 = () => ({ lower: UInt64.fromNumber(0), upper: UInt64.MAXINT() });

type AccountPrecondition = Preconditions['account'];
const AccountPrecondition = {
  ignoreAll(): AccountPrecondition {
    let appState: Array<OrIgnore<Field>> = [];
    for (let i = 0; i < ZkappStateLength; ++i) {
      appState.push(ignore(Field.zero));
    }
    return {
      balance: uint64(),
      nonce: uint32(),
      receiptChainHash: ignore(Field.zero),
      delegate: ignore(PublicKey.empty()),
      state: appState,
      sequenceState: Events.emptySequenceState(),
      provedState: ignore(Bool(false)),
    };
  },
  nonce(nonce: UInt32): AccountPrecondition {
    let p = AccountPrecondition.ignoreAll();
    Party.assertEquals(p.nonce, nonce);
    return p;
  },
};

const Preconditions = {
  ignoreAll(): Preconditions {
    return {
      account: AccountPrecondition.ignoreAll(),
      network: NetworkPrecondition.ignoreAll(),
    };
  },
};

type Control = Types.Party['authorization'];

type LazySignature = { kind: 'lazy-signature'; privateKey?: PrivateKey };
type LazyProof = {
  kind: 'lazy-proof';
  method: Function;
  args: any[];
  ZkappClass: typeof SmartContract;
};

type UnfinishedSignature = undefined | LazySignature | string;

type LazyControl = Control | LazySignature | LazyProof;

class Party {
  body: Body;
  authorization: LazyControl;
  account: Precondition.Account;
  network: Precondition.Network;

  private isSelf: boolean;

  constructor(body: Body, authorization?: LazyControl);
  constructor(body: Body, authorization = {} as LazyControl, isSelf = false) {
    this.body = body;
    this.authorization = authorization;
    let { account, network } = Precondition.preconditions(this, isSelf);
    this.account = account;
    this.network = network;
    this.isSelf = isSelf;
  }

  static clone(party: Party) {
    let body = cloneCircuitValue(party.body);
    let authorization = cloneCircuitValue(party.authorization);
    return new (Party as any)(body, authorization, party.isSelf);
  }

  get balance() {
    let party = this;
    return {
      addInPlace(x: Int64 | UInt32 | UInt64 | string | number | bigint) {
        party.body.balanceChange = party.body.balanceChange.add(x);
      },
      subInPlace(x: Int64 | UInt32 | UInt64 | string | number | bigint) {
        party.body.balanceChange = party.body.balanceChange.sub(x);
      },
    };
  }

  get update(): Update {
    return this.body.update;
  }

  static setValue<T>(maybeValue: SetOrKeep<T>, value: T) {
    maybeValue.isSome = Bool(true);
    maybeValue.value = value;
  }

  /** Constrain a property to lie between lower and upper bounds.
   *
   * @param property The property to constrain
   * @param lower The lower bound
   * @param upper The upper bound
   *
   * Example: To constrain the account balance of a SmartContract to lie between 0 and 20 MINA, you can use
   *
   * ```ts
   * @method onlyRunsWhenBalanceIsLow() {
   *   let lower = UInt64.zero;
   *   let upper = UInt64.fromNumber(20e9);
   *   Party.assertBetween(this.self.body.accountPrecondition.balance, lower, upper);
   *   // ...
   * }
   * ```
   */
  static assertBetween<T>(property: ClosedInterval<T>, lower: T, upper: T) {
    property.lower = lower;
    property.upper = upper;
  }

  // TODO: assertGreaterThan, assertLowerThan?

  /** Fix a property to a certain value.
   *
   * @param property The property to constrain
   * @param value The value it is fixed to
   *
   * Example: To fix the account nonce of a SmartContract to 0, you can use
   *
   * ```ts
   * @method onlyRunsWhenNonceIsZero() {
   *   Party.assertEquals(this.self.body.accountPrecondition.nonce, UInt32.zero);
   *   // ...
   * }
   * ```
   */
  static assertEquals<T>(property: ClosedInterval<T> | OrIgnore<T>, value: T) {
    if ('isSome' in property) {
      property.isSome = Bool(true);
      property.value = value;
    } else if ('lower' in property) {
      property.lower = value;
      property.upper = value;
    } else {
      throw Error('assertEquals: Invalid argument');
    }
  }

  get publicKey(): PublicKey {
    return this.body.publicKey;
  }

  signInPlace(privateKey?: PrivateKey, fallbackToZeroNonce = false) {
    this.setNoncePrecondition(fallbackToZeroNonce);
    this.body.incrementNonce = Bool(true);
    this.authorization = { kind: 'lazy-signature', privateKey };
  }

  sign(privateKey?: PrivateKey) {
    let party = Party.clone(this);
    party.signInPlace(privateKey);
    return party;
  }

  static signFeePayerInPlace(
    feePayer: FeePayerUnsigned,
    privateKey?: PrivateKey,
    fallbackToZeroNonce = false
  ) {
    feePayer.body.nonce = this.getNonce(feePayer, fallbackToZeroNonce);
    feePayer.authorization = { kind: 'lazy-signature', privateKey };
  }

  // TODO this needs to be more intelligent about previous nonces in the transaction, similar to Party.createSigned
  static getNonce(party: Party | FeePayerUnsigned, fallbackToZero = false) {
    let nonce: UInt32;
    try {
      let inProver = Circuit.inProver();
      if (inProver || !Circuit.inCheckedComputation()) {
        let account = Mina.getAccount(party.body.publicKey);
        nonce = inProver
          ? Circuit.witness(UInt32, () => account.nonce)
          : account.nonce;
      } else {
        nonce = Circuit.witness(UInt32, () => {
          throw Error('this should never happen');
        });
      }
    } catch (err) {
      if (fallbackToZero) nonce = UInt32.zero;
      else throw err;
    }
    return nonce;
  }

  setNoncePrecondition(fallbackToZero = false) {
    let nonce = Party.getNonce(this, fallbackToZero);
    let accountPrecondition = this.body.preconditions.account;
    Party.assertEquals(accountPrecondition.nonce, nonce);
    return nonce;
  }

  toFields() {
    return Types.Party.toFields(toPartyUnsafe(this));
  }

  hash() {
    let fields = Types.Party.toFields(toPartyUnsafe(this));
    return Ledger.hashPartyFromFields(fields);
  }

  static defaultParty(address: PublicKey) {
    const body = Body.keepAll(address);
    return new Party(body);
  }

  static defaultFeePayer(
    address: PublicKey,
    key: PrivateKey,
    nonce: UInt32
  ): FeePayerUnsigned {
    let body = FeePayerBody.keepAll(address, nonce);
    return { body, authorization: { kind: 'lazy-signature', privateKey: key } };
  }

  static dummyFeePayer(): FeePayerUnsigned {
    let body = FeePayerBody.keepAll(PublicKey.empty(), UInt32.zero);
    return { body, authorization: undefined };
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
    options?: { isSameAsFeePayer?: Bool | boolean; nonce?: UInt32 }
  ) {
    let { nonce, isSameAsFeePayer } = options ?? {};
    // if not specified, optimistically determine isSameAsFeePayer from the current transaction
    // (gotcha: this makes the circuit depend on the fee payer parameter in the transaction.
    // to avoid that, provide the argument explicitly)
    let isFeePayer =
      isSameAsFeePayer !== undefined
        ? Bool(isSameAsFeePayer)
        : Mina.currentTransaction?.sender?.equals(signer) ?? Bool(false);

    // TODO: This should be a witness block that uses the setVariable
    // API to set the value of a variable after it's allocated

    let publicKey = signer.toPublicKey();
    let body = Body.keepAll(publicKey);

    // TODO: getAccount could always be used if we had a generic way to add account info prior to creating transactions
    if (nonce === undefined) {
      let account = Mina.getAccount(publicKey);
      nonce = account.nonce;
    }

    if (Mina.currentTransaction === undefined) {
      throw new Error(
        'Party.createSigned: Cannot run outside of a transaction'
      );
    }

    // if the fee payer is the same party as this one, we have to start the nonce predicate at one higher bc the fee payer already increases its nonce
    let nonceIncrement = Circuit.if(
      isFeePayer,
      new UInt32(Field.one),
      UInt32.zero
    );
    // now, we check how often this party already updated its nonce in this tx, and increase nonce from `getAccount` by that amount
    for (let party of Mina.currentTransaction.parties) {
      let shouldIncreaseNonce = party.publicKey
        .equals(publicKey)
        .and(party.body.incrementNonce);
      nonceIncrement.add(new UInt32(shouldIncreaseNonce.toField()));
    }
    nonce = nonce.add(nonceIncrement);
    Party.assertEquals(body.preconditions.account.nonce, nonce);
    body.incrementNonce = Bool(true);

    let party = new Party(body);
    party.authorization = { kind: 'lazy-signature', privateKey: signer };
    Mina.currentTransaction.nextPartyIndex++;
    Mina.currentTransaction.parties.push(party);
    return party;
  }

  /**
   * Use this method to pay the account creation fee for another account.
   * Beware that you _don't_ need to pass in the new account!
   * Instead, the protocol will automatically identify accounts in your transaction that need funding.
   *
   * If you provide an optional `initialBalance`, this will be subtracted from the fee-paying account as well,
   * but you have to separately ensure that it's added to the new account's balance.
   *
   * @param feePayerKey the private key of the account that pays the fee
   * @param initialBalance the initial balance of the new account (default: 0)
   */
  static fundNewAccount(
    feePayerKey: PrivateKey,
    {
      initialBalance = UInt64.zero as number | string | UInt64,
      isSameAsFeePayer = undefined as Bool | boolean | undefined,
    } = {}
  ) {
    let party = Party.createSigned(feePayerKey, { isSameAsFeePayer });
    let amount =
      initialBalance instanceof UInt64
        ? initialBalance
        : UInt64.fromString(`${initialBalance}`);
    party.balance.subInPlace(amount.add(Mina.accountCreationFee()));
  }
}

type Parties = {
  feePayer: FeePayerUnsigned;
  otherParties: Party[];
  memo: string;
};
type PartiesSigned = {
  feePayer: FeePayer;
  otherParties: (Party & { authorization: Control | LazyProof })[];
  memo: string;
};

// TODO: probably shouldn't hard-code dummy signature
const dummySignature =
  '7mWxjLYgbJUkZNcGouvhVj5tJ8yu9hoexb9ntvPK8t5LHqzmrL6QJjjKtf5SgmxB4QWkDw7qoMMbbNGtHVpsbJHPyTy2EzRQ';

// TODO find a better name for these to make it clearer what they do (replace any lazy authorization with no/dummy authorization)
function toFeePayerUnsafe(feePayer: FeePayerUnsigned): FeePayer {
  let { body, authorization } = feePayer;
  if (typeof authorization === 'string') return { body, authorization };
  else {
    return { body, authorization: dummySignature };
  }
}
function toPartyUnsafe({ body, authorization }: Party): Types.Party {
  return {
    body,
    authorization: 'kind' in authorization ? {} : authorization,
  };
}
function toPartiesUnsafe({
  feePayer,
  otherParties,
  memo,
}: {
  feePayer: FeePayerUnsigned;
  otherParties: Party[];
  memo: string;
}): Types.Parties {
  return {
    feePayer: toFeePayerUnsafe(feePayer),
    otherParties: otherParties.map(toPartyUnsafe),
    memo: Ledger.memoToBase58(memo),
  };
}

function partiesToJson(parties: Parties) {
  return Types.Parties.toJson(toPartiesUnsafe(parties));
}

function addMissingSignatures(
  parties: Parties,
  additionalKeys = [] as PrivateKey[]
): PartiesSigned {
  let additionalPublicKeys = additionalKeys.map((sk) => sk.toPublicKey());
  let { commitment, fullCommitment } = Ledger.transactionCommitments(
    JSON.stringify(partiesToJson(parties))
  );
  function addFeePayerSignature(party: FeePayerUnsigned): FeePayer {
    let { body, authorization } = cloneCircuitValue(party);
    if (typeof authorization === 'string') return { body, authorization };
    if (authorization === undefined)
      return { body, authorization: dummySignature };
    let { privateKey } = authorization;
    if (privateKey === undefined) {
      let i = additionalPublicKeys.findIndex(
        (pk) => pk === party.body.publicKey
      );
      if (i === -1) {
        let pk = PublicKey.toBase58(party.body.publicKey);
        throw Error(
          `addMissingSignatures: Cannot add signature for fee payer (${pk}), private key is missing.`
        );
      }
      privateKey = additionalKeys[i];
    }
    let signature = Ledger.signFieldElement(fullCommitment, privateKey);
    return { body, authorization: signature };
  }

  function addSignature(party: Party) {
    party = Party.clone(party);
    if (
      !('kind' in party.authorization) ||
      party.authorization.kind !== 'lazy-signature'
    )
      return party as Party & { authorization: Control | LazyProof };
    let { privateKey } = party.authorization;
    if (privateKey === undefined) {
      let i = additionalPublicKeys.findIndex((pk) =>
        pk.equals(party.body.publicKey)
      );
      if (i === -1)
        throw Error(
          `addMissingSignatures: Cannot add signature for ${party.publicKey.toBase58()}, private key is missing.`
        );
      privateKey = additionalKeys[i];
    }
    let transactionCommitment = party.body.useFullCommitment.toBoolean()
      ? fullCommitment
      : commitment;
    let signature = Ledger.signFieldElement(transactionCommitment, privateKey);
    party.authorization = { signature };
    return party as Party & { authorization: Control };
  }
  let { feePayer, otherParties, memo } = parties;
  return {
    feePayer: addFeePayerSignature(feePayer),
    otherParties: otherParties.map((p) => addSignature(p)),
    memo,
  };
}

type PartiesProved = {
  feePayer: FeePayerUnsigned;
  otherParties: (Party & { authorization: Control | LazySignature })[];
  memo: string;
};

async function addMissingProofs(parties: Parties): Promise<PartiesProved> {
  let partiesJson = JSON.stringify(partiesToJson(parties));

  async function addProof(party: Party, index: number) {
    party = Party.clone(party);
    if (
      !('kind' in party.authorization) ||
      party.authorization.kind !== 'lazy-proof'
    )
      return party as Party & { authorization: Control | LazySignature };
    let { method, args, ZkappClass } = party.authorization;
    let statement = Ledger.zkappPublicInput(partiesJson, index);
    if (ZkappClass._provers === undefined)
      throw Error(
        `Cannot prove execution of ${method.name}(), no prover found. ` +
          `Try calling \`await ${ZkappClass.name}.compile()\` first, this will cache provers in the background.`
      );
    let provers = ZkappClass._provers;
    let methodError =
      `Error when computing proofs: Method ${method.name} not found. ` +
      `Make sure your environment supports decorators, and annotate with \`@method ${method.name}\`.`;
    if (ZkappClass._methods === undefined) throw Error(methodError);
    let i = ZkappClass._methods.findIndex((m) => m.methodName === method.name);
    if (i === -1) throw Error(methodError);
    let [, proof] = await withContextAsync(
      {
        self: Party.defaultParty(party.body.publicKey),
        witnesses: args,
        inProver: true,
      },
      () => provers[i](statement, [])
    );
    party.authorization = { proof: Pickles.proofToString(proof) };
    return party as Party & { authorization: Control | LazySignature };
  }
  let { feePayer, otherParties, memo } = parties;
  // compute proofs serially. in parallel would clash with our global variable hacks
  let otherPartiesProved: (Party & {
    authorization: Control | LazySignature;
  })[] = [];
  for (let i = 0; i < otherParties.length; i++) {
    let partyProved = await addProof(otherParties[i], i);
    otherPartiesProved.push(partyProved);
  }
  return { feePayer, otherParties: otherPartiesProved, memo };
}

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
  let parties: Types.Json.Parties = JSON.parse(transactionJson);
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
