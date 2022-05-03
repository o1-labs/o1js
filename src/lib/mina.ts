// This is for an account where any of a list of public keys can update the state

import { Circuit, Ledger, Field } from '../snarky';
import { UInt32, UInt64 } from './int';
import { PrivateKey, PublicKey } from './signature';
import { addMissingSignatures, FeePayer, Parties, Party } from './party';
import { toParties } from './party-conversion';

export { createUnsignedTransaction, createSignedTransaction };

interface TransactionId {
  wait(): Promise<void>;
}

interface Transaction {
  transaction: Parties;
  sign(): void;
  send(): TransactionId;
}

interface ZkappAccount {
  appState: Array<Field>;
}

interface Account {
  balance: UInt64;
  nonce: UInt32;
  zkapp: ZkappAccount;
}

export let nextTransactionId: { value: number } = { value: 0 };

export type CurrentTransaction =
  | undefined
  | {
      sender?: PrivateKey;
      parties: Party[];
      nextPartyIndex: number;
    };

export let currentTransaction: CurrentTransaction = undefined;
export function setCurrentTransaction(transaction: CurrentTransaction) {
  currentTransaction = transaction;
}

interface Mina {
  transaction(sender: PrivateKey, f: () => unknown): Transaction;
  currentSlot(): UInt32;
  getAccount(publicKey: PublicKey): Account;
}

function createUnsignedTransaction(f: () => unknown) {
  return createTransaction(undefined, f);
}
function createSignedTransaction(sender: PrivateKey, f: () => unknown) {
  return createTransaction(sender, f);
}

function createTransaction(
  senderKey: PrivateKey | undefined,
  f: () => unknown
) {
  if (currentTransaction !== undefined) {
    throw new Error('Cannot start new transaction within another transaction');
  }

  currentTransaction = {
    sender: senderKey,
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

  let feePayer: FeePayer;
  if (senderKey !== undefined) {
    // if senderKey is provided, fetch account to get nonce and mark to be signed
    let senderAddress = senderKey.toPublicKey();
    let senderAccount = getAccount(senderAddress);
    feePayer = Party.defaultFeePayer(
      senderAddress,
      senderKey,
      senderAccount.nonce
    );
  } else {
    // otherwise use a dummy fee payer that has to be filled in later
    feePayer = Party.dummyFeePayer();
  }

  let transaction = { otherParties: currentTransaction.parties, feePayer };

  nextTransactionId.value += 1;
  currentTransaction = undefined;
  return {
    transaction,

    sign(additionalKeys?: PrivateKey[]) {
      this.transaction = addMissingSignatures(this.transaction, additionalKeys);
      return this;
    },

    toJSON() {
      return Ledger.partiesToJson(toParties(this.transaction));
    },

    // TODO: this is untested, investigate if useful
    toGraphQL() {
      return `mutation MyMutation {
        __typename
        sendZkapp(input: ${Ledger.partiesToGraphQL(
          toParties(this.transaction)
        )})}`;
    },
  };
}

interface MockMina extends Mina {
  addAccount(publicKey: PublicKey, balance: string): void;
  /**
   * An array of 10 test accounts that have been pre-filled with
   * 30000000000 units of currency.
   */
  testAccounts: Array<{ publicKey: PublicKey; privateKey: PrivateKey }>;
  applyJsonTransaction: (tx: string) => void;
}

/**
 * A mock Mina blockchain running locally and useful for testing.
 */
export function LocalBlockchain() {
  const msPerSlot = 3 * 60 * 1000;
  const startTime = new Date().valueOf();

  const ledger = Ledger.create([]);

  const currentSlot = () =>
    UInt32.fromNumber(
      Math.ceil((new Date().valueOf() - startTime) / msPerSlot)
    );

  function addAccount(pk: PublicKey, balance: string) {
    ledger.addAccount(pk, balance);
  }

  let testAccounts = [];
  for (let i = 0; i < 10; ++i) {
    const largeValue = '30000000000';
    const k = PrivateKey.random();
    const pk = k.toPublicKey();
    addAccount(pk, largeValue);
    testAccounts.push({ privateKey: k, publicKey: pk });
  }

  function getAccount(pk: PublicKey): Account {
    const r = ledger.getAccount(pk);
    if (r == undefined) {
      throw new Error(
        `getAccount: Could not find account for ${JSON.stringify(pk.toJSON())}`
      );
    } else {
      const a = {
        balance: new UInt64(r.balance.value),
        nonce: new UInt32(r.nonce.value),
        zkapp: r.zkapp,
      };
      return a;
    }
  }

  function transaction(sender: PrivateKey, f: () => unknown) {
    let txn = createTransaction(sender, f);
    return {
      ...txn,
      send() {
        txn.sign();
        ledger.applyPartiesTransaction(toParties(txn.transaction));
        return { wait: async () => {} };
      },
    };
  }

  function applyJsonTransaction(json: string) {
    return ledger.applyJsonTransaction(json);
  }

  return {
    currentSlot,
    getAccount,
    transaction,
    applyJsonTransaction,
    addAccount,
    testAccounts,
  };
}

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
