import { Circuit, AsFieldElements, Bool, Field } from '../snarky';
import { circuitValueEquals } from './circuit_value';
import { PublicKey } from './signature';
import * as Mina from './mina';
import * as Fetch from './fetch';
import { Party, Preconditions } from './party';
import * as GlobalContext from './global-context';
import { UInt32, UInt64 } from './int';

export { preconditions, Account, assertPreconditionInvariants };

function preconditions(party: Party, isSelf: boolean) {
  initializePreconditions(party, isSelf);
  return { account: Account(party) };
}

// TODO: would be nice to autogenerate the graphql return type for account (and possibly various ones for the network stuff)

type AccountPrecondition = Preconditions['account'];
type AccountType = Fetch.Account;
type Account = ReturnType<typeof Account>;

type Key = Exclude<keyof AccountType, 'zkapp' | 'permissions' | 'publicKey'>;
type ClassType = {
  [K in Key]: AsFieldElements<Exclude<AccountType[K], undefined>>;
};
type ValueType = {
  [K in Key]: Exclude<AccountType[K], undefined>;
};
type AccountClassType = {
  [K in Key]: AccountPrecondition[K] extends rangeCondition<any>
    ? {
        get(): ValueType[K];
        assertEquals(value: ValueType[K]): void;
        assertBetween(lower: ValueType[K], upper: ValueType[K]): void;
        assertNothing(): void;
      }
    : {
        get(): ValueType[K];
        assertEquals(value: ValueType[K]): void;
        assertNothing(): void;
      };
};

function Account(party: Party): AccountClassType {
  let address = party.body.publicKey;
  let { read, vars, constrained } = getPreconditionContextExn(party);

  function precondition<K extends Key>(path: K, fieldType: ClassType[K]) {
    let longPath = `account.${path}` as const;
    return {
      get(): ValueType[K] {
        read.add(longPath);
        return (vars[longPath] ??
          (vars[longPath] = getAccountFieldExn(
            address,
            path,
            fieldType
          ))) as ValueType[K];
      },
      assertEquals(value: ValueType[K]) {
        constrained.add(longPath);
        let property = getPath(
          party.body.preconditions,
          longPath
        ) as AccountPrecondition[K];
        if ('isSome' in property) {
          property.isSome = Bool(true);
          property.value = value as any;
        } else if ('lower' in property) {
          property.lower = value as any;
          property.upper = value as any;
        } else {
          party.body.preconditions.account[path] = value as any;
        }
      },
      assertNothing() {
        constrained.add(longPath);
      },
    };
  }

  function rangePrecondition<K extends 'nonce' | 'balance'>(
    path: K,
    fieldType: ClassType[K]
  ) {
    let longPath = `account.${path}` as const;
    return {
      ...precondition(path, fieldType),
      assertBetween(lower: ValueType[K], upper: ValueType[K]) {
        constrained.add(longPath);
        let property = getPath(
          party.body.preconditions,
          longPath
        ) as AccountPrecondition[K];
        property.lower = lower;
        property.upper = upper;
      },
    };
  }

  return {
    balance: rangePrecondition('balance', UInt64),
    nonce: rangePrecondition('nonce', UInt32),
    // TODO: OK how we read this from delegateAccount?
    delegate: precondition('delegate', PublicKey),
    // TODO: no graphql field yet
    provedState: precondition('provedState', Bool),
    // TODO: figure out serialization
    receiptChainHash: precondition('receiptChainHash', Field),
    // TODO: OK how we read this from sequenceEvents?
    sequenceState: precondition('sequenceState', Field),
    // TODO: should we add state? then we should change the structure on `Fetch.Account` which is stupid anyway
    // then can just use circuitArray(Field, 8) as the type
  };
}

function getAccountFieldExn<K extends keyof AccountType>(
  address: PublicKey,
  key: K,
  fieldType: AsFieldElements<Exclude<AccountType[K], undefined>>
) {
  type Value = Exclude<AccountType[K], undefined>;
  let inProver = GlobalContext.inProver();
  if (!GlobalContext.inCompile()) {
    let account = Mina.getAccount(address);
    if (account[key] === undefined) throw Error('bug');
    let field = account[key] as Value;
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
type PreconditionPath = `account.${Key}`;
type PreconditionContext = {
  isSelf: boolean;
  vars: Partial<Record<PreconditionPath, any>>;
  read: Set<PreconditionPath>;
  constrained: Set<PreconditionPath>;
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

// types for the two kinds of conditions
type rangeCondition<T> = { lower: T; upper: T };
type valueCondition<T> = { isSome: boolean; value: T };
type anyCondition<T> = rangeCondition<T> | valueCondition<T> | T;
function isRangeCondition<T>(
  condition: anyCondition<T>
): condition is rangeCondition<T> {
  return 'lower' in condition;
}

// helper. getPath({a: {b: 'x'}}, 'a.b') === 'x'
function getPath(obj: any, path: string) {
  let pathArray = path.split('.').reverse();
  while (pathArray.length > 0) {
    let key = pathArray.pop();
    obj = obj[key as any];
  }
  return obj;
}
