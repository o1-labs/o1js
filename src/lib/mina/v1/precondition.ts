import { Bool, Field } from '../../provable/wrapped.js';
import { circuitValueEquals, cloneCircuitValue } from '../../provable/types/struct.js';
import { Provable } from '../../provable/provable.js';
import { activeInstance as Mina } from './mina-instance.js';
import type { AccountUpdate } from './account-update.js';
import { Int64, UInt32, UInt64 } from '../../provable/int.js';
import { Layout } from '../../../bindings/mina-transaction/gen/transaction.js';
import { jsLayout } from '../../../bindings/mina-transaction/gen/js-layout.js';
import { emptyReceiptChainHash, TokenSymbol } from '../../provable/crypto/poseidon.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import {
  ActionState,
  Actions,
  ZkappUri,
} from '../../../bindings/mina-transaction/transaction-leaves.js';
import type { Types } from '../../../bindings/mina-transaction/types.js';
import type { Permissions } from './account-update.js';
import { ZkappStateLength } from './mina-instance.js';
import { assertInternal } from '../../util/errors.js';

export {
  preconditions,
  Account,
  Network,
  CurrentSlot,
  assertPreconditionInvariants,
  cleanPreconditionsCache,
  ensureConsistentPrecondition,
  AccountValue,
  NetworkValue,
  getAccountPreconditions,
  Preconditions,
  OrIgnore,
  ClosedInterval,
};

type AccountUpdateBody = Types.AccountUpdate['body'];

/**
 * Preconditions for the network and accounts
 */
