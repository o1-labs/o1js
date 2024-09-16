import {
  AccountId,
  AccountTiming,
  GenericState,
  GenericStateConstraints,
  GenericStateUpdates,
  Option,
  State,
  ToFields,
  TokenId,
  TokenSymbol,
  Update,
  ZkappUri,
  mapUndefined
} from './core.js';
import { Permissions } from './permissions.js';
import { Preconditions } from './preconditions.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { Int64, UInt64 } from '../../provable/int.js';
import { VerificationKey } from '../../proof-system/zkprogram.js';
import { emptyHashWithPrefix, hashWithPrefix, packToFields } from '../../provable/crypto/poseidon.js';
import { PrivateKey, PublicKey } from '../../provable/crypto/signature.js';
import { Pickles } from '../../../snarky.js';
import { mocks, prefixes } from '../../../bindings/crypto/constants.js';
import * as BindingsLayout from '../../../bindings/mina-transaction/gen/js-layout-v2.js';
import { Signature, signFieldElement, zkAppBodyPrefix } from '../../../mina-signer/src/signature.js';
import { NetworkId } from '../../../mina-signer/src/types.js';

// TODO: make private abstractions over many fields (eg new apis for Update and Constraint.*)
// TODO: replay checks

// TODO: move elsewhere
export interface Hashable {
  hash(): Field;
}

// TODO: move elsewhere
export interface HashableDataConfig<Item> {
  readonly emptyPrefix: string;
  readonly consPrefix: string;
  hash(item: Item): Field;
}

export const EventsHashConfig: HashableDataConfig<ToFields | Field[]> = {
  emptyPrefix: 'MinaZkappEventsEmpty',
  consPrefix: prefixes.events,
  hash(x: ToFields): Field {
    const fields = 'toFields' in x ? x.toFields() : x;
    return hashWithPrefix(prefixes.event, fields);
  }
};

export const ActionsHashConfig: HashableDataConfig<ToFields | Field[]> = {
  emptyPrefix: 'MinaZkappActionsEmpty',
  consPrefix: prefixes.sequenceEvents,
  hash(x: ToFields | Field[]): Field {
    const fields = 'toFields' in x ? x.toFields() : x;
    return hashWithPrefix(prefixes.event, fields);
  }
};

// TODO: move elsewhere
export class CommittedList<Item extends ToFields | Field[]> {
  readonly data: Item[];
  readonly hash: Field;

  constructor({data, hash}: {
    data: Item[],
    hash: Field
  }) {
    this.data = data;
    this.hash = hash;
  }

  toInternalRepr(): { data: Field[][], hash: Field } {
    return {
      data: this.data.map((x): Field[] => 'toFields' in x ? x.toFields() : x),
      hash: this.hash
    };
  }

  static hashList<Item>(config: HashableDataConfig<Item>, items: Item[]): Field {
    let hash = emptyHashWithPrefix(config.emptyPrefix);

    for(let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      hash = hashWithPrefix(config.consPrefix, [hash, config.hash(item)]);
    }

    return hash;
  }

  static from<Item extends ToFields | Field[]>(config: HashableDataConfig<Item>, value: undefined | Item[] | CommittedList<Item>): CommittedList<Item> {
    if(value instanceof CommittedList) return value;

    const items = value ?? [];
    return new CommittedList({
      data: items,
      hash: CommittedList.hashList(config, items)
    })
  }
}

// TODO: move elsewhere
export namespace Authorization {
  export interface AccountUpdate {
    proof: string | null,
    signature: string | null,
  }

  export namespace AccountUpdate {
    export class Kind {
      isSigned: Bool;
      isProved: Bool;

      constructor({isSigned, isProved}: {
        isSigned: Bool,
        isProved: Bool
      }) {
        this.isSigned = isSigned;
        this.isProved = isProved;
      }

