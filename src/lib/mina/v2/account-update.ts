import { AccountId, AccountTiming } from './account.js';
import {
  AccountUpdateAuthorization,
  AccountUpdateAuthorizationEnvironment,
  AccountUpdateAuthorizationKind,
  AccountUpdateAuthorizationKindIdentifier,
  AccountUpdateAuthorizationKindWithZkappContext,
} from './authorization.js';
import { Option, TokenId, Update, ZkappUri, mapUndefined } from './core.js';
import { Permissions, PermissionsDescription } from './permissions.js';
import { Preconditions, PreconditionsDescription } from './preconditions.js';
import { GenericStateUpdates, StateDefinition, StateLayout, StateUpdates } from './state.js';
import { Pickles } from '../../../snarky.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { Int64, UInt64 } from '../../provable/int.js';
import { Proof } from '../../proof-system/zkprogram.js';
import {
  emptyHashWithPrefix,
  hashWithPrefix,
  packToFields,
  TokenSymbol,
} from '../../provable/crypto/poseidon.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { HashInput } from '../../provable/types/provable-derivers.js';
import { Provable } from '../../provable/types/provable-intf.js';
import { mocks, prefixes } from '../../../bindings/crypto/constants.js';
import * as Bindings from '../../../bindings/mina-transaction/v2/index.js';
import * as PoseidonBigint from '../../../mina-signer/src/poseidon-bigint.js';
import {
  Signature,
  signFieldElement,
  zkAppBodyPrefix,
} from '../../../mina-signer/src/signature.js';
import { NetworkId } from '../../../mina-signer/src/types.js';
import { Struct } from '../../provable/types/struct.js';
import { VerificationKey } from '../../../lib/proof-system/verification-key.js';

// TODO: make private abstractions over many fields (eg new apis for Update and Constraint.*)
// TODO: replay checks
// TODO: make private abstractions over many fields (eg new apis for Update and Constraint.*)
// TODO: replay checks
export { AccountUpdate, Authorized, GenericData, AccountUpdateTree };
class AccountUpdateCommitment extends Struct({
  accountUpdateCommitment: Field,
}) {
  constructor(accountUpdateCommitment: Field) {
    super({ accountUpdateCommitment });
  }
}

// TODO: move elsewhere
type DynamicProvable<T> =
  | Provable<T>
  | {
      toFields(x: T): Field[];
      toAuxiliary(x: T): any[];
      fromFieldsDynamic(fields: Field[], aux: any[]): { value: T; fieldsConsumed: number };
    };

// TODO: move elsewhere
const GenericData: DynamicProvable<Field[]> = {
  toFields(x: Field[]): Field[] {
    return x;
  },

  toAuxiliary(x: Field[]): any[] {
    return [x.length];
  },

  fromFieldsDynamic(fields: Field[], aux: any[]): { value: Field[]; fieldsConsumed: number } {
    const [len] = aux;
    return { value: fields.slice(0, len), fieldsConsumed: len };
  },
};

// TODO: move elsewhere
interface Hashable {
  hash(): Field;
}

// TODO: move elsewhere
interface HashableDataConfig<Item> {
  readonly emptyPrefix: string;
  readonly consPrefix: string;
  hash(item: Item): Field;
}

function EventsHashConfig<T>(T: DynamicProvable<T>): HashableDataConfig<T> {
  return {
    emptyPrefix: 'MinaZkappEventsEmpty',
    consPrefix: prefixes.events,
    hash(x: T): Field {
      const fields = T.toFields(x);
      return hashWithPrefix(prefixes.event, fields);
    },
  };
}

function ActionsHashConfig<T>(T: DynamicProvable<T>): HashableDataConfig<T> {
  return {
    emptyPrefix: 'MinaZkappActionsEmpty',
    consPrefix: prefixes.sequenceEvents,
    hash(x: T): Field {
      const fields = T.toFields(x);
      return hashWithPrefix(prefixes.event, fields);
    },
  };
}

// TODO: move elsewhere
class CommittedList<Item> {
  readonly Item: DynamicProvable<Item>;
  readonly data: Item[];
  readonly hash: Field;

  constructor({ Item, data, hash }: { Item: DynamicProvable<Item>; data: Item[]; hash: Field }) {
    this.Item = Item;
    this.data = data;
    this.hash = hash;
  }

  toInternalRepr(): { data: Field[][]; hash: Field } {
    return {
      data: this.data.map(this.Item.toFields),
      hash: this.hash,
    };
  }

