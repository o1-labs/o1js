import { Circuit, AsFieldElements, Bool, Field } from '../snarky';
import { PublicKey } from './signature';
import * as Mina from './mina';
import * as Fetch from './fetch';
import { Preconditions } from './party';
import * as GlobalContext from './global-context';
import { UInt32, UInt64 } from './int';

// TODO: would be nice to autogenerate the graphql return type for account (and possibly various ones for the network stuff)

type AccountPrecondition = Preconditions['account'];
type AccountType = Fetch.Account;

// type AccountPreconditionClass = {
//   [K in Exclude<keyof AccountPrecondition, 'state'>]: {
//     // TODO
//     get: () => any;
//   };
// };

function Account(address: PublicKey) {
  return {
    balance: {
      get: () => {
        return getAccountFieldExn(address, 'balance', UInt64);
      },
    },
    nonce: {
      get() {
        return getAccountFieldExn(address, 'nonce', UInt32);
      },
    },
    // TODO: OK how we read this from delegateAccount?
    delegate: {
      get() {
        return getAccountFieldExn(address, 'delegate', PublicKey);
      },
    },
    // TODO: no graphql field yet
    provedState: {
      get() {
        return getAccountFieldExn(address, 'provedState', Bool);
      },
    },
    // TODO: figure out serialization
    receiptChainHash: {
      get() {
        return getAccountFieldExn(address, 'receiptChainHash', Field);
      },
    },
    // TODO: OK how we read this from sequenceEvents?
    sequenceState: {
      get() {
        return getAccountFieldExn(address, 'sequenceState', Field);
      },
    },
    // TODO: should we add state? then we should change the structure on `Fetch.Account` which is stupid anyway
    // then can just use circuitArray(Field, 8) as the type
  };
}

function getAccountFieldExn<K extends keyof AccountType>(
  address: PublicKey,
  key: K,
  fieldType: AsFieldElements<AccountType[K]>
) {
  let inProver = GlobalContext.inProver();
  if (!GlobalContext.inCompile()) {
    let account = Mina.getAccount(address);
    let field = account[key];
    // in prover, create a new witness with the state values
    // outside, just return the state values
    return inProver ? Circuit.witness(fieldType, () => field) : field;
  } else {
    // in compile, we don't need the witness values
    return Circuit.witness(fieldType, (): AccountType[K] => {
      throw Error('Accessed witness in compile - this is a bug.');
    });
  }
}