      identifier(): string {
        if(this.isSigned) {
          if(this.isProved) {
            return 'SignatureAndProof';
          } else {
            return 'Signature';
          }
        } else {
          if(this.isProved) {
            return 'Proof';
          } else {
            return 'None';
          }
        }
      }

      static None(): Kind {
        return new Kind({isSigned: new Bool(false), isProved: new Bool(false)});
      }

      static Signature(): Kind {
        return new Kind({isSigned: new Bool(true), isProved: new Bool(false)});
      }

      static Proof(): Kind {
        return new Kind({isSigned: new Bool(false), isProved: new Bool(true)});
      }

      static SignatureAndProof(): Kind {
        return new Kind({isSigned: new Bool(true), isProved: new Bool(true)});
      }
    }

    export class KindWithZkappContext {
      isSigned: Bool;
      isProved: Bool;
      verificationKeyHash: Field;

      constructor(kind: Kind, verificationKeyHash: Field) {
        this.isSigned = kind.isSigned;
        this.isProved = kind.isProved;
        this.verificationKeyHash = verificationKeyHash
      }

      toJSON(): any {
        BindingsLayout.AuthorizationKindStructured.toJSON(this);
      }
    }
  }

  export interface Environment {
    networkId: NetworkId,
    proof?: Pickles.Proof;
    getPrivateKey(publicKey: PublicKey): Promise<PrivateKey>;
    getTxnCallForestCommitment: () => bigint // Field;
    getTxnFullCommitment: () => bigint // Field;
  }
}

export interface MayUseToken {
  parentsOwnToken: Bool,
  inheritFromParent: Bool
};

export interface ContextFreeAccountUpdateDescription<
  SC extends State.Constraints,
  SU extends State.Updates,
  Event extends ToFields | Field[],
  Action extends ToFields | Field[]
> {
  // TODO: accept identifiers for authorization kind
  authorizationKind: Authorization.AccountUpdate.Kind;
  preconditions?: Preconditions<SC>;
  balanceChange?: Int64;
	incrementNonce?: Bool;
	useFullCommitment?: Bool;
	implicitAccountCreationFee?: Bool;
	mayUseToken?: MayUseToken;
	pushEvents?: Event[] | CommittedList<Event>;
	pushActions?: Action[] | CommittedList<Action>;
  setState?: SU;
  setPermissions?: Permissions | Update<Permissions>;
	setDelegate?: PublicKey | Update<PublicKey>;
	setVerificationKey?: VerificationKey | Update<VerificationKey>;
	setZkappUri?: string | ZkappUri | Update<ZkappUri>;
	setTokenSymbol?: string | TokenSymbol | Update<TokenSymbol>;
  setTiming?: AccountTiming | Update<AccountTiming>;
  setVotingFor?: Field | Update<Field>;
}

// in a ZkModule context: ContextFreeAccountUpdate is an AccountUpdate without an account id and call data

export class ContextFreeAccountUpdate<
  SC extends State.Constraints = GenericStateConstraints,
  SU extends State.Updates = GenericStateUpdates,
  Event extends ToFields | Field[] = Field[],
  Action extends ToFields | Field[] = Field[]
