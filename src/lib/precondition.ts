import { Circuit, AsFieldElements, Bool, Field } from '../snarky';
import { circuitValueEquals } from './circuit_value';
import * as Mina from './mina';
import { Events, Party, Preconditions } from './party';
import { UInt32, UInt64 } from './int';
import { inAnalyze, inCompile, inProver } from './proof_system';
import { Layout } from 'snarky/parties-helpers';
import { jsLayout } from '../snarky/types';
import { emptyReceiptChainHash } from './hash';

export {
  preconditions,
  Account,
  Network,
  assertPreconditionInvariants,
  cleanPreconditionsCache,
  AccountValue,
  NetworkValue,
};

function preconditions(party: Party, isSelf: boolean) {
  initializePreconditions(party, isSelf);
  return { account: Account(party), network: Network(party) };
}

// note: please keep the two precondition implementations separate
// so we can add customized fields easily

function Network(party: Party): Network {
  let layout =
    jsLayout.Party.entries.body.entries.preconditions.entries.network;
  let context = getPreconditionContextExn(party);
  return preconditionClass(layout as Layout, 'network', party, context);
}

function Account(party: Party): Account {
  let layout =
    jsLayout.Party.entries.body.entries.preconditions.entries.account;
  let context = getPreconditionContextExn(party);
  return preconditionClass(layout as Layout, 'account', party, context);
}

let unimplementedPreconditions: LongKey[] = [
  // unimplemented because its not checked in the protocol
  'network.stakingEpochData.seed',
  'network.nextEpochData.seed',
  // this is partially unimplemented because the field is missing on the account endpoint
  // but with the local ledger it works!
  'account.provedState',
];

type BaseType = 'UInt64' | 'UInt32' | 'Field' | 'Bool';
let baseMap = { UInt64, UInt32, Field, Bool };

function preconditionClass(
  layout: Layout,
  baseKey: any,
  party: Party,
  context: PreconditionContext
): any {
  if (layout.type === 'option') {
    if (
      layout.optionType === 'flaggedOption' &&
      layout.inner.type === 'object' &&
      layout.inner.keys.join(',') === 'lower,upper'
    ) {
      let lower = layout.inner.entries.lower.type as BaseType;
      let baseType = baseMap[lower];
      return {
        ...preconditionSubclass(party, baseKey, baseType as any, context),
        assertBetween(lower: any, upper: any) {
          context.constrained.add(baseKey);
          let property: RangeCondition<any> = getPath(
            party.body.preconditions,
            baseKey
          );
          property.isSome = Bool(true);
          property.value.lower = lower;
          property.value.upper = upper;
        },
      };
    }
    // value condition
    else if (layout.optionType === 'flaggedOption') {
      let baseType = baseMap[layout.inner.type as BaseType];
      return preconditionSubclass(party, baseKey, baseType as any, context);
    }
  } else if (layout.type === 'array') {
    return {}; // not applicable yet, TODO if we implement state
  } else if (layout.type === 'object') {
    // for each field, create a recursive object
    return Object.fromEntries(
      layout.keys.map((key) => {
        let value = layout.entries[key];
        return [
          key,
          preconditionClass(value, `${baseKey}.${key}`, party, context),
        ];
      })
    );
  } else throw Error('bug');
}

function preconditionSubclass<
  K extends LongKey,
  U extends FlatPreconditionValue[K]
>(
  party: Party,
  longKey: K,
  fieldType: AsFieldElements<U>,
  context: PreconditionContext
) {
  return {
    get() {
      if (unimplementedPreconditions.includes(longKey)) {
        let self = context.isSelf ? 'this' : 'party';
        throw Error(`${self}.${longKey}.get() is not implemented yet.`);
      }
      let { read, vars } = context;
      read.add(longKey);
      return (vars[longKey] ??= getVariable(party, longKey, fieldType)) as U;
    },
    assertEquals(value: U) {
      context.constrained.add(longKey);
      let property = getPath(
        party.body.preconditions,
        longKey
      ) as AnyCondition<U>;
      if ('isSome' in property) {
        property.isSome = Bool(true);
        if ('lower' in property.value && 'upper' in property.value) {
          property.value.lower = value;
          property.value.upper = value;
        } else {
          property.value = value;
        }
      } else {
        setPath(party.body.preconditions, longKey, value);
      }
    },
    assertNothing() {
      context.constrained.add(longKey);
    },
  };
}

function getVariable<K extends LongKey, U extends FlatPreconditionValue[K]>(
  party: Party,
  longKey: K,
  fieldType: AsFieldElements<U>
): U {
  // in compile, just return an empty variable
  if (inCompile() || inAnalyze()) {
    return Circuit.witness(fieldType, (): U => {
      // TODO this error is never thrown. instead, reading the value with e.g. `toString` ends up
      // calling snarky's eval_as_prover, which throws "Can't evaluate prover code outside an as_prover block"
      // this should be caught and replaced with a better error message
      throw Error(
        `This error is thrown because you are reading out the value of a variable, when that value is not known.
To write a correct circuit, you must avoid any dependency on the concrete value of variables.`
      );
    });
  }
  // if not in compile, get the variable's value first
  let [accountOrNetwork, ...rest] = longKey.split('.');
  let key = rest.join('.');
  let value: U;
  if (accountOrNetwork === 'account') {
    let account = getAccountPreconditions(party);
    value = account[key as keyof AccountValue] as U;
  } else if (accountOrNetwork === 'network') {
    let networkState = Mina.getNetworkState();
    value = getPath(networkState, key);
  } else {
    throw Error('impossible');
  }
  // in prover, return a new variable which holds the value
  // outside, just return the value
  if (inProver()) {
    return Circuit.witness(fieldType, () => value);
  } else {
    return value;
  }
}