  // IMPORTANT: It is the callers responsibility to ensure the commitment will compute the same
  //            after mapping the list (this function does not check this for you at runtime).
  mapUnsafe<B>(NewItem: DynamicProvable<B>, f: (a: Item) => B): CommittedList<B> {
    return new CommittedList({
      Item: NewItem,
      data: this.data.map(f),
      hash: this.hash,
    });
  }

  static hashList<Item>(config: HashableDataConfig<Item>, items: Item[]): Field {
    let hash = emptyHashWithPrefix(config.emptyPrefix);

    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      hash = hashWithPrefix(config.consPrefix, [hash, config.hash(item)]);
    }

    return hash;
  }

  static from<Item>(
    Item: DynamicProvable<Item>,
    config: HashableDataConfig<Item>,
    value: undefined | Item[] | CommittedList<Item> | Bindings.Leaves.CommittedList
  ): CommittedList<Item> {
    if (value instanceof CommittedList) return value;

    let items: Item[];
    let hash = new Field(0);
    if (value === undefined) {
      items = [];
    } else if (value instanceof Array) {
      items = value;
    } else {
      // TODO: think about this a bit more... we don't have the aux data here, so we should do
      // something to restrict the types
      if ('fromFields' in Item) {
        items = value.data.map((fields) => Item.fromFields(fields, []));
      } else {
        items = value.data.map((fields) => {
          const { value: result, fieldsConsumed } = Item.fromFieldsDynamic(fields, []);
          if (fieldsConsumed !== fields.length)
            throw new Error('expected all fields to be consumed when casting dynamic item');
          return result;
        });
      }

      hash = value.hash;
    }

    hash = hash ?? CommittedList.hashList(config, items);

    return new CommittedList({
      Item,
      data: items,
      hash: CommittedList.hashList(config, items),
    });
  }
}

interface MayUseToken {
  parentsOwnToken: Bool;
  inheritFromParent: Bool;
}

type AccountUpdateTreeDescription<RootDescription, Child> = RootDescription & {
  // TODO: support using commitments?
  children?: AccountUpdateTree<Child>[];
};

// TODO: CONSIDER -- merge this logic into AccountUpdate
//  class AccountUpdateTree<AccountUpdateType> {
class AccountUpdateTree<Root, Child = Root> {
  constructor(public rootAccountUpdate: Root, public children: AccountUpdateTree<Child, Child>[]) {}

  // depth first traversal (parents before children)
  static forEachNode<T>(
    tree: AccountUpdateTree<T>,
    depth: number,
    f: (accountUpdate: T, depth: number) => void
  ): void {
    f(tree.rootAccountUpdate, depth);
    tree.children.forEach((child) => AccountUpdateTree.forEachNode(child, depth + 1, f));
  }

  // inverted depth first traversal (children before parents)
  static forEachNodeInverted<T>(
    tree: AccountUpdateTree<T>,
    depth: number,
    f: (accountUpdate: T, depth: number) => void
  ): void {
    tree.children.forEach((child) => AccountUpdateTree.forEachNodeInverted(child, depth + 1, f));
    f(tree.rootAccountUpdate, depth);
  }

  static reduce<T, R>(tree: AccountUpdateTree<T>, f: (accountUpdate: T, childValues: R[]) => R): R {
    const childValues = tree.children.map((child) => AccountUpdateTree.reduce(child, f));
    return f(tree.rootAccountUpdate, childValues);
  }

  // TODO: delete (realized I didn't need it part way through writing)
  // // build context as we descend the tree, map, then reduce as we ascend
  // static mapReduceWithContext<T, Ctx, R>(
  //   tree: AccountUpdateTree<T>,
  //   context: Ctx,
  //   mapContext: (ctx: Ctx, index: number) => Ctx,
  //   map: (ctx: Ctx, accountUpdate: T) => R,
  //   reduce: (values: R[]) => R
  // ): R {
  //   if(tree.children.length === 0) {
  //     return map(context, tree.rootAccountUpdate);
  //   } else {
  //     const reducedValues = tree.children.map((child, index) =>
  //       AccountUpdateTree.mapReduceWithContext(
  //         child,
  //         mapContext(context, index),
  //         mapContext,
  //         map,
  //         reduce
  //       );
  //     );
  //     return reduce(reducedValues);
  //   }
  // }

  // TODO: refactor the type parameter interfaces

  static mapRoot<RootIn, RootOut, Child>(
    tree: AccountUpdateTree<RootIn, Child>,
    f: (accountUpdate: RootIn) => RootOut
  ): AccountUpdateTree<RootOut, Child> {
    const newAccountUpdate = f(tree.rootAccountUpdate);
    return new AccountUpdateTree(newAccountUpdate, tree.children);
  }