> {
  authorizationKind: Authorization.AccountUpdate.Kind;
  preconditions: Preconditions<SC>;
  balanceChange: Int64;
	incrementNonce: Bool;
	useFullCommitment: Bool;
	implicitAccountCreationFee: Bool;
	mayUseToken: MayUseToken;
	pushEvents: CommittedList<Event>;
	pushActions: CommittedList<Action>;
  // TODO: standardize on these being set* for *Update, don't do both
	stateUpdate: SU;
	permissionsUpdate: Update<Permissions>;
	delegateUpdate: Update<PublicKey>;
	verificationKeyUpdate: Update<VerificationKey>;
	zkappUriUpdate: Update<ZkappUri>;
	tokenSymbolUpdate: Update<TokenSymbol>;
  timingUpdate: Update<AccountTiming>;
  votingForUpdate: Update<Field>;

  constructor(StateDef: State.Definition<SC, SU>, descr: ContextFreeAccountUpdateDescription<SC, SU, Event, Action>) {
    function castUpdate<A, B>(value: undefined | A | Update<B>, defaultValue: B, f: (a: A) => B): Update<B> {
      if(value instanceof Update) {
        return value;
      } else {
        return Update.from(mapUndefined(value, f), defaultValue);
      }
    }

    this.authorizationKind = descr.authorizationKind;
    this.preconditions = descr.preconditions ?? Preconditions.emptyPoly(StateDef.Constraints);
    this.balanceChange = descr.balanceChange ?? new Int64(UInt64.zero);
    this.incrementNonce = descr.incrementNonce ?? new Bool(false);
    this.useFullCommitment = descr.useFullCommitment ?? new Bool(false);
    this.implicitAccountCreationFee = descr.implicitAccountCreationFee ?? new Bool(false);
    this.mayUseToken = descr.mayUseToken ?? { parentsOwnToken: new Bool(false), inheritFromParent: new Bool(false) };
    this.pushEvents = CommittedList.from<Event>(EventsHashConfig, descr.pushEvents);
    this.pushActions = CommittedList.from<Action>(ActionsHashConfig, descr.pushActions);
    this.stateUpdate = descr.setState ?? StateDef.Updates.empty();
    this.permissionsUpdate = Update.from(descr.setPermissions, Permissions.empty());
    this.delegateUpdate = Update.from(descr.setDelegate, PublicKey.empty());
    this.verificationKeyUpdate = Update.from(descr.setVerificationKey, VerificationKey.empty());
    this.zkappUriUpdate = castUpdate(descr.setZkappUri, ZkappUri.empty(), ZkappUri.from);
    this.tokenSymbolUpdate = castUpdate(descr.setTokenSymbol, TokenSymbol.empty(), TokenSymbol.from);
    this.timingUpdate = Update.from(descr.setTiming, AccountTiming.empty());
    this.votingForUpdate = Update.from(descr.setVotingFor, Field.empty());
  }

  static empty(): ContextFreeAccountUpdate {
    return new ContextFreeAccountUpdate(GenericState, {
      authorizationKind: Authorization.AccountUpdate.Kind.None()
    });
  }
}

export type AccountUpdateDescription<
  SC extends State.Constraints = GenericStateConstraints,
  SU extends State.Updates = GenericStateUpdates,
  Event extends ToFields | Field[] = Field[],
  Action extends ToFields | Field[] = Field[]
> = ({update: ContextFreeAccountUpdate<SC, SU, Event, Action>} | ContextFreeAccountUpdateDescription<SC, SU, Event, Action>) & {
  accountId: AccountId;
  verificationKeyHash: Field;
	callData: Field;
	callDepth: number;
}

export class AccountUpdate<
  SC extends State.Constraints = GenericStateConstraints,
  SU extends State.Updates = GenericStateUpdates,
  Event extends ToFields | Field[] = Field[],
  Action extends ToFields | Field[] = Field[]
