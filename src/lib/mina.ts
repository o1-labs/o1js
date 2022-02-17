// This is for an account where any of a list of public keys can update the state

import {
  Circuit,
  Ledger,
  Field,
  FeePayerParty,
  Parties,
  Party_,
} from '../snarky';
import { UInt32, UInt64 } from './int';
import { PrivateKey, PublicKey } from './signature';
import { Body, Predicate } from './party';
import { toParty, toPartyBody } from './party-conversion';

interface TransactionId {
  wait(): Promise<void>;
}

interface Transaction {
  send(): TransactionId;
}

interface SnappAccount {
  appState: Array<Field>;
}

interface Account {
  balance: UInt64;
  nonce: UInt32;
  snapp: SnappAccount;
}

export let nextTransactionId: { value: number } = { value: 0 };

export type CurrentTransaction =
  | undefined
  | {
      sender: PrivateKey;
      parties: Array<{ body: Body; predicate: Predicate }>;
      nextPartyIndex: number;
    };

export let currentTransaction: CurrentTransaction = undefined;
export function setCurrentTransaction(transaction: CurrentTransaction) {
  currentTransaction = transaction;
}

interface Mina {
  transaction(sender: PrivateKey, f: () => void | Promise<void>): Transaction;
  currentSlot(): UInt32;
  getAccount(publicKey: PublicKey): Account;
}

interface MockMina extends Mina {
  addAccount(publicKey: PublicKey, balance: number): void;
  /**
   * An array of 10 test accounts that have been pre-filled with
   * 30000000000 units of currency.
   */
  testAccounts: Array<{ publicKey: PublicKey; privateKey: PrivateKey }>;
}

/**
 * A mock Mina blockchain running locally and useful for testing.
 */
export const LocalBlockchain: () => MockMina = () => {
  const msPerSlot = 3 * 60 * 1000;
  const startTime = new Date().valueOf();

  const ledger = Ledger.create([]);

  const currentSlot = () =>
    UInt32.fromNumber(
      Math.ceil((new Date().valueOf() - startTime) / msPerSlot)
    );

  const addAccount = (pk: PublicKey, balance: number) => {
    ledger.addAccount(pk, balance);
  };

  let testAccounts = [];
  for (let i = 0; i < 10; ++i) {
    const largeValue = 30000000000;
    const k = PrivateKey.random();
    const pk = k.toPublicKey();
    addAccount(pk, largeValue);
    testAccounts.push({ privateKey: k, publicKey: pk });
  }

  const getAccount = (pk: PublicKey) => {
    const r = ledger.getAccount(pk);
    if (r == null) {
      throw new Error(
        `getAccount: Could not find account for ${JSON.stringify(pk.toJSON())}`
      );
    } else {
      const a = {
        balance: new UInt64(r.balance.value),
        nonce: new UInt32(r.nonce.value),
        snapp: r.snapp,
      };
      return a;
    }
  };

  const transaction = (
    sender: PrivateKey,
    f: () => void | Promise<void>
  ): Transaction => {
    if (currentTransaction !== undefined) {
      throw new Error(
        'Cannot start new transaction within another transaction'
      );
    }

    currentTransaction = {
      sender,
      parties: [],
      nextPartyIndex: 0,
    };

    try {
      Circuit.runAndCheckSync(f);
    } catch (err) {
      currentTransaction = undefined;
      // TODO would be nice if the error would be a bit more descriptive about what failed
      throw err;
    }

    const senderPubkey = sender.toPublicKey();
    let senderAccount = getAccount(senderPubkey);

    if (currentTransaction === undefined) {
      throw new Error('Transaction is undefined');
    }

    const otherParties: Array<Party_> = currentTransaction.parties.map(
      (party) => toParty(party)
    );

    const feePayer: FeePayerParty = {
      body: toPartyBody(Body.keepAll(senderPubkey)),
      predicate: senderAccount.nonce,
    };

    const txn: Parties = {
      otherParties,
      feePayer,
    };

    nextTransactionId.value += 1;
    currentTransaction = undefined;

    return {
      send: () => {
        const res = (async () => ledger.applyPartiesTransaction(txn))();
        return {
          wait: () => res,
        };
      },
    };
  };

  return {
    currentSlot,
    getAccount,
    transaction,
    addAccount,
    testAccounts,
  };
};

let activeInstance: Mina = {
  currentSlot: () => {
    throw new Error('must call Mina.setActiveInstance first');
  },
  getAccount: () => {
    throw new Error('must call Mina.setActiveInstance first');
  },
  transaction: () => {
    throw new Error('must call Mina.setActiveInstance first');
  },
};

/**
 * Set the currently used Mina instance.
 */
export function setActiveInstance(m: Mina) {
  activeInstance = m;
}

/**
 * Construct a smart contract transaction. Within the callback passed to this function,
 * you can call into the methods of smart contracts.
 *
 * ```typescript
 * transaction(async () => {
 *   await mySmartContract.update();
 *   await someOtherContract.someOtherMethod();
 * })
 * ```
 *
 * @return A transaction that can subsequently be submitted to the chain.
 */
export function transaction(
  sender: PrivateKey,
  f: () => void | Promise<void>
): Transaction {
  return activeInstance.transaction(sender, f);
}

/**
 * @return The current slot number, according to the active Mina instance.
 */
export function currentSlot(): UInt32 {
  return activeInstance.currentSlot();
}

/**
 * @return The account data associated to the given public key.
 */
export function getAccount(pubkey: PublicKey) {
  return activeInstance.getAccount(pubkey);
}

/**
 * @return The balance associated to the given public key.
 */
export function getBalance(pubkey: PublicKey) {
  return activeInstance.getAccount(pubkey).balance;
}