  static async map<A, B>(
    tree: AccountUpdateTree<A>,
    f: (accountUpdate: A) => Promise<B>
  ): Promise<AccountUpdateTree<B>> {
    const newAccountUpdate = await f(tree.rootAccountUpdate);
    const newChildren = await AccountUpdateTree.mapForest(tree.children, f);
    return new AccountUpdateTree(newAccountUpdate, newChildren);
  }

  static mapForest<A, B>(
    forest: AccountUpdateTree<A>[],
    f: (a: A) => Promise<B>
  ): Promise<AccountUpdateTree<B>[]> {
    return Promise.all(forest.map((tree) => AccountUpdateTree.map(tree, f)));
  }

  // TODO: I think this can be safely made polymorphic over the account update state, actions, and events representations
  // TODO: Field, not bigint
  static hash(tree: AccountUpdateTree<AccountUpdate>, networkId: NetworkId): bigint {
    // TODO: is it ok to do this and ignore the toValue encodings entirely?
    const accountUpdateFieldInput = tree.rootAccountUpdate.toInput();
    const accountUpdateBigintInput = {
      fields: accountUpdateFieldInput.fields?.map((f: Field) => f.toBigInt()),
      packed: accountUpdateFieldInput.packed?.map(([f, n]: [Field, number]): [bigint, number] => [
        f.toBigInt(),
        n,
      ]),
    };

    // TODO: negotiate between this implementation and AccountUpdate#hash to figure out what is correct
    // TODO NOW: ^ this was done, but we need to update this function to share code still
    const accountUpdateCommitment = PoseidonBigint.hashWithPrefix(
      zkAppBodyPrefix(networkId),
      PoseidonBigint.packToFields(accountUpdateBigintInput)
    );
    const childrenCommitment = AccountUpdateTree.hashForest(networkId, tree.children);
    return PoseidonBigint.hashWithPrefix(prefixes.accountUpdateNode, [
      accountUpdateCommitment,
      childrenCommitment,
    ]);
  }

  // TODO: Field, not bigint
  static hashForest(networkId: NetworkId, forest: AccountUpdateTree<AccountUpdate>[]): bigint {
    const consHash = (acc: bigint, tree: AccountUpdateTree<AccountUpdate>) =>
      PoseidonBigint.hashWithPrefix(prefixes.accountUpdateCons, [
        AccountUpdateTree.hash(tree, networkId),
        acc,
      ]);
    return [...forest].reverse().reduce(consHash, 0n);
  }

  static unrollForest<AccountUpdateType, Return>(
    forest: AccountUpdateTree<AccountUpdateType>[],
    f: (accountUpdate: AccountUpdateType, depth: number) => Return
  ): Return[] {
    const seq: Return[] = [];
    forest.forEach((tree) =>
      AccountUpdateTree.forEachNode(tree, 0, (accountUpdate, depth) =>
        seq.push(f(accountUpdate, depth))
      )
    );
    return seq;
  }

  static sizeInFields(): number {
    return AccountUpdate.sizeInFields();
  }

  static toFields(x: AccountUpdateTree<AccountUpdate>): Field[] {
    return AccountUpdate.toFields(x.rootAccountUpdate);
  }

  static toAuxiliary(x?: AccountUpdateTree<AccountUpdate>): any[] {
    return [AccountUpdate.toAuxiliary(x?.rootAccountUpdate), x?.children ?? []];
  }

  static fromFields(fields: Field[], aux: any[]): AccountUpdateTree<AccountUpdate> {
    return new AccountUpdateTree(AccountUpdate.fromFields(fields, aux[0]), aux[1]);
  }

  static toValue(x: AccountUpdateTree<AccountUpdate>): AccountUpdateTree<AccountUpdate> {
    return x;
  }

  static fromValue(x: AccountUpdateTree<AccountUpdate>): AccountUpdateTree<AccountUpdate> {
    return x;
  }

  static check(_x: AccountUpdateTree<AccountUpdate>): void {
    // TODO
  }

  static from<RootDescription, Root, Child>(
    descr: AccountUpdateTreeDescription<RootDescription, Child>,
    createAccountUpdate: (descr: RootDescription) => Root
  ): AccountUpdateTree<Root, Child> {
    return new AccountUpdateTree(createAccountUpdate(descr), descr.children ?? []);
  }
}

interface ContextFreeAccountUpdateDescription<
  State extends StateLayout = 'GenericState',
  Event = Field[],
  Action = Field[]
