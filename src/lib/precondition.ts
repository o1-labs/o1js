import {
  Circuit,
  AsFieldElements,
  Bool,
  Field,
  jsLayout,
  Types,
} from '../snarky';
import { circuitValueEquals } from './circuit_value';
import { PublicKey } from './signature';
import * as Mina from './mina';
import * as Fetch from './fetch';
import { Party, Preconditions } from './party';
import * as GlobalContext from './global-context';
import { UInt32, UInt64 } from './int';

export {
  preconditions,
  Account,
  Network,
  assertPreconditionInvariants,
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
  // TODO there should be a less error-prone way of typing js layout
  // e.g. separate keys list and value object, so that we can access by key
  let layout = (jsLayout as any).Party.layout[0].value.layout[9].value.layout[0]
    .value as Layout;
  let context = getPreconditionContextExn(party);
  return preconditionClass(layout, `network`, party, context);
}

function Account(party: Party): Account {
  // TODO there should be a less error-prone way of typing js layout
  // e.g. separate keys list and value object, so that we can access by key
  let layout = (jsLayout as any).Party.layout[0].value.layout[9].value.layout[1]
    .value as Layout;
  let context = getPreconditionContextExn(party);
  return preconditionClass(layout, `account`, party, context);
}

function preconditionClass(
  layout: Layout,
  baseKey: any,
  party: Party,
  context: PreconditionContext
): any {
  if (layout.type === 'option') {
    // range condition
    if (layout.optionType === 'implicit' && layout.inner.type === 'object') {
      let lower = layout.inner.layout[0].value.type;
      let baseType = baseMap[lower];
      return {
        ...preconditionSubclass(party, baseKey, baseType as any, context),
        assertBetween(lower: any, upper: any) {
          context.constrained.add(baseKey);
          let property = getPath(party.body.preconditions, baseKey);
          property.lower = lower;
          property.upper = upper;
        },
      };
    }
    // value condition
    else if (layout.optionType === 'flaggedOption') {
      let baseType = baseMap[layout.inner.type];
      return preconditionSubclass(party, baseKey, baseType as any, context);
    } else if (layout.inner.type !== 'object') {
      let baseType = baseMap[layout.inner.type];
      return preconditionSubclass(party, baseKey, baseType as any, context);
    }
  } else if (layout.type === 'array') {
    return {}; // not applicable yet, TODO if we implement state
  } else if (layout.type === 'object') {
    // for each field, create a recursive object
    return Object.fromEntries(
      layout.layout.map(({ key, value }) => {
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
  { read, vars, constrained }: PreconditionContext
) {
  return {
    get() {
      read.add(longKey);
      return (vars[longKey] ??
        (vars[longKey] = getVariable(party, longKey, fieldType))) as U;
    },
    assertEquals(value: U) {
      constrained.add(longKey);
      let property = getPath(
        party.body.preconditions,
        longKey
      ) as AnyCondition<U>;
      if ('isSome' in property) {
        property.isSome = Bool(true);
        property.value = value;
      } else if ('lower' in property) {
        property.lower = value;
        property.upper = value;
      } else {
        setPath(party.body.preconditions, longKey, value);
      }
    },
    assertNothing() {
      constrained.add(longKey);
    },
  };
}

function getVariable<K extends LongKey, U extends FlatPreconditionValue[K]>(
  party: Party,
  longKey: K,
  fieldType: AsFieldElements<U>
): U {
  let [accountOrNetwork, ...rest] = longKey.split('.');
  let key = rest.join('.');

  if (accountOrNetwork === 'account') {
    let address = party.body.publicKey;
    return getAccountFieldExn<any>(address, key, fieldType);
  }

  throw Error('todo');
}

function getAccountFieldExn<K extends keyof AccountValue>(
  address: PublicKey,
  key: K,
  fieldType: AsFieldElements<AccountValue[K]>
): AccountValue[K] {
  type Value = AccountValue[K];
  let inProver = GlobalContext.inProver();
  if (!GlobalContext.inCompile()) {
    let account = Mina.getAccount(address);
    if (account[key] === undefined)
      throw Error(
        `Could not get \`${key}\` on account with public key ${address.toBase58()}. The property may not be available on this account.`
      );
    let field = account[key] as any as Value;
    // in prover, create a new witness with the state values
    // outside, just return the state values
    return inProver ? Circuit.witness(fieldType, () => field) : field;
  } else {
    // in compile, we don't need the witness values
    return Circuit.witness(fieldType, (): Value => {
      throw Error('Accessed witness in compile - this is a bug.');
    });
  }
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
    let errorMessage = `You used \`${self}.${preconditionPath}.get()\` without adding a precondition that links it to the actual balance.
Consider adding this line to your code:
${self}.${preconditionPath}.assertEquals(${self}.${preconditionPath}.get());${
      hasAssertBetween
        ? `
You can also add more flexible preconditions with \`${self}.${preconditionPath}.assertBetween\`.`
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
// TODO: OK how we read sequenceState from sequenceEvents?
// TODO: should we add account.state? then we should change the structure on `Fetch.Account` which is stupid anyway
// then can just use circuitArray(Field, 8) as the type
type AccountPrecondition = Omit<Preconditions['account'], 'state'>;
// TODO to use this type as account type everywhere, need to add publicKey
type AccountValue = PreconditionBaseTypes<AccountPrecondition>;
type Account = PreconditionClassType<AccountPrecondition>;

type PreconditionBaseTypes<T> = {
  [K in keyof T]: T[K] extends RangeCondition<infer U>
    ? BasicToFull<U>
    : T[K] extends FlaggedOptionCondition<infer U>
    ? BasicToFull<U>
    : T[K] extends AsFieldElements<infer U>
    ? BasicToFull<U>
    : PreconditionBaseTypes<T[K]>;
};

type PreconditionSubclassType<U> = {
  get(): BasicToFull<U>;
  assertEquals(value: BasicToFull<U>): void;
  assertNothing(): void;
};

type PreconditionClassType<T> = {
  [K in keyof T]: T[K] extends RangeCondition<infer U>
    ? PreconditionSubclassType<U> & {
        assertBetween(lower: BasicToFull<U>, upper: BasicToFull<U>): void;
      }
    : T[K] extends FlaggedOptionCondition<infer U>
    ? PreconditionSubclassType<U>
    : T[K] extends AsFieldElements<infer U>
    ? PreconditionSubclassType<U>
    : PreconditionClassType<T[K]>;
};

type BasicToFull<K> = K extends Types.UInt32
  ? UInt32
  : K extends Types.UInt64
  ? UInt64
  : K extends Field
  ? Field
  : K extends Bool
  ? Bool
  : K extends Types.PublicKey
  ? PublicKey
  : never;

// layout types

type BaseLayout = { type: 'UInt64' | 'UInt32' | 'Field' | 'Bool' };
let baseMap = { UInt64, UInt32, Field, Bool };

type RangeLayout<T extends BaseLayout> = {
  type: 'object';
  layout: [{ key: 'lower'; value: T }, { key: 'upper'; value: T }];
};
type OptionLayout<T extends BaseLayout> = { type: 'option' } & (
  | {
      optionType: 'flaggedOption';
      inner: T;
    }
  | {
      optionType: 'implicit';
      inner: RangeLayout<T>;
    }
  | {
      optionType: 'implicit';
      inner: T;
    }
);
type Layout =
  | {
      type: 'object';
      layout: {
        key: string;
        value: Layout;
      }[];
    }
  | {
      type: 'array';
      inner: Layout;
    }
  | OptionLayout<BaseLayout>
  | BaseLayout;

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
type FlatPrecondition = {
  [S in PreconditionFlatEntry<NetworkPrecondition> as `network.${S[0]}`]: S[1];
} & {
  [S in PreconditionFlatEntry<AccountPrecondition> as `account.${S[0]}`]: S[1];
};

type LongKey = keyof FlatPreconditionValue;

// types for the two kinds of conditions
type RangeCondition<T> = { lower: T; upper: T };
type FlaggedOptionCondition<T> = { isSome: Bool; value: T };
type AnyCondition<T> =
  | RangeCondition<T>
  | FlaggedOptionCondition<T>
  | AsFieldElements<T>;

function isRangeCondition<T>(
  condition: AnyCondition<T>
): condition is RangeCondition<T> {
  return 'lower' in condition;
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