> extends ContextFreeAccountUpdate<SC, SU, Event, Action> {
  accountId: AccountId;
  verificationKeyHash: Field;
	callData: Field;
  // TODO: consider hiding this, since it can't be constrained
	callDepth: number;

  constructor(StateDef: State.Definition<SC, SU>, descr: AccountUpdateDescription<SC, SU, Event, Action>) {
    const updateDescr = 'update' in descr ? descr.update : descr;
    super(StateDef, updateDescr);

    this.accountId = descr.accountId;
    this.verificationKeyHash = descr.verificationKeyHash;
    this.callData = descr.callData;
    this.callDepth = descr.callDepth;
  }

  async authorize(authEnv: Authorization.Environment): Promise<AccountUpdate.Authorized<SC, SU, Event, Action>> {
    if(this.authorizationKind.isProved.toBoolean() && authEnv.proof === undefined) {
      throw new Error(`a proof is required for authorization kind ${this.authorizationKind.identifier()}, but was not provided in the authorization environment`);
    }

    if(!this.authorizationKind.isProved.toBoolean() && authEnv.proof !== undefined) {
      console.warn(`a proof was provided for authorization, but will not be used slince the authorization kind is ${this.authorizationKind.identifier()}`);
    }

    let auth: Authorization.AccountUpdate = {
      proof: null,
      signature: null
    };

    if(this.authorizationKind.isSigned.toBoolean()) {
      const privateKey = await authEnv.getPrivateKey(this.accountId.publicKey);
      const txnCommitment = this.useFullCommitment.toBoolean() ? authEnv.getTxnFullCommitment() : authEnv.getTxnCallForestCommitment();
      const signature = signFieldElement(
        txnCommitment,
        privateKey.toBigInt(),
        authEnv.networkId
      );
      auth.signature = Signature.toBase58(signature);
    }

    if(this.authorizationKind.isProved.toBoolean()) {
      auth.proof = Pickles.proofToBase64Transaction(authEnv.proof);
    }

    return new AccountUpdate.Authorized(auth, this);
  }

  static empty(): AccountUpdate {
    return new AccountUpdate(GenericState, {
      accountId: AccountId.empty(),
      verificationKeyHash: new Field(mocks.dummyVerificationKeyHash),
      callData: Field.empty(),
      callDepth: 0,
      update: ContextFreeAccountUpdate.empty()
    });
  }
}

export namespace AccountUpdate {
  export type ContextFreeDescription<
    SC extends State.Constraints = GenericStateConstraints,
    SU extends State.Updates = GenericStateUpdates,
    Event extends ToFields | Field[] = Field[],
    Action extends ToFields | Field[] = Field[]
  > = ContextFreeAccountUpdateDescription<SC, SU, Event, Action>;
  export type ContextFree<
    SC extends State.Constraints = GenericStateConstraints,
    SU extends State.Updates = GenericStateUpdates,
    Event extends ToFields | Field[] = Field[],
    Action extends ToFields | Field[] = Field[]
  > = ContextFreeAccountUpdate<SC, SU, Event, Action>;
  export const ContextFree = ContextFreeAccountUpdate;