> {
  // TODO: accept identifiers for authorization kind
  authorizationKind: AccountUpdateAuthorizationKindIdentifier | AccountUpdateAuthorizationKind;
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

class ContextFreeAccountUpdate<
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
    descr:
      | ContextFreeAccountUpdateDescription<State, Event, Action>
      | ContextFreeAccountUpdate<State, Event, Action>
  ) {
    function castUpdate<A, B>(
      value: undefined | A | Update<B>,
      defaultValue: B,
      f: (a: A) => B
    ): Update<B> {
      if (value instanceof Update) {
        return value;
      } else {
        return Update.from(mapUndefined(value, f), defaultValue);
      }
    }

    this.State = State;
    this.authorizationKind = AccountUpdateAuthorizationKind.from(descr.authorizationKind);
    this.preconditions =
      mapUndefined(descr.preconditions, (x) => Preconditions.from(State, x)) ??
      Preconditions.emptyPoly(State);
    this.balanceChange = descr.balanceChange ?? Int64.create(UInt64.zero);
    this.incrementNonce = descr.incrementNonce ?? new Bool(false);
    this.useFullCommitment = descr.useFullCommitment ?? new Bool(false);
    this.implicitAccountCreationFee = descr.implicitAccountCreationFee ?? new Bool(false);
    this.mayUseToken = descr.mayUseToken ?? {
      parentsOwnToken: new Bool(false),
      inheritFromParent: new Bool(false),
    };
    this.pushEvents = CommittedList.from(Event, EventsHashConfig(Event), descr.pushEvents);
    this.pushActions = CommittedList.from(Action, ActionsHashConfig(Action), descr.pushActions);

    if (descr instanceof ContextFreeAccountUpdate) {
      this.stateUpdates = descr.stateUpdates;
      this.permissionsUpdate = descr.permissionsUpdate;
      this.delegateUpdate = descr.delegateUpdate;
      this.verificationKeyUpdate = descr.verificationKeyUpdate;
      this.zkappUriUpdate = descr.zkappUriUpdate;
      this.tokenSymbolUpdate = descr.tokenSymbolUpdate;
      this.timingUpdate = descr.timingUpdate;
      this.votingForUpdate = descr.votingForUpdate;
    } else {
      this.stateUpdates = descr.setState ?? StateUpdates.empty(State);
      this.permissionsUpdate = castUpdate(
        descr.setPermissions,
        Permissions.empty(),
        Permissions.from
      );
      this.delegateUpdate = Update.from(descr.setDelegate, PublicKey.empty());
      this.verificationKeyUpdate = Update.from(descr.setVerificationKey, VerificationKey.empty());
      this.zkappUriUpdate = castUpdate(descr.setZkappUri, ZkappUri.empty(), ZkappUri.from);
      this.tokenSymbolUpdate = castUpdate(
        descr.setTokenSymbol,
        TokenSymbol.empty(),
        TokenSymbol.from
      );
      this.timingUpdate = Update.from(descr.setTiming, AccountTiming.empty());
      this.votingForUpdate = Update.from(descr.setVotingFor, Field.empty());
    }
  }

  toGeneric(): ContextFreeAccountUpdate {
    return ContextFreeAccountUpdate.generic({
      authorizationKind: this.authorizationKind,
      preconditions: this.preconditions.toGeneric(),
      balanceChange: this.balanceChange,
      incrementNonce: this.incrementNonce,
      useFullCommitment: this.useFullCommitment,
      implicitAccountCreationFee: this.implicitAccountCreationFee,
      mayUseToken: this.mayUseToken,
      pushEvents: this.pushEvents.mapUnsafe(GenericData, this.pushEvents.Item.toFields),
      pushActions: this.pushActions.mapUnsafe(GenericData, this.pushActions.Item.toFields),
      setState: StateUpdates.toGeneric(this.State, this.stateUpdates),
      setPermissions: this.permissionsUpdate,
      setDelegate: this.delegateUpdate,
      setVerificationKey: this.verificationKeyUpdate,
      setZkappUri: this.zkappUriUpdate,
      setTokenSymbol: this.tokenSymbolUpdate,
      setTiming: this.timingUpdate,
      setVotingFor: this.votingForUpdate,
    });
  }

  static fromGeneric<State extends StateLayout, Event, Action>(
    x: ContextFreeAccountUpdate,
    State: StateDefinition<State>,
    Event: DynamicProvable<Event>,
    Action: DynamicProvable<Action>
  ): ContextFreeAccountUpdate<State, Event, Action> {
    // TODO: this method is broken because we aren't storing aux data in the generic format...
    return new ContextFreeAccountUpdate(State, Event, Action, {
      authorizationKind: x.authorizationKind,
      preconditions: Preconditions.fromGeneric(x.preconditions, State),
      balanceChange: x.balanceChange,
      incrementNonce: x.incrementNonce,
      useFullCommitment: x.useFullCommitment,
      implicitAccountCreationFee: x.implicitAccountCreationFee,
      mayUseToken: x.mayUseToken,
      pushEvents: x.pushEvents.mapUnsafe(Event, (fields) =>
        // TODO: this is really unsafe, make it safe
        'fromFieldsDynamic' in Event
          ? Event.fromFieldsDynamic(fields, []).value
          : Event.fromFields(fields, [])
      ),
      pushActions: x.pushActions.mapUnsafe(Action, (fields) =>
        // TODO: this is really unsafe, make it safe
        'fromFieldsDynamic' in Action
          ? Action.fromFieldsDynamic(fields, []).value
          : Action.fromFields(fields, [])
      ),
      setState: StateUpdates.fromGeneric(x.stateUpdates, State),
      setPermissions: x.permissionsUpdate,
      setDelegate: x.delegateUpdate,
      setVerificationKey: x.verificationKeyUpdate,
      setZkappUri: x.zkappUriUpdate,
      setTokenSymbol: x.tokenSymbolUpdate,
      setTiming: x.timingUpdate,
      setVotingFor: x.votingForUpdate,
    });
  }

  static generic(descr: ContextFreeAccountUpdateDescription): ContextFreeAccountUpdate {
    return new ContextFreeAccountUpdate('GenericState', GenericData, GenericData, descr);
  }

  static emptyPoly<State extends StateLayout, Event, Action>(
    State: StateDefinition<State>,
    Event: DynamicProvable<Event>,
    Action: DynamicProvable<Action>
  ) {
    return new ContextFreeAccountUpdate(State, Event, Action, {
      authorizationKind: AccountUpdateAuthorizationKind.None(),
    });
  }

  static empty(): ContextFreeAccountUpdate {
    return ContextFreeAccountUpdate.emptyPoly('GenericState', GenericData, GenericData);
  }

  static from<State extends StateLayout = 'GenericState', Event = Field[], Action = Field[]>(
    State: StateDefinition<State>,
    Event: DynamicProvable<Event>,
    Action: DynamicProvable<Action>,
    x:
      | ContextFreeAccountUpdateDescription<State, Event, Action>
      | ContextFreeAccountUpdate<State, Event, Action>
      | undefined
  ): ContextFreeAccountUpdate<State, Event, Action> {
    if (x instanceof ContextFreeAccountUpdate) return x;
    if (x === undefined) return ContextFreeAccountUpdate.emptyPoly(State, Event, Action);
    return new ContextFreeAccountUpdate(State, Event, Action, x);
  }
}

