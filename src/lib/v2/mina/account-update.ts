import {
  AccountUpdateAuthorization,
  AccountUpdateAuthorizationEnvironment,
  AccountUpdateAuthorizationKind,
  AccountUpdateAuthorizationKindWithZkappContext
} from './authorization.js';
import {
  AccountId,
  AccountTiming,
  Option,
  TokenId,
  TokenSymbol,
  Update,
  ZkappUri,
  mapUndefined
} from './core.js';
import { Permissions, PermissionsDescription } from './permissions.js';
import { Preconditions, PreconditionsDescription } from './preconditions.js';
import { GenericStateUpdates, StateDefinition, StateLayout, StateUpdates } from './state.js';
import { Pickles } from '../../../snarky.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { Int64, UInt64 } from '../../provable/int.js';
import { VerificationKey } from '../../proof-system/zkprogram.js';
import { Poseidon, emptyHashWithPrefix, hashWithPrefix, packToFields } from '../../provable/crypto/poseidon.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { HashInput } from '../../provable/types/provable-derivers.js';
import { Provable } from '../../provable/types/provable-intf.js'
import { mocks, prefixes } from '../../../bindings/crypto/constants.js';
import * as Bindings from '../../../bindings/mina-transaction/v2/index.js';
import { Signature, signFieldElement, zkAppBodyPrefix } from '../../../mina-signer/src/signature.js';
import { NetworkId } from '../../../mina-signer/src/types.js';
import { Struct } from '../../provable/types/struct.js';

// TODO: make private abstractions over many fields (eg new apis for Update and Constraint.*)
// TODO: replay checks

export class AccountUpdateCommitment extends Struct({ accountUpdateCommitment: Field }) {
  constructor(accountUpdateCommitment: Field) {
    super({accountUpdateCommitment});
  }
}

// TODO: move elsewhere
export type DynamicProvable<T> = Provable<T> | {
  toFields(x: T): Field[];
  toAuxiliary(x: T): any[];
  fromFieldsDynamic(fields: Field[], aux: any[]): {value: T, fieldsConsumed: number};
}

// TODO: move elsewhere
export const GenericData: DynamicProvable<Field[]> = {
  toFields(x: Field[]): Field[] {
    return x;
  },

  toAuxiliary(x: Field[]): any[] {
    return [x.length];
  },

  fromFieldsDynamic(fields: Field[], aux: any[]): {value: Field[], fieldsConsumed: number} {
    const [len] = aux;
    return {value: fields.slice(0, len), fieldsConsumed: len};
  }
}

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

export function EventsHashConfig<T>(T: DynamicProvable<T>): HashableDataConfig<T> {
  return {
    emptyPrefix: 'MinaZkappEventsEmpty',
    consPrefix: prefixes.events,
    hash(x: T): Field {
      const fields = T.toFields(x);
      return hashWithPrefix(prefixes.event, fields);
    }
  };
}

export function ActionsHashConfig<T>(T: DynamicProvable<T>): HashableDataConfig<T> {
  return {
    emptyPrefix: 'MinaZkappActionsEmpty',
    consPrefix: prefixes.sequenceEvents,
    hash(x: T): Field {
      const fields = T.toFields(x);
      return hashWithPrefix(prefixes.event, fields);
    }
  };
}

// TODO: move elsewhere
export class CommittedList<Item> {
  readonly Item: DynamicProvable<Item>;
  readonly data: Item[];
  readonly hash: Field;

  constructor({Item, data, hash}: {
    Item: DynamicProvable<Item>
    data: Item[],
    hash: Field
  }) {
    this.Item = Item;
    this.data = data;
    this.hash = hash;
  }