  // TODO: can we enforce that Authorized account updates are immutable?
  export class Authorized<
    SC extends State.Constraints = GenericStateConstraints,
    SU extends State.Updates = GenericStateUpdates,
    Event extends ToFields | Field[] = Field[],
    Action extends ToFields | Field[] = Field[]
  > {
    authorization: Authorization.AccountUpdate;
    private update: AccountUpdate<SC, SU, Event, Action>;

    constructor(authorization: Authorization.AccountUpdate, update: AccountUpdate<SC, SU, Event, Action>) {
      this.authorization = authorization;
      this.update = update;
    }

    toAccountUpdate(): AccountUpdate<SC, SU, Event, Action> {
      return this.update;
    }

    get authorizationKind(): Authorization.AccountUpdate.Kind { return this.update.authorizationKind; }
    get accountId(): AccountId { return this.update.accountId; }
    get verificationKeyHash(): Field { return this.update.verificationKeyHash; }
    get callData(): Field { return this.update.callData; }
    get callDepth(): number { return this.update.callDepth; }
    get preconditions(): Preconditions<SC> { return this.update.preconditions; }
    get balanceChange(): Int64 { return this.update.balanceChange; }
    get incrementNonce(): Bool { return this.update.incrementNonce; }
    get useFullCommitment(): Bool { return this.update.useFullCommitment; }
    get implicitAccountCreationFee(): Bool { return this.update.implicitAccountCreationFee; }
    get mayUseToken(): MayUseToken { return this.update.mayUseToken; }
    get pushEvents(): CommittedList<Event> { return this.update.pushEvents; }
    get pushActions(): CommittedList<Action> { return this.update.pushActions; }
    get stateUpdate(): SU { return this.update.stateUpdate; }
    get permissionsUpdate(): Update<Permissions> { return this.update.permissionsUpdate; }
    get delegateUpdate(): Update<PublicKey> { return this.update.delegateUpdate; }
    get verificationKeyUpdate(): Update<VerificationKey> { return this.update.verificationKeyUpdate; }
    get zkappUriUpdate(): Update<ZkappUri> { return this.update.zkappUriUpdate; }
    get tokenSymbolUpdate(): Update<TokenSymbol> { return this.update.tokenSymbolUpdate; }
    get timingUpdate(): Update<AccountTiming> { return this.update.timingUpdate; }
    get votingForUpdate(): Update<Field> { return this.update.votingForUpdate; }

    get authorizationKindWithZkappContext(): Authorization.AccountUpdate.KindWithZkappContext {
      return new Authorization.AccountUpdate.KindWithZkappContext(this.authorizationKind, this.verificationKeyHash);
    }

    // hash(netId: NetworkId): Field {
    //   let input = Types.AccountUpdate.toInput(this.toInternalRepr());
    //   return hashWithPrefix(
    //     zkAppBodyPrefix(netId),
    //     packToFields(input)
    //   );
    // }

    toInternalRepr(): BindingsLayout.ZkappAccountUpdate {
      return {
        authorization: {
          proof: this.authorization.proof === null ? undefined : this.authorization.proof,
          signature: this.authorization.signature === null ? undefined : this.authorization.signature,
        },
        body: {
          authorizationKind: this.authorizationKindWithZkappContext,
          publicKey: this.accountId.publicKey,
          tokenId: this.accountId.tokenId.toField(),
          callData: this.callData,
          callDepth: this.callDepth,
          balanceChange: this.balanceChange,
          incrementNonce: this.incrementNonce,
          useFullCommitment: this.useFullCommitment,
          implicitAccountCreationFee: this.implicitAccountCreationFee,
          mayUseToken: this.mayUseToken,
          events: this.pushEvents.toInternalRepr(),
          actions: this.pushActions.toInternalRepr(),
          preconditions: this.preconditions.toInternalRepr(),
          update: {
            appState: this.stateUpdate.toFieldUpdates().map((update) => update.toOption()),
            delegate: this.delegateUpdate.toOption(),
            verificationKey: Option.map(this.verificationKeyUpdate.toOption(), (data) => data instanceof VerificationKey ? new VerificationKey(data) : data),
            permissions: this.permissionsUpdate.toOption(),
            zkappUri: this.zkappUriUpdate.toOption(),
            tokenSymbol: this.tokenSymbolUpdate.toOption(),
            timing: this.timingUpdate.toOption(),
            votingFor: this.votingForUpdate.toOption()
          }
        }
      }
    }

    static fromInternalRepr(x: BindingsLayout.ZkappAccountUpdate): Authorized {
      return new Authorized(
        {
          proof: x.authorization.proof || null,
          signature: x.authorization.signature || null
        },
        new AccountUpdate(GenericState, {
          accountId: new AccountId(x.body.publicKey, new TokenId(x.body.tokenId)),
          verificationKeyHash: x.body.authorizationKind.verificationKeyHash,
          authorizationKind: new Authorization.AccountUpdate.Kind(x.body.authorizationKind),
          callData: x.body.callData,
          callDepth: x.body.callDepth,
          balanceChange: new Int64(x.body.balanceChange.magnitude, x.body.balanceChange.sgn),
          incrementNonce: x.body.incrementNonce,
          useFullCommitment: x.body.useFullCommitment,
          implicitAccountCreationFee: x.body.implicitAccountCreationFee,
          mayUseToken: x.body.mayUseToken,
          pushEvents: new CommittedList(x.body.events),
          pushActions: new CommittedList(x.body.actions),
          preconditions: Preconditions.fromInternalRepr(x.body.preconditions),
          setState: new GenericStateUpdates(x.body.update.appState.map(Update.fromOption)),
          setDelegate: Update.fromOption(x.body.update.delegate),
          setVerificationKey: Update.fromOption(x.body.update.verificationKey),
          setPermissions: Update.fromOption(Option.map(x.body.update.permissions, Permissions.fromInternalRepr)),
          setZkappUri: Update.fromOption(Option.map(x.body.update.zkappUri, (uri) => new ZkappUri(uri))),
          setTokenSymbol: Update.fromOption(Option.map(x.body.update.tokenSymbol, (symbol) => new TokenSymbol(symbol))),
          setTiming: Update.fromOption(Option.map(x.body.update.timing, (timing) => new AccountTiming(timing))),
          setVotingFor: Update.fromOption(x.body.update.votingFor)
        })
      );
    }

    toJSON(): any {
      return Authorized.toJSON(this);
    }

    toFields(): any {
      return Authorized.toFields(this);
    }

    static empty(): Authorized<GenericStateConstraints, GenericStateUpdates> {
      return new Authorized(
        { proof: null, signature: null },
        AccountUpdate.empty()
      );
    }

    static sizeInFields(): number {
      return BindingsLayout.ZkappAccountUpdate.sizeInFields();
    }

    static toJSON<
      SC extends State.Constraints = GenericStateConstraints,
      SU extends State.Updates = GenericStateUpdates,
      Event extends ToFields | Field[] = Field[],
      Action extends ToFields | Field[] = Field[]
    >(x: Authorized<SC, SU, Event, Action>): any {
      return BindingsLayout.ZkappAccountUpdate.toJSON(x.toInternalRepr());
    }

    static toFields<
      SC extends State.Constraints = GenericStateConstraints,
      SU extends State.Updates = GenericStateUpdates,
      Event extends ToFields | Field[] = Field[],
      Action extends ToFields | Field[] = Field[]
    >(x: Authorized<SC, SU, Event, Action>): Field[] {
      return BindingsLayout.ZkappAccountUpdate.toFields(x.toInternalRepr());
    }

    static toAuxiliary<
      SC extends State.Constraints = GenericStateConstraints,
      SU extends State.Updates = GenericStateUpdates,
      Event extends ToFields | Field[] = Field[],
      Action extends ToFields | Field[] = Field[]
    >(x?: Authorized<SC, SU, Event, Action>): any[] {
      return BindingsLayout.ZkappAccountUpdate.toAuxiliary(x?.toInternalRepr());
    }

    static fromFields(fields: Field[], aux: any[]): Authorized {
      return Authorized.fromInternalRepr(BindingsLayout.ZkappAccountUpdate.fromFields(fields, aux));
    }

    static toValue <
      SC extends State.Constraints = GenericStateConstraints,
      SU extends State.Updates = GenericStateUpdates,
      Event extends ToFields | Field[] = Field[],
      Action extends ToFields | Field[] = Field[]
    >(x: Authorized<SC, SU, Event, Action>): Authorized<SC, SU, Event, Action> {
      return x;
    }

    static fromValue <
      SC extends State.Constraints = GenericStateConstraints,
      SU extends State.Updates = GenericStateUpdates,
      Event extends ToFields | Field[] = Field[],
      Action extends ToFields | Field[] = Field[]
    >(x: Authorized<SC, SU, Event, Action>): Authorized<SC, SU, Event, Action> {
      return x;
    }

    static check<
      SC extends State.Constraints = GenericStateConstraints,
      SU extends State.Updates = GenericStateUpdates,
      Event extends ToFields | Field[] = Field[],
      Action extends ToFields | Field[] = Field[]
    >(_x: Authorized<SC, SU, Event, Action>) {
      throw new Error('TODO')
    }
  }
}