type AccountUpdateDescription<State extends StateLayout, Event = Field[], Action = Field[]> = (
  | {
      update: ContextFreeAccountUpdate<State, Event, Action>;
      proof?: Proof<undefined, AccountUpdateCommitment>;
    }
  | ContextFreeAccountUpdateDescription<State, Event, Action>
) & {
  accountId: AccountId;
  verificationKeyHash?: Field;
  callData?: Field;
};

class AccountUpdate<
  State extends StateLayout = 'GenericState',
  Event = Field[],
  Action = Field[]
> extends ContextFreeAccountUpdate<State, Event, Action> {
  accountId: AccountId;
  verificationKeyHash: Field;
  callData: Field;

  // TODO: this probable shouldn't live here, but somewhere else
  proof: 'NoProofRequired' | 'ProofPending' | Proof<undefined, AccountUpdateCommitment>;
  // TODO: circuit friendly representation (we really don't want to toBoolean() in the constructor here...)
  // proof: {pending: true, isRequired: Bool} | Proof<undefined, AccountUpdateCommitment>;

  constructor(
    State: StateDefinition<State>,
    Event: DynamicProvable<Event>,
    Action: DynamicProvable<Action>,
    descr: AccountUpdateDescription<State, Event, Action>
  ) {
    // TODO NOW: THIS PATTERN IS BROKEN (we are casting and update into a description, which only works because the missing fields are all optional)

    const superInput = 'update' in descr ? descr.update : descr;
    super(State, Event, Action, superInput);

    if (this.authorizationKind.isProved.toBoolean()) {
      this.proof = 'proof' in descr && descr.proof !== undefined ? descr.proof : 'ProofPending';
    } else {
      if ('proof' in descr && descr.proof !== undefined) {
        throw new Error(
          'proof was provided when constructing an AccountUpdate that does not require a proof'
        );
      }
      this.proof = 'NoProofRequired';
    }

    this.accountId = descr.accountId;
    this.verificationKeyHash =
      descr.verificationKeyHash ?? new Field(mocks.dummyVerificationKeyHash);
    this.callData = descr.callData ?? new Field(0);
  }

  get authorizationKindWithZkappContext(): AccountUpdateAuthorizationKindWithZkappContext {
    return new AccountUpdateAuthorizationKindWithZkappContext(
      this.authorizationKind,
      this.verificationKeyHash
    );
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
        appState: StateUpdates.toFieldUpdates(this.State, this.stateUpdates).map((update) =>
          update.toOption()
        ),
        delegate: this.delegateUpdate.toOption(),
        verificationKey: Option.map(this.verificationKeyUpdate.toOption(), (data) =>
          data instanceof VerificationKey ? new VerificationKey(data) : data
        ),
        permissions: this.permissionsUpdate.toOption(),
        zkappUri: this.zkappUriUpdate.toOption(),
        tokenSymbol: this.tokenSymbolUpdate.toOption(),
        timing: this.timingUpdate.toOption(),
        votingFor: this.votingForUpdate.toOption(),
      },
    };
  }

  toInput(): HashInput {
    return Bindings.Layout.AccountUpdateBody.toInput(this.toInternalRepr(0));
  }

  commit(networkId: NetworkId): AccountUpdateCommitment {
    const commitment = hashWithPrefix(zkAppBodyPrefix(networkId), packToFields(this.toInput()));
    return new AccountUpdateCommitment(commitment);
  }

  toGeneric(): AccountUpdate {
    return new AccountUpdate('GenericState', GenericData, GenericData, {
      update: super.toGeneric(),
      proof: this.proof instanceof Proof ? this.proof : undefined,
      accountId: this.accountId,
      verificationKeyHash: this.verificationKeyHash,
      callData: this.callData,
    });
  }

  static fromGeneric<State extends StateLayout, Event, Action>(
    x: AccountUpdate,
    State: StateDefinition<State>,
    Event: DynamicProvable<Event>,
    Action: DynamicProvable<Action>
  ): AccountUpdate<State, Event, Action> {
    return new AccountUpdate(State, Event, Action, {
      update: ContextFreeAccountUpdate.fromGeneric(x, State, Event, Action),
      proof: x.proof instanceof Proof ? x.proof : undefined,
      accountId: x.accountId,
      verificationKeyHash: x.verificationKeyHash,
      callData: x.callData,
    });
  }

  async authorize(
    authEnv: AccountUpdateAuthorizationEnvironment
  ): Promise<Authorized<State, Event, Action>> {
    let proof = null;
    let signature = null;

    switch (this.proof) {
      case 'NoProofRequired':
        if (this.authorizationKind.isProved.toBoolean()) {
          throw new Error(
            `account update proof was marked as not required, but authorization kind was ${this.authorizationKind.identifier()}`
          );
        } else {
          break;
        }
      case 'ProofPending':
        if (this.authorizationKind.isProved.toBoolean()) {
          throw new Error(
            `account update proof is still pending; a proof must be generated and assigned to an account update before calling authorize`
          );
        } else {
          console.warn(
            `account update is marked to required a proof, but the authorization kind is ${this.authorizationKind.identifier()} (and the proof is still pending)`
          );
          break;
        }
      default:
        if (this.authorizationKind.isProved.toBoolean()) {
          proof = Pickles.proofToBase64Transaction(this.proof.proof);
        } else {
          console.warn(
            `account update has a proof, but no proof is required by authorization kind ${this.authorizationKind.identifier()}, so it will not be included`
          );
        }
    }

    if (this.authorizationKind.isSigned.toBoolean()) {
      let txnCommitment;
      if (this.useFullCommitment.toBoolean()) {
        if (authEnv.fullTransactionCommitment === undefined) {
          throw new Error(
            'unable to authorize account update: useFullCommitment is true, but not full transaction commitment was provided in authorization environment'
          );
        }
        txnCommitment = authEnv.fullTransactionCommitment;
      } else {
        txnCommitment = authEnv.accountUpdateForestCommitment;
      }

      const privateKey = await authEnv.getPrivateKey(this.accountId.publicKey);

      const sig = signFieldElement(txnCommitment, privateKey.toBigInt(), authEnv.networkId);
      signature = Signature.toBase58(sig);
    }

    return new Authorized({ proof, signature }, this);
  }

  static create(x: AccountUpdateDescription<'GenericState', Field[], Field[]>): AccountUpdate {
    return new AccountUpdate('GenericState', GenericData, GenericData, x);
  }

  static fromInternalRepr(x: Bindings.Layout.AccountUpdateBody): AccountUpdate {
    return new AccountUpdate('GenericState', GenericData, GenericData, {
      accountId: new AccountId(x.publicKey, new TokenId(x.tokenId)),
      verificationKeyHash: x.authorizationKind.verificationKeyHash,
      authorizationKind: new AccountUpdateAuthorizationKind(x.authorizationKind),
      callData: x.callData,
      balanceChange: Int64.create(x.balanceChange.magnitude, x.balanceChange.sgn),
      incrementNonce: x.incrementNonce,
      useFullCommitment: x.useFullCommitment,
      implicitAccountCreationFee: x.implicitAccountCreationFee,
      mayUseToken: x.mayUseToken,
      pushEvents: CommittedList.from(GenericData, EventsHashConfig(GenericData), x.events),
      pushActions: CommittedList.from(GenericData, ActionsHashConfig(GenericData), x.actions),
      preconditions: Preconditions.fromInternalRepr(x.preconditions),
      setState: new GenericStateUpdates(x.update.appState.map(Update.fromOption)),
      setDelegate: Update.fromOption(x.update.delegate),
      setVerificationKey: Update.fromOption(x.update.verificationKey),
      setPermissions: Update.fromOption(
        Option.map(x.update.permissions, Permissions.fromInternalRepr)
      ),
      setZkappUri: Update.fromOption(Option.map(x.update.zkappUri, (uri) => new ZkappUri(uri))),
      setTokenSymbol: Update.fromOption(
        Option.map(x.update.tokenSymbol, (symbol) => new TokenSymbol(symbol))
      ),
      setTiming: Update.fromOption(
        Option.map(x.update.timing, (timing) => new AccountTiming(timing))
      ),
      setVotingFor: Update.fromOption(x.update.votingFor),
    });
  }

  static sizeInFields(): number {
    return Bindings.Layout.AccountUpdateBody.sizeInFields();
  }

  static toFields(x: AccountUpdate): Field[] {
    return Bindings.Layout.AccountUpdateBody.toFields(x.toInternalRepr(0));
  }

  static toAuxiliary(x?: AccountUpdate): any[] {
    return Bindings.Layout.AccountUpdateBody.toAuxiliary(x?.toInternalRepr(0));
  }

  static fromFields(fields: Field[], aux: any[]): AccountUpdate {
    return AccountUpdate.fromInternalRepr(
      Bindings.Layout.AccountUpdateBody.fromFields(fields, aux)
    );
  }

  static toValue(x: AccountUpdate): AccountUpdate {
    return x;
  }

  static fromValue(x: AccountUpdate): AccountUpdate {
    return x;
  }

  static check(_x: AccountUpdate): void {
    // TODO
  }

  static empty(): AccountUpdate {
    return new AccountUpdate('GenericState', GenericData, GenericData, {
      accountId: AccountId.empty(),
      callData: Field.empty(),
      update: ContextFreeAccountUpdate.empty(),
    });
  }
}