  toInternalRepr(): { data: Field[][], hash: Field } {
    return {
      data: this.data.map(this.Item.toFields),
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

  static from<Item>(Item: DynamicProvable<Item>, config: HashableDataConfig<Item>, value: undefined | Item[] | CommittedList<Item> | Bindings.Leaves.CommittedList): CommittedList<Item> {
    if(value instanceof CommittedList) return value;

    let items: Item[];
    let hash;
    if(value === undefined) {
      items = [];
    } else if(value instanceof Array) {
      items = value;
    } else {
      // TODO: think about this a bit more... we don't have the aux data here, so we should do
      // something to restrict the types
      if('fromFields' in Item) {
        items = value.data.map((fields) => Item.fromFields(fields, []));
      } else {
        items = value.data.map((fields) => {
          const {value: result, fieldsConsumed} = Item.fromFieldsDynamic(fields, []);
          if(fieldsConsumed !== fields.length) throw new Error('expected all fields to be consumed when casting dynamic item');
          return result;
        });
      }

      hash = value.hash;
    }

    hash = hash ?? CommittedList.hashList(config, items);

    return new CommittedList({
      Item,
      data: items,
      hash: CommittedList.hashList(config, items)
    })
  }
}

export interface MayUseToken {
  parentsOwnToken: Bool,
  inheritFromParent: Bool
};

export interface ContextFreeAccountUpdateDescription<
  State extends StateLayout = 'GenericState',
  Event = Field[],
  Action = Field[]
> {
  // TODO: accept identifiers for authorization kind
  authorizationKind: AccountUpdateAuthorizationKind;
  preconditions?: PreconditionsDescription<State> | Preconditions<State>;
  balanceChange?: Int64;
	incrementNonce?: Bool;
	useFullCommitment?: Bool;
	implicitAccountCreationFee?: Bool;
	mayUseToken?: MayUseToken;
	pushEvents?: Event[] | CommittedList<Event>;
	pushActions?: Action[] | CommittedList<Action>;
  setState?: StateUpdates<State>;
  setPermissions?: PermissionsDescription | Permissions | Update<Permissions>;
	setDelegate?: PublicKey | Update<PublicKey>;
	setVerificationKey?: VerificationKey | Update<VerificationKey>;
	setZkappUri?: string | ZkappUri | Update<ZkappUri>;
	setTokenSymbol?: string | TokenSymbol | Update<TokenSymbol>;
  setTiming?: AccountTiming | Update<AccountTiming>;
  setVotingFor?: Field | Update<Field>;
}

// in a ZkModule context: ContextFreeAccountUpdate is an AccountUpdate without an account id and call data

export class ContextFreeAccountUpdate<
  State extends StateLayout = 'GenericState',
  Event = Field[],
  Action = Field[]
> {
  readonly State: StateDefinition<State>;
  authorizationKind: AccountUpdateAuthorizationKind;
  preconditions: Preconditions<State>;
  balanceChange: Int64;
	incrementNonce: Bool;
	useFullCommitment: Bool;
	implicitAccountCreationFee: Bool;
	mayUseToken: MayUseToken;
	pushEvents: CommittedList<Event>;
	pushActions: CommittedList<Action>;
  // TODO: standardize on these being set* for *Update, don't do both
	stateUpdates: StateUpdates<State>;
	permissionsUpdate: Update<Permissions>;
	delegateUpdate: Update<PublicKey>;
	verificationKeyUpdate: Update<VerificationKey>;
	zkappUriUpdate: Update<ZkappUri>;
	tokenSymbolUpdate: Update<TokenSymbol>;
  timingUpdate: Update<AccountTiming>;
  votingForUpdate: Update<Field>;

  constructor(
    State: StateDefinition<State>,
    Event: DynamicProvable<Event>,
    Action: DynamicProvable<Action>,
    descr: ContextFreeAccountUpdateDescription<State, Event, Action>
  ) {
    function castUpdate<A, B>(value: undefined | A | Update<B>, defaultValue: B, f: (a: A) => B): Update<B> {
      if(value instanceof Update) {
        return value;
      } else {
        return Update.from(mapUndefined(value, f), defaultValue);
      }
    }

    this.State = State;
    this.authorizationKind = descr.authorizationKind;
    this.preconditions = mapUndefined(descr.preconditions, (x) => Preconditions.from(State, x)) ?? Preconditions.emptyPoly(State);
    this.balanceChange = descr.balanceChange ?? new Int64(UInt64.zero);
    this.incrementNonce = descr.incrementNonce ?? new Bool(false);
    this.useFullCommitment = descr.useFullCommitment ?? new Bool(false);
    this.implicitAccountCreationFee = descr.implicitAccountCreationFee ?? new Bool(false);
    this.mayUseToken = descr.mayUseToken ?? { parentsOwnToken: new Bool(false), inheritFromParent: new Bool(false) };
    this.pushEvents = CommittedList.from(Event, EventsHashConfig(Event), descr.pushEvents);
    this.pushActions = CommittedList.from(Action, ActionsHashConfig(Action), descr.pushActions);
    this.stateUpdates = descr.setState ?? StateUpdates.empty(State);
    this.permissionsUpdate = castUpdate(descr.setPermissions, Permissions.empty(), Permissions.from);
    this.delegateUpdate = Update.from(descr.setDelegate, PublicKey.empty());
    this.verificationKeyUpdate = Update.from(descr.setVerificationKey, VerificationKey.empty());
    this.zkappUriUpdate = castUpdate(descr.setZkappUri, ZkappUri.empty(), ZkappUri.from);
    this.tokenSymbolUpdate = castUpdate(descr.setTokenSymbol, TokenSymbol.empty(), TokenSymbol.from);
    this.timingUpdate = Update.from(descr.setTiming, AccountTiming.empty());
    this.votingForUpdate = Update.from(descr.setVotingFor, Field.empty());
  }

  static generic(descr: ContextFreeAccountUpdateDescription): ContextFreeAccountUpdate {
    return new ContextFreeAccountUpdate('GenericState', GenericData, GenericData, descr);
  }

  static emptyPoly<
    State extends StateLayout,
    Event,
    Action
  >(
    State: StateDefinition<State>,
    Event: DynamicProvable<Event>,
    Action: DynamicProvable<Action>
  ) {
    return new ContextFreeAccountUpdate(State, Event, Action, {
      authorizationKind: AccountUpdateAuthorizationKind.None()
    });
  }

  static empty(): ContextFreeAccountUpdate {
    return ContextFreeAccountUpdate.emptyPoly('GenericState', GenericData, GenericData);
  }

  static from<
    State extends StateLayout = 'GenericState',
    Event = Field[],
    Action = Field[]
  >(
    State: StateDefinition<State>,
    Event: DynamicProvable<Event>,
    Action: DynamicProvable<Action>,
    x: ContextFreeAccountUpdateDescription<State, Event, Action> | ContextFreeAccountUpdate<State, Event, Action> | undefined
  ): ContextFreeAccountUpdate<State, Event, Action>
  {
    if(x instanceof ContextFreeAccountUpdate) return x;
    if(x === undefined) return ContextFreeAccountUpdate.emptyPoly(State, Event, Action);
    return new ContextFreeAccountUpdate(State, Event, Action, x);
  }
}

export type AccountUpdateDescription<
  State extends StateLayout,
  Event = Field[],
  Action = Field[]
> = ({update: ContextFreeAccountUpdate<State, Event, Action>} | ContextFreeAccountUpdateDescription<State, Event, Action>) & {
  accountId: AccountId;
  verificationKeyHash: Field;
	callData: Field;
}

export class AccountUpdate<
  State extends StateLayout = 'GenericState',
  Event = Field[],
  Action = Field[]
> extends ContextFreeAccountUpdate<State, Event, Action> {
  accountId: AccountId;
  verificationKeyHash: Field;
	callData: Field;

  constructor(
    State: StateDefinition<State>,
    Event: DynamicProvable<Event>,
    Action: DynamicProvable<Action>,
    descr: AccountUpdateDescription<State, Event, Action>
  ) {
    const updateDescr = 'update' in descr ? descr.update : descr;
    super(State, Event, Action, updateDescr);

    this.accountId = descr.accountId;
    this.verificationKeyHash = descr.verificationKeyHash;
    this.callData = descr.callData;
  }

  get authorizationKindWithZkappContext(): AccountUpdateAuthorizationKindWithZkappContext {
    return new AccountUpdateAuthorizationKindWithZkappContext(this.authorizationKind, this.verificationKeyHash);
  }

  toInternalRepr(callDepth: number): Bindings.Layout.AccountUpdateBody {
    return {
      authorizationKind: this.authorizationKindWithZkappContext,
      publicKey: this.accountId.publicKey,
      tokenId: this.accountId.tokenId.value,
      callData: this.callData,
      callDepth: callDepth,
      balanceChange: this.balanceChange,
      incrementNonce: this.incrementNonce,
      useFullCommitment: this.useFullCommitment,
      implicitAccountCreationFee: this.implicitAccountCreationFee,
      mayUseToken: this.mayUseToken,
      events: this.pushEvents.toInternalRepr(),
      actions: this.pushActions.toInternalRepr(),
      preconditions: this.preconditions.toInternalRepr(),
      update: {
        appState: StateUpdates.toFieldUpdates(this.State, this.stateUpdates).map((update) => update.toOption()),
        delegate: this.delegateUpdate.toOption(),
        verificationKey: Option.map(this.verificationKeyUpdate.toOption(), (data) => data instanceof VerificationKey ? new VerificationKey(data) : data),
        permissions: this.permissionsUpdate.toOption(),
        zkappUri: this.zkappUriUpdate.toOption(),
        tokenSymbol: this.tokenSymbolUpdate.toOption(),
        timing: this.timingUpdate.toOption(),
        votingFor: this.votingForUpdate.toOption()
      }
    };
  }

  toInput(): HashInput {
    return Bindings.Layout.AccountUpdateBody.toInput(this.toInternalRepr(0));
  }

  commit(): AccountUpdateCommitment {
    const commitment = Poseidon.hash(packToFields(this.toInput()));
    // TODO NOW: should this go here or only in the tree?
    // hashWithPrefix(zkAppBodyPrefix(networkId), fields)
    return new AccountUpdateCommitment(commitment);
  }

  async authorize(authEnv: AccountUpdateAuthorizationEnvironment): Promise<AccountUpdate.Authorized<State, Event, Action>> {
    if(this.authorizationKind.isProved.toBoolean() && authEnv.proof === undefined) {
      throw new Error(`a proof is required for authorization kind ${this.authorizationKind.identifier()}, but was not provided in the authorization environment`);
    }

    if(!this.authorizationKind.isProved.toBoolean() && authEnv.proof !== undefined) {
      console.warn(`a proof was provided for authorization, but will not be used since the authorization kind is ${this.authorizationKind.identifier()}`);
    }

    let auth: AccountUpdateAuthorization = {
      proof: null,
      signature: null
    };

    if(this.authorizationKind.isSigned.toBoolean()) {
      let txnCommitment;
      if(this.useFullCommitment.toBoolean()) {
        if(authEnv.fullTransactionCommitment === undefined) {
          throw new Error('unable to authorize account update: useFullCommitment is true, but not full transaction commitment was provided in authorization environment');
        }
        txnCommitment = authEnv.fullTransactionCommitment;
      } else {
        txnCommitment = authEnv.accountUpdateForestCommitment;
      }

      const privateKey = await authEnv.getPrivateKey(this.accountId.publicKey);

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
    return new AccountUpdate('GenericState', GenericData, GenericData, {
      accountId: AccountId.empty(),
      verificationKeyHash: new Field(mocks.dummyVerificationKeyHash),
      callData: Field.empty(),
      update: ContextFreeAccountUpdate.empty()
    });
  }
}

// TODO NOW: un-namespace this
export namespace AccountUpdate {
  export type ContextFreeDescription<
    State extends StateLayout = 'GenericState',
    Event = Field[],
    Action = Field[]
  > = ContextFreeAccountUpdateDescription<State, Event, Action>;
  export type ContextFree<
    State extends StateLayout = 'GenericState',
    Event = Field[],
    Action = Field[]
  > = ContextFreeAccountUpdate<State, Event, Action>;
  export const ContextFree = ContextFreeAccountUpdate;

  // TODO: can we enforce that Authorized account updates are immutable?
  export class Authorized<
    State extends StateLayout = 'GenericState',
    Event = Field[],
    Action = Field[]
  > {
    authorization: AccountUpdateAuthorization;
    private update: AccountUpdate<State, Event, Action>;

    constructor(authorization: AccountUpdateAuthorization, update: AccountUpdate<State, Event, Action>) {
      this.authorization = authorization;
      this.update = update;
    }

    toAccountUpdate(): AccountUpdate<State, Event, Action> {
      return this.update;
    }

    get State(): StateDefinition<State> { return this.update.State; }
    get authorizationKind(): AccountUpdateAuthorizationKind { return this.update.authorizationKind; }
    get accountId(): AccountId { return this.update.accountId; }
    get verificationKeyHash(): Field { return this.update.verificationKeyHash; }
    get callData(): Field { return this.update.callData; }
    get preconditions(): Preconditions<State> { return this.update.preconditions; }
    get balanceChange(): Int64 { return this.update.balanceChange; }
    get incrementNonce(): Bool { return this.update.incrementNonce; }
    get useFullCommitment(): Bool { return this.update.useFullCommitment; }
    get implicitAccountCreationFee(): Bool { return this.update.implicitAccountCreationFee; }
    get mayUseToken(): MayUseToken { return this.update.mayUseToken; }
    get pushEvents(): CommittedList<Event> { return this.update.pushEvents; }
    get pushActions(): CommittedList<Action> { return this.update.pushActions; }
    get stateUpdates(): StateUpdates<State> { return this.update.stateUpdates; }
    get permissionsUpdate(): Update<Permissions> { return this.update.permissionsUpdate; }
    get delegateUpdate(): Update<PublicKey> { return this.update.delegateUpdate; }
    get verificationKeyUpdate(): Update<VerificationKey> { return this.update.verificationKeyUpdate; }
    get zkappUriUpdate(): Update<ZkappUri> { return this.update.zkappUriUpdate; }
    get tokenSymbolUpdate(): Update<TokenSymbol> { return this.update.tokenSymbolUpdate; }
    get timingUpdate(): Update<AccountTiming> { return this.update.timingUpdate; }
    get votingForUpdate(): Update<Field> { return this.update.votingForUpdate; }
    get authorizationKindWithZkappContext(): AccountUpdateAuthorizationKindWithZkappContext { return this.update.authorizationKindWithZkappContext; }

    hash(netId: NetworkId): Field {
      let input = Bindings.Layout.ZkappAccountUpdate.toInput(this.toInternalRepr(0));
      return hashWithPrefix(
        zkAppBodyPrefix(netId),
        packToFields(input)
      );
    }

    toInternalRepr(callDepth: number): Bindings.Layout.ZkappAccountUpdate {
      return {
        authorization: {
          proof: this.authorization.proof === null ? undefined : this.authorization.proof,
          signature: this.authorization.signature === null ? undefined : this.authorization.signature,
        },
        body: this.update.toInternalRepr(callDepth)
      }
    }

    static fromInternalRepr(x: Bindings.Layout.ZkappAccountUpdate): Authorized {
      return new Authorized(
        {
          // when the internal representation is returned from the previous version when casting from fields,
          // (if there is no proof or authorization, values are set to false rather than to undefined)
          proof: x.authorization.proof as any !== false ? x.authorization.proof ?? null : null,
          signature: x.authorization.proof as any !== false ? x.authorization.signature ?? null : null
        },
        new AccountUpdate('GenericState', GenericData, GenericData, {
          accountId: new AccountId(x.body.publicKey, new TokenId(x.body.tokenId)),
          verificationKeyHash: x.body.authorizationKind.verificationKeyHash,
          authorizationKind: new AccountUpdateAuthorizationKind(x.body.authorizationKind),
          callData: x.body.callData,
          balanceChange: new Int64(x.body.balanceChange.magnitude, x.body.balanceChange.sgn),
          incrementNonce: x.body.incrementNonce,
          useFullCommitment: x.body.useFullCommitment,
          implicitAccountCreationFee: x.body.implicitAccountCreationFee,
          mayUseToken: x.body.mayUseToken,
          pushEvents: CommittedList.from(GenericData, EventsHashConfig(GenericData), x.body.events),
          pushActions: CommittedList.from(GenericData, ActionsHashConfig(GenericData), x.body.actions),
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

    toJSON(callDepth: number): any {
      return Authorized.toJSON(this, callDepth);
    }

    toInput(): HashInput {
      return Authorized.toInput(this);
    }

    toFields(): Field[] {
      return Authorized.toFields(this);
    }

    static empty(): Authorized {
      return new Authorized(
        { proof: null, signature: null },
        AccountUpdate.empty()
      );
    }

    static sizeInFields(): number {
      return Bindings.Layout.ZkappAccountUpdate.sizeInFields();
    }

    static toJSON<
      State extends StateLayout = 'GenericState',
      Event = Field[],
      Action = Field[]
    >(x: Authorized<State, Event, Action>, callDepth: number): any {
      return Bindings.Layout.ZkappAccountUpdate.toJSON(x.toInternalRepr(callDepth));
    }

    static toInput<
      State extends StateLayout = 'GenericState',
      Event = Field[],
      Action = Field[]
    >(x: Authorized<State, Event, Action>): HashInput {
      return Bindings.Layout.ZkappAccountUpdate.toInput(x.toInternalRepr(0));
    }

    static toFields<
      State extends StateLayout = 'GenericState',
      Event = Field[],
      Action = Field[]
    >(x: Authorized<State, Event, Action>): Field[] {
      return Bindings.Layout.ZkappAccountUpdate.toFields(x.toInternalRepr(0));
    }

    static toAuxiliary<
      State extends StateLayout = 'GenericState',
      Event = Field[],
      Action = Field[]
    >(x?: Authorized<State, Event, Action>): any[] {
      return Bindings.Layout.ZkappAccountUpdate.toAuxiliary(x?.toInternalRepr(0));
    }

    static fromFields(fields: Field[], aux: any[]): Authorized {
      return Authorized.fromInternalRepr(Bindings.Layout.ZkappAccountUpdate.fromFields(fields, aux));
    }

    static toValue<
      State extends StateLayout = 'GenericState',
      Event = Field[],
      Action = Field[]
    >(x: Authorized<State, Event, Action>): Authorized<State, Event, Action> {
      return x;
    }

    static fromValue<
      State extends StateLayout = 'GenericState',
      Event = Field[],
      Action = Field[]
    >(x: Authorized<State, Event, Action>): Authorized<State, Event, Action> {
      return x;
    }

    static check<
      State extends StateLayout = 'GenericState',
      Event = Field[],
      Action = Field[]
    >(_x: Authorized<State, Event, Action>) {
      throw new Error('TODO')
    }
  }
}
