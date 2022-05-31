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

// type AccountPreconditionClass = {
//   [K in Exclude<keyof AccountPrecondition, 'state'>]: {
//     // TODO
//     get: () => any;
//   };
// };

function Account(party: Party) {
  let address = party.body.publicKey;
  let { read, vars } = getPreconditionContextExn(party);

  function get<T>(path: PreconditionPath, getVariable: () => T): T {
    read.add(path);
    return vars[path] ?? (vars[path] = getVariable());
  }

  return {
    balance: {
      get() {
        return get('account.balance', () =>
          getAccountFieldExn(address, 'balance', UInt64)
        );
      },
    },
    nonce: {
      get() {
        return get('account.nonce', () =>
          getAccountFieldExn(address, 'nonce', UInt32)
        );
      },
    },
    // TODO: OK how we read this from delegateAccount?
    delegate: {
      get() {
        return get('account.delegate', () =>
          getAccountFieldExn(address, 'delegate', PublicKey)
        );
      },
    },
    // TODO: no graphql field yet
    provedState: {
      get() {
        return get('account.provedState', () =>
          getAccountFieldExn(address, 'provedState', Bool)
        );
      },
    },
    // TODO: figure out serialization
    receiptChainHash: {
      get() {
        return get('account.receiptChainHash', () =>
          getAccountFieldExn(address, 'receiptChainHash', Field)
        );
      },
    },
    // TODO: OK how we read this from sequenceEvents?
    sequenceState: {
      get() {
        return get('account.sequenceState', () =>
          getAccountFieldExn(address, 'sequenceState', Field)
        );
      },
    },
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
type PreconditionPath = `account.${keyof ReturnType<typeof Account>}`;
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