// TODO NOW: un-namespace this

/*
type ContextFreeDescription<
  State extends StateLayout = 'GenericState',
  Event = Field[],
  Action = Field[]
> = ContextFreeAccountUpdateDescription<State, Event, Action>;
type ContextFree<
  State extends StateLayout = 'GenericState',
  Event = Field[],
  Action = Field[]
> = ContextFreeAccountUpdate<State, Event, Action>;
const ContextFree = ContextFreeAccountUpdate;
*/
// TODO: can we enforce that Authorized account updates are immutable?
class Authorized<State extends StateLayout = 'GenericState', Event = Field[], Action = Field[]> {
  authorization: AccountUpdateAuthorization;
  private update: AccountUpdate<State, Event, Action>;

  constructor(
    authorization: AccountUpdateAuthorization,
    update: AccountUpdate<State, Event, Action>
  ) {
    this.authorization = authorization;
    this.update = update;
  }

  toAccountUpdate(): AccountUpdate<State, Event, Action> {
    return this.update;
  }

  get State(): StateDefinition<State> {
    return this.update.State;
  }
  get authorizationKind(): AccountUpdateAuthorizationKind {
    return this.update.authorizationKind;
  }
  get accountId(): AccountId {
    return this.update.accountId;
  }
  get verificationKeyHash(): Field {
    return this.update.verificationKeyHash;
  }
  get callData(): Field {
    return this.update.callData;
  }
  get preconditions(): Preconditions<State> {
    return this.update.preconditions;
  }
  get balanceChange(): Int64 {
    return this.update.balanceChange;
  }
  get incrementNonce(): Bool {
    return this.update.incrementNonce;
  }
  get useFullCommitment(): Bool {
    return this.update.useFullCommitment;
  }
  get implicitAccountCreationFee(): Bool {
    return this.update.implicitAccountCreationFee;
  }
  get mayUseToken(): MayUseToken {
    return this.update.mayUseToken;
  }
  get pushEvents(): CommittedList<Event> {
    return this.update.pushEvents;
  }
  get pushActions(): CommittedList<Action> {
    return this.update.pushActions;
  }
  get stateUpdates(): StateUpdates<State> {
    return this.update.stateUpdates;
  }
  get permissionsUpdate(): Update<Permissions> {
    return this.update.permissionsUpdate;
  }
  get delegateUpdate(): Update<PublicKey> {
    return this.update.delegateUpdate;
  }
  get verificationKeyUpdate(): Update<VerificationKey> {
    return this.update.verificationKeyUpdate;
  }
  get zkappUriUpdate(): Update<ZkappUri> {
    return this.update.zkappUriUpdate;
  }
  get tokenSymbolUpdate(): Update<TokenSymbol> {
    return this.update.tokenSymbolUpdate;
  }
  get timingUpdate(): Update<AccountTiming> {
    return this.update.timingUpdate;
  }
  get votingForUpdate(): Update<Field> {
    return this.update.votingForUpdate;
  }
  get authorizationKindWithZkappContext(): AccountUpdateAuthorizationKindWithZkappContext {
    return this.update.authorizationKindWithZkappContext;
  }