type Preconditions = AccountUpdateBody['preconditions'];

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
      ledger: { hash: ignore(Field(0)), totalCurrency: ignore(uint64()) },
      seed: ignore(Field(0)),
      startCheckpoint: ignore(Field(0)),
      lockCheckpoint: ignore(Field(0)),
      epochLength: ignore(uint32()),
    };
    let nextEpochData = cloneCircuitValue(stakingEpochData);
    return {
      snarkedLedgerHash: ignore(Field(0)),
      blockchainLength: ignore(uint32()),
      minWindowDensity: ignore(uint32()),
      totalCurrency: ignore(uint64()),
      globalSlotSinceGenesis: ignore(uint32()),
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
const uint32 = () => ({ lower: UInt32.from(0), upper: UInt32.MAXINT() });

/**
 * Ranges between all uint64 values
 */
const uint64 = () => ({ lower: UInt64.from(0), upper: UInt64.MAXINT() });

type AccountPrecondition = Preconditions['account'];
const AccountPrecondition = {
  ignoreAll(): AccountPrecondition {
    let appState: Array<OrIgnore<Field>> = [];
    for (let i = 0; i < ZkappStateLength; ++i) {
      appState.push(ignore(Field(0)));
    }
    return {
      balance: ignore(uint64()),
      nonce: ignore(uint32()),
      receiptChainHash: ignore(Field(0)),
      delegate: ignore(PublicKey.empty()),
      state: appState,
      actionState: ignore(Actions.emptyActionState()),
      provedState: ignore(Bool(false)),
      isNew: ignore(Bool(false)),
    };
  },
};

type GlobalSlotPrecondition = Preconditions['validWhile'];
const GlobalSlotPrecondition = {
  ignoreAll(): GlobalSlotPrecondition {
    return ignore(uint32());
  },
};

const Preconditions = {
  ignoreAll(): Preconditions {
    return {
      account: AccountPrecondition.ignoreAll(),
      network: NetworkPrecondition.ignoreAll(),
      validWhile: GlobalSlotPrecondition.ignoreAll(),
    };
  },
};

function preconditions(accountUpdate: AccountUpdate, isSelf: boolean) {
  initializePreconditions(accountUpdate, isSelf);
  return {
    account: Account(accountUpdate),
    network: Network(accountUpdate),
    currentSlot: CurrentSlot(accountUpdate),
  };
}

// note: please keep the two precondition implementations separate
// so we can add customized fields easily

function Network(accountUpdate: AccountUpdate): Network {
  let layout = jsLayout.AccountUpdate.entries.body.entries.preconditions.entries.network;
  let context = getPreconditionContextExn(accountUpdate);
  let network: RawNetwork = preconditionClass(layout as Layout, 'network', accountUpdate, context);
  let timestamp = {
    get() {
      let slot = network.globalSlotSinceGenesis.get();
      return globalSlotToTimestamp(slot);
    },
    getAndRequireEquals() {
      let slot = network.globalSlotSinceGenesis.getAndRequireEquals();
      return globalSlotToTimestamp(slot);
    },
    requireEquals(value: UInt64) {
      let { genesisTimestamp, slotTime } = Mina.getNetworkConstants();
      let slot = timestampToGlobalSlot(
        value,
        `Timestamp precondition unsatisfied: the timestamp can only equal numbers of the form ${genesisTimestamp} + k*${slotTime},\n` +
          `i.e., the genesis timestamp plus an integer number of slots.`
      );
      return network.globalSlotSinceGenesis.requireEquals(slot);
    },
    requireEqualsIf(condition: Bool, value: UInt64) {
      let { genesisTimestamp, slotTime } = Mina.getNetworkConstants();
      let slot = timestampToGlobalSlot(
        value,
        `Timestamp precondition unsatisfied: the timestamp can only equal numbers of the form ${genesisTimestamp} + k*${slotTime},\n` +
          `i.e., the genesis timestamp plus an integer number of slots.`
      );
      return network.globalSlotSinceGenesis.requireEqualsIf(condition, slot);
    },
    requireBetween(lower: UInt64, upper: UInt64) {
      let [slotLower, slotUpper] = timestampToGlobalSlotRange(lower, upper);
      return network.globalSlotSinceGenesis.requireBetween(slotLower, slotUpper);
    },
    requireNothing() {
      return network.globalSlotSinceGenesis.requireNothing();
    },
  };
  return { ...network, timestamp };
}

function Account(accountUpdate: AccountUpdate): Account {
  let layout = jsLayout.AccountUpdate.entries.body.entries.preconditions.entries.account;
  let context = getPreconditionContextExn(accountUpdate);
  let identity = (x: any) => x;
  let update: Update = {
    delegate: {
      ...preconditionSubclass(accountUpdate, 'account.delegate', PublicKey, context),
      ...updateSubclass(accountUpdate, 'delegate', identity),
    },
    verificationKey: updateSubclass(accountUpdate, 'verificationKey', identity),
    permissions: updateSubclass(accountUpdate, 'permissions', identity),
    zkappUri: updateSubclass(accountUpdate, 'zkappUri', ZkappUri.fromJSON),
    tokenSymbol: updateSubclass(accountUpdate, 'tokenSymbol', TokenSymbol.from),
    timing: updateSubclass(accountUpdate, 'timing', identity),
    votingFor: updateSubclass(accountUpdate, 'votingFor', identity),
  };
  return {
    ...preconditionClass(layout as Layout, 'account', accountUpdate, context),
    ...update,
  };
}

function updateSubclass<K extends keyof Update>(
  accountUpdate: AccountUpdate,
  key: K,
  transform: (value: UpdateValue[K]) => UpdateValueOriginal[K]
) {
  return {
    set(value: UpdateValue[K]) {
      accountUpdate.body.update[key].isSome = Bool(true);
      accountUpdate.body.update[key].value = transform(value);
    },
  };
}

function CurrentSlot(accountUpdate: AccountUpdate): CurrentSlot {
  let context = getPreconditionContextExn(accountUpdate);
  return {
    requireBetween(lower: UInt32, upper: UInt32) {
      context.constrained.add('validWhile');
      let property: RangeCondition<UInt32> = accountUpdate.body.preconditions.validWhile;
      ensureConsistentPrecondition(property, Bool(true), { lower, upper }, 'validWhile');
      property.isSome = Bool(true);
      property.value.lower = lower;
      property.value.upper = upper;
    },
  };
}

let unimplementedPreconditions: LongKey[] = [
  // unimplemented because its not checked in the protocol
  'network.stakingEpochData.seed',
  'network.nextEpochData.seed',
];

let baseMap = { UInt64, UInt32, Field, Bool, PublicKey, ActionState };

function getProvableType(layout: { type: string; checkedTypeName?: string }) {
  let typeName = layout.checkedTypeName ?? layout.type;
  let type = baseMap[typeName as keyof typeof baseMap];
  assertInternal(type !== undefined, `Unknown precondition base type ${typeName}`);
  return type;
}

function preconditionClass(
  layout: Layout,
  baseKey: any,
  accountUpdate: AccountUpdate,
  context: PreconditionContext
): any {
  if (layout.type === 'option') {
    // range condition
    if (layout.optionType === 'closedInterval') {
      let baseType = getProvableType(layout.inner.entries.lower);
      return preconditionSubClassWithRange(accountUpdate, baseKey, baseType, context);
    }
    // value condition
    else if (layout.optionType === 'flaggedOption') {
      let baseType = getProvableType(layout.inner);
      return preconditionSubclass(accountUpdate, baseKey, baseType, context);
    }
  } else if (layout.type === 'array') {
    return {}; // not applicable yet, TODO if we implement state
  } else if (layout.type === 'object') {
    // for each field, create a recursive object
    return Object.fromEntries(
      layout.keys.map((key) => {
        let value = layout.entries[key];
        return [key, preconditionClass(value, `${baseKey}.${key}`, accountUpdate, context)];
      })
    );
  } else throw Error('bug');
}

function preconditionSubClassWithRange<K extends LongKey, U extends FlatPreconditionValue[K]>(
  accountUpdate: AccountUpdate,
  longKey: K,
  fieldType: Provable<U>,
  context: PreconditionContext
) {
  return {
    ...preconditionSubclass(accountUpdate, longKey, fieldType as any, context),
    requireBetween(lower: any, upper: any) {
      context.constrained.add(longKey);
      let property: RangeCondition<any> = getPath(accountUpdate.body.preconditions, longKey);
      let newValue = { lower, upper };
      ensureConsistentPrecondition(property, Bool(true), newValue, longKey);
      property.isSome = Bool(true);
      property.value = newValue;
    },
  };
}

function defaultLower(fieldType: any) {
  assertInternal(fieldType === UInt32 || fieldType === UInt64);
  return (fieldType as typeof UInt32 | typeof UInt64).zero;
}
function defaultUpper(fieldType: any) {
  assertInternal(fieldType === UInt32 || fieldType === UInt64);
  return (fieldType as typeof UInt32 | typeof UInt64).MAXINT();
}

function preconditionSubclass<K extends LongKey, U extends FlatPreconditionValue[K]>(
  accountUpdate: AccountUpdate,
  longKey: K,
  fieldType: Provable<U> & { empty(): U },
  context: PreconditionContext
) {
  if (fieldType === undefined) {
    throw Error(`this.${longKey}: fieldType undefined`);
  }

  let obj = {
    get() {
      if (unimplementedPreconditions.includes(longKey)) {
        let self = context.isSelf ? 'this' : 'accountUpdate';
        throw Error(`${self}.${longKey}.get() is not implemented yet.`);
      }
      let { read, vars } = context;
      read.add(longKey);
      return (vars[longKey] ??= getVariable(accountUpdate, longKey, fieldType)) as U;
    },
    getAndRequireEquals() {
      let value = obj.get();
      obj.requireEquals(value);
      return value;
    },
    requireEquals(value: U) {
      context.constrained.add(longKey);
      let property = getPath(accountUpdate.body.preconditions, longKey) as AnyCondition<U>;
      if ('isSome' in property) {
        let isInterval = 'lower' in property.value && 'upper' in property.value;
        let newValue = isInterval ? { lower: value, upper: value } : value;
        ensureConsistentPrecondition(property, Bool(true), newValue, longKey);
        property.isSome = Bool(true);
        property.value = newValue;
      } else {
        setPath(accountUpdate.body.preconditions, longKey, value);
      }
    },
    requireEqualsIf(condition: Bool, value: U) {
      context.constrained.add(longKey);
      let property = getPath(accountUpdate.body.preconditions, longKey) as AnyCondition<U>;
      assertInternal('isSome' in property);
      if ('lower' in property.value && 'upper' in property.value) {
        let lower = Provable.if(condition, fieldType, value, defaultLower(fieldType) as U);
        let upper = Provable.if(condition, fieldType, value, defaultUpper(fieldType) as U);
        ensureConsistentPrecondition(property, condition, { lower, upper }, longKey);
        property.isSome = condition;
        property.value.lower = lower;
        property.value.upper = upper;
      } else {
        let newValue = Provable.if(condition, fieldType, value, fieldType.empty());
        ensureConsistentPrecondition(property, condition, newValue, longKey);
        property.isSome = condition;
        property.value = newValue;
      }
    },
    requireNothing() {
      let property = getPath(accountUpdate.body.preconditions, longKey) as AnyCondition<U>;
      if ('isSome' in property) {
        property.isSome = Bool(false);
        if ('lower' in property.value && 'upper' in property.value) {
          property.value.lower = defaultLower(fieldType) as U;
          property.value.upper = defaultUpper(fieldType) as U;
        } else {
          property.value = fieldType.empty();
        }
      }
      context.constrained.add(longKey);
    },
  };
  return obj;
}

function getVariable<K extends LongKey, U extends FlatPreconditionValue[K]>(
  accountUpdate: AccountUpdate,
  longKey: K,
  fieldType: Provable<U>
): U {
  return Provable.witness(fieldType, () => {
    let [accountOrNetwork, ...rest] = longKey.split('.');
    let key = rest.join('.');
    let value: U;
    if (accountOrNetwork === 'account') {
      let account = getAccountPreconditions(accountUpdate.body);
      value = account[key as keyof AccountValue] as U;
    } else if (accountOrNetwork === 'network') {
      let networkState = Mina.getNetworkState();
      value = getPath(networkState, key);
    } else if (accountOrNetwork === 'validWhile') {
      let networkState = Mina.getNetworkState();
      value = networkState.globalSlotSinceGenesis as U;
    } else {
      throw Error('impossible');
    }
    return value;
  });
}

function globalSlotToTimestamp(slot: UInt32) {
  let { genesisTimestamp, slotTime } = Mina.getNetworkConstants();
  return UInt64.from(slot).mul(slotTime).add(genesisTimestamp);
}
function timestampToGlobalSlot(timestamp: UInt64, message: string) {
  let { genesisTimestamp, slotTime } = Mina.getNetworkConstants();
  let { quotient: slot, rest } = timestamp.sub(genesisTimestamp).divMod(slotTime);
  rest.value.assertEquals(Field(0), message);
  return slot.toUInt32();
}

function timestampToGlobalSlotRange(
  tsLower: UInt64,
  tsUpper: UInt64
): [lower: UInt32, upper: UInt32] {
  // we need `slotLower <= current slot <= slotUpper` to imply `tsLower <= current timestamp <= tsUpper`
  // so we have to make the range smaller -- round up `tsLower` and round down `tsUpper`
  // also, we should clamp to the UInt32 max range [0, 2**32-1]
  let { genesisTimestamp, slotTime } = Mina.getNetworkConstants();
  let tsLowerInt = Int64.from(tsLower).sub(genesisTimestamp).add(slotTime).sub(1);
  let lowerCapped = Provable.if<UInt64>(
    tsLowerInt.isPositive(),
    UInt64,
    tsLowerInt.magnitude,
    UInt64.from(0)
  );
  let slotLower = lowerCapped.div(slotTime).toUInt32Clamped();
  // unsafe `sub` means the error in case tsUpper underflows slot 0 is ugly, but should not be relevant in practice
  let slotUpper = tsUpper.sub(genesisTimestamp).div(slotTime).toUInt32Clamped();
  return [slotLower, slotUpper];
}

function getAccountPreconditions(body: { publicKey: PublicKey; tokenId?: Field }): AccountValue {
  let { publicKey, tokenId } = body;
  let hasAccount = Mina.hasAccount(publicKey, tokenId);
  if (!hasAccount) {
    return {
      balance: UInt64.zero,
      nonce: UInt32.zero,
      receiptChainHash: emptyReceiptChainHash(),
      actionState: Actions.emptyActionState(),
      delegate: publicKey,
      provedState: Bool(false),
      isNew: Bool(true),
    };
  }
  let account = Mina.getAccount(publicKey, tokenId);
  return {
    balance: account.balance,
    nonce: account.nonce,
    receiptChainHash: account.receiptChainHash,
    actionState: account.zkapp?.actionState?.[0] ?? Actions.emptyActionState(),
    delegate: account.delegate ?? account.publicKey,
    provedState: account.zkapp?.provedState ?? Bool(false),
    isNew: Bool(false),
  };
}

// per account update context for checking invariants on precondition construction
type PreconditionContext = {
  isSelf: boolean;
  vars: Partial<FlatPreconditionValue>;
  read: Set<LongKey>;
  constrained: Set<LongKey>;
};

function initializePreconditions(accountUpdate: AccountUpdate, isSelf: boolean) {
  preconditionContexts.set(accountUpdate, {
    read: new Set(),
    constrained: new Set(),
    vars: {},
    isSelf,
  });
}

function cleanPreconditionsCache(accountUpdate: AccountUpdate) {
  let context = preconditionContexts.get(accountUpdate);
  if (context !== undefined) context.vars = {};
}

function assertPreconditionInvariants(accountUpdate: AccountUpdate) {
  let context = getPreconditionContextExn(accountUpdate);
  let self = context.isSelf ? 'this' : 'accountUpdate';
  let dummyPreconditions = Preconditions.ignoreAll();
  for (let preconditionPath of context.read) {
    // check if every precondition that was read was also constrained
    if (context.constrained.has(preconditionPath)) continue;

    // check if the precondition was modified manually, which is also a valid way of avoiding an error
    let precondition = getPath(accountUpdate.body.preconditions, preconditionPath);
    let dummy = getPath(dummyPreconditions, preconditionPath);
    if (!circuitValueEquals(precondition, dummy)) continue;

    // we accessed a precondition field but not constrained it explicitly - throw an error
    let hasRequireBetween = isRangeCondition(precondition);
    let shortPath = preconditionPath.split('.').pop();
    let errorMessage = `You used \`${self}.${preconditionPath}.get()\` without adding a precondition that links it to the actual ${shortPath}.
Consider adding this line to your code:
${self}.${preconditionPath}.requireEquals(${self}.${preconditionPath}.get());${
      hasRequireBetween
        ? `
You can also add more flexible preconditions with \`${self}.${preconditionPath}.requireBetween(...)\`.`
        : ''
    }`;
    throw Error(errorMessage);
  }
}

function getPreconditionContextExn(accountUpdate: AccountUpdate) {
  let c = preconditionContexts.get(accountUpdate);
  if (c === undefined) throw Error('bug: precondition context not found');
  return c;
}

/**
 * Asserts that a precondition is not already set or that it matches the new values.
 *
 * This function checks if a precondition is already set for a given property and compares it
 * with new values. If the precondition is not set, it allows the new values. If it's already set,
 * it ensures consistency with the existing precondition.
 *
 * @param property - The property object containing the precondition information.
 * @param newIsSome - A boolean or CircuitValue indicating whether the new precondition should exist.
 * @param value - The new value for the precondition. Can be a simple value or an object with 'lower' and 'upper' properties for range preconditions.
 * @param name - The name of the precondition for error messages.
 *
 * @throws {Error} Throws an error with a detailed message if attempting to set an inconsistent precondition.
 * @todo It would be nice to have the input parameter types more specific, but it's hard to do with the current implementation.
 */
function ensureConsistentPrecondition(property: any, newIsSome: any, value: any, name: any) {
  if (!property.isSome.isConstant() || property.isSome.toBoolean()) {
    let errorMessage = `
Precondition Error: Precondition Error: Attempting to set a precondition that is already set for '${name}'.
'${name}' represents the field or value you're trying to set a precondition for.
Preconditions must be set only once to avoid overwriting previous assertions. 
For example, do not use 'requireBetween()' or 'requireEquals()' multiple times on the same field.

Recommendation:
Ensure that preconditions for '${name}' are set in a single place and are not overwritten. If you need to update a precondition,
consider refactoring your code to consolidate all assertions for '${name}' before setting the precondition.

Example of Correct Usage:
// Incorrect Usage:
timestamp.requireBetween(newUInt32(0n), newUInt32(2n));
timestamp.requireBetween(newUInt32(1n), newUInt32(3n));

// Correct Usage:
timestamp.requireBetween(new UInt32(1n), new UInt32(2n));
`;
    property.isSome.assertEquals(newIsSome, errorMessage);
    if ('lower' in property.value && 'upper' in property.value) {
      property.value.lower.assertEquals(value.lower, errorMessage);
      property.value.upper.assertEquals(value.lower, errorMessage);
    } else {
      property.value.assertEquals(value, errorMessage);
    }
  }
}

const preconditionContexts = new WeakMap<AccountUpdate, PreconditionContext>();

// exported types

type NetworkValue = PreconditionBaseTypes<NetworkPrecondition>;
type RawNetwork = PreconditionClassType<NetworkPrecondition>;
type Network = RawNetwork & {
  timestamp: PreconditionSubclassRangeType<UInt64>;
};

// TODO: should we add account.state?
// then can just use circuitArray(Field, 8) as the type
type AccountPreconditionNoState = Omit<Preconditions['account'], 'state'>;
type AccountValue = PreconditionBaseTypes<AccountPreconditionNoState>;
type Account = PreconditionClassType<AccountPreconditionNoState> & Update;

type CurrentSlotPrecondition = Preconditions['validWhile'];
type CurrentSlot = {
  requireBetween(lower: UInt32, upper: UInt32): void;
};

type PreconditionBaseTypes<T> = {
  [K in keyof T]: T[K] extends RangeCondition<infer U>
    ? U
    : T[K] extends FlaggedOptionCondition<infer U>
    ? U
    : T[K] extends Field
    ? Field
    : PreconditionBaseTypes<T[K]>;
};

type PreconditionSubclassType<U> = {
  get(): U;
  getAndRequireEquals(): U;
  requireEquals(value: U): void;
  requireEqualsIf(condition: Bool, value: U): void;
  requireNothing(): void;
};
type PreconditionSubclassRangeType<U> = PreconditionSubclassType<U> & {
  requireBetween(lower: U, upper: U): void;
};

type PreconditionClassType<T> = {
  [K in keyof T]: T[K] extends RangeCondition<infer U>
    ? PreconditionSubclassRangeType<U>
    : T[K] extends FlaggedOptionCondition<infer U>
    ? PreconditionSubclassType<U>
    : T[K] extends Field
    ? PreconditionSubclassType<Field>
    : PreconditionClassType<T[K]>;
};

// update

type Update_ = Omit<AccountUpdate['body']['update'], 'appState'>;
type Update = {
  [K in keyof Update_]: { set(value: UpdateValue[K]): void };
};
type UpdateValueOriginal = {
  [K in keyof Update_]: Update_[K]['value'];
};
type UpdateValue = {
  [K in keyof Update_]: K extends 'zkappUri' | 'tokenSymbol'
    ? string
    : K extends 'permissions'
    ? Permissions
    : Update_[K]['value'];
};

// TS magic for computing flattened precondition types

type JoinEntries<K, P> = K extends string
  ? P extends [string, unknown, unknown]
    ? [`${K}${P[0] extends '' ? '' : '.'}${P[0]}`, P[1], P[2]]
    : never
  : never;

type PreconditionFlatEntry<T> = T extends RangeCondition<infer V>
  ? ['', T, V]
  : T extends FlaggedOptionCondition<infer U>
  ? ['', T, U]
  : { [K in keyof T]: JoinEntries<K, PreconditionFlatEntry<T[K]>> }[keyof T];

type FlatPreconditionValue = {
  [S in PreconditionFlatEntry<NetworkPrecondition> as `network.${S[0]}`]: S[2];
} & {
  [S in PreconditionFlatEntry<AccountPreconditionNoState> as `account.${S[0]}`]: S[2];
} & { validWhile: PreconditionFlatEntry<CurrentSlotPrecondition>[2] };

type LongKey = keyof FlatPreconditionValue;

// types for the two kinds of conditions
type RangeCondition<T> = { isSome: Bool; value: { lower: T; upper: T } };
type FlaggedOptionCondition<T> = { isSome: Bool; value: T };
type AnyCondition<T> = RangeCondition<T> | FlaggedOptionCondition<T>;

function isRangeCondition<T extends object>(
  condition: AnyCondition<T>
): condition is RangeCondition<T> {
  return 'isSome' in condition && 'lower' in condition.value;
}

// helper. getPath({a: {b: 'x'}}, 'a.b') === 'x'
// TODO: would be awesome to type this
function getPath(obj: any, path: string) {
  let pathArray = path.split('.').reverse();
  while (pathArray.length > 0) {
    let key = pathArray.pop();
    obj = obj[key as any];
  }
  return obj;
}
function setPath(obj: any, path: string, value: any) {
  let pathArray = path.split('.');
  let key = pathArray.pop()!;
  getPath(obj, pathArray.join('.'))[key] = value;
}