function getAccountPreconditions(party: Party): AccountValue {
  let { publicKey, tokenId } = party.body;
  let hasAccount = Mina.hasAccount(publicKey, tokenId);
  if (!hasAccount) {
    return {
      balance: UInt64.zero,
      nonce: UInt32.zero,
      receiptChainHash: emptyReceiptChainHash(),
      sequenceState: Events.emptySequenceState(),
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
    sequenceState: account.sequenceState ?? Events.emptySequenceState(),
    delegate: account.delegate ?? account.publicKey,
    provedState: account.provedState,
    isNew: Bool(false),
  };
}

// per-party context for checking invariants on precondition construction
type PreconditionContext = {
  isSelf: boolean;
  vars: Partial<FlatPreconditionValue>;
  read: Set<LongKey>;
  constrained: Set<LongKey>;
};

function initializePreconditions(party: Party, isSelf: boolean) {
  preconditionContexts.set(party, {
    read: new Set(),
    constrained: new Set(),
    vars: {},
    isSelf,
  });
}

function cleanPreconditionsCache(party: Party) {
  let context = preconditionContexts.get(party);
  if (context !== undefined) context.vars = {};
}

function assertPreconditionInvariants(party: Party) {
  let context = getPreconditionContextExn(party);
  let self = context.isSelf ? 'this' : 'party';
  let dummyPreconditions = Preconditions.ignoreAll();
  for (let preconditionPath of context.read) {
    // check if every precondition that was read was also contrained
    if (context.constrained.has(preconditionPath)) continue;

    // check if the precondition was modified manually, which is also a valid way of avoiding an error
    let precondition = getPath(party.body.preconditions, preconditionPath);
    let dummy = getPath(dummyPreconditions, preconditionPath);
    if (!circuitValueEquals(precondition, dummy)) continue;

    // we accessed a precondition field but not constrained it explicitly - throw an error
    let hasAssertBetween = isRangeCondition(precondition);
    let shortPath = preconditionPath.split('.').pop();
    let errorMessage = `You used \`${self}.${preconditionPath}.get()\` without adding a precondition that links it to the actual ${shortPath}.
Consider adding this line to your code:
${self}.${preconditionPath}.assertEquals(${self}.${preconditionPath}.get());${
      hasAssertBetween
        ? `
You can also add more flexible preconditions with \`${self}.${preconditionPath}.assertBetween(...)\`.`
        : ''
    }`;
    throw Error(errorMessage);
  }
}

function getPreconditionContextExn(party: Party) {
  let c = preconditionContexts.get(party);
  if (c === undefined) throw Error('bug: precondition context not found');
  return c;
}

const preconditionContexts = new WeakMap<Party, PreconditionContext>();

// exported types

// TODO actually fetch network preconditions
type NetworkPrecondition = Preconditions['network'];
type NetworkValue = PreconditionBaseTypes<NetworkPrecondition>;
type Network = PreconditionClassType<NetworkPrecondition>;

// TODO: OK how we read delegate from delegateAccount?
// TODO: no graphql field for provedState yet
// TODO: figure out serialization of receiptChainHash
// TODO: should we add account.state?
// then can just use circuitArray(Field, 8) as the type
type AccountPrecondition = Omit<Preconditions['account'], 'state'>;
// TODO to use this type as account type everywhere, need to add publicKey
type AccountValue = PreconditionBaseTypes<AccountPrecondition>;
type Account = PreconditionClassType<AccountPrecondition>;

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
  assertEquals(value: U): void;
  assertNothing(): void;
};

type PreconditionClassType<T> = {
  [K in keyof T]: T[K] extends RangeCondition<infer U>
    ? PreconditionSubclassType<U> & {
        assertBetween(lower: U, upper: U): void;
      }
    : T[K] extends FlaggedOptionCondition<infer U>
    ? PreconditionSubclassType<U>
    : T[K] extends Field
    ? PreconditionSubclassType<Field>
    : PreconditionClassType<T[K]>;
};

// TS magic for computing flattened precondition types

type JoinEntries<K, P> = K extends string
  ? P extends [string, unknown, unknown]
    ? [`${K}${P[0] extends '' ? '' : '.'}${P[0]}`, P[1], P[2]]
    : never
  : never;

type PreconditionFlatEntry<T> = T extends AnyCondition<infer U>
  ? ['', T, U]
  : { [K in keyof T]: JoinEntries<K, PreconditionFlatEntry<T[K]>> }[keyof T];

type FlatPreconditionValue = {
  [S in PreconditionFlatEntry<NetworkPrecondition> as `network.${S[0]}`]: S[2];
} & {
  [S in PreconditionFlatEntry<AccountPrecondition> as `account.${S[0]}`]: S[2];
};

type LongKey = keyof FlatPreconditionValue;

// types for the two kinds of conditions
type RangeCondition<T> = { isSome: Bool; value: { lower: T; upper: T } };
type FlaggedOptionCondition<T> = { isSome: Bool; value: T };
type AnyCondition<T> =
  | RangeCondition<T>
  | FlaggedOptionCondition<T>
  | AsFieldElements<T>;

function isRangeCondition<T>(
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