  hash(netId: NetworkId): Field {
    let input = Bindings.Layout.ZkappAccountUpdate.toInput(this.toInternalRepr(0));
    return hashWithPrefix(zkAppBodyPrefix(netId), packToFields(input));
  }

  toInternalRepr(callDepth: number): Bindings.Layout.ZkappAccountUpdate {
    return {
      authorization: {
        proof: this.authorization.proof === null ? undefined : this.authorization.proof,
        signature: this.authorization.signature === null ? undefined : this.authorization.signature,
      },
      body: this.update.toInternalRepr(callDepth),
    };
  }

  static fromInternalRepr(x: Bindings.Layout.ZkappAccountUpdate): Authorized {
    return new Authorized(
      {
        // when the internal representation is returned from the previous version when casting from fields,
        // (if there is no proof or authorization, values are set to false rather than to undefined)
        proof: (x.authorization.proof as any) !== false ? x.authorization.proof ?? null : null,
        signature:
          (x.authorization.proof as any) !== false ? x.authorization.signature ?? null : null,
      },
      AccountUpdate.fromInternalRepr(x.body)
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
    return new Authorized({ proof: null, signature: null }, AccountUpdate.empty());
  }

  static sizeInFields(): number {
    return Bindings.Layout.ZkappAccountUpdate.sizeInFields();
  }

  static toJSON<State extends StateLayout = 'GenericState', Event = Field[], Action = Field[]>(
    x: Authorized<State, Event, Action>,
    callDepth: number
  ): any {
    return Bindings.Layout.ZkappAccountUpdate.toJSON(x.toInternalRepr(callDepth));
  }

  static toInput<State extends StateLayout = 'GenericState', Event = Field[], Action = Field[]>(
    x: Authorized<State, Event, Action>
  ): HashInput {
    return Bindings.Layout.ZkappAccountUpdate.toInput(x.toInternalRepr(0));
  }

  static toFields<State extends StateLayout = 'GenericState', Event = Field[], Action = Field[]>(
    x: Authorized<State, Event, Action>
  ): Field[] {
    return Bindings.Layout.ZkappAccountUpdate.toFields(x.toInternalRepr(0));
  }

  static toAuxiliary<State extends StateLayout = 'GenericState', Event = Field[], Action = Field[]>(
    x?: Authorized<State, Event, Action>
  ): any[] {
    return Bindings.Layout.ZkappAccountUpdate.toAuxiliary(x?.toInternalRepr(0));
  }

  static fromFields(fields: Field[], aux: any[]): Authorized {
    return Authorized.fromInternalRepr(Bindings.Layout.ZkappAccountUpdate.fromFields(fields, aux));
  }

  static toValue<State extends StateLayout = 'GenericState', Event = Field[], Action = Field[]>(
    x: Authorized<State, Event, Action>
  ): Authorized<State, Event, Action> {
    return x;
  }

  static fromValue<State extends StateLayout = 'GenericState', Event = Field[], Action = Field[]>(
    x: Authorized<State, Event, Action>
  ): Authorized<State, Event, Action> {
    return x;
  }

  static check<State extends StateLayout = 'GenericState', Event = Field[], Action = Field[]>(
    _x: Authorized<State, Event, Action>
  ) {
    throw new Error('TODO');
  }
}
