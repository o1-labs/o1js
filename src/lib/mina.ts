// This is for an account where any of a list of public keys can update the state

import { Circuit, Ledger, Field } from '../snarky';
import { UInt32, UInt64 } from './int';
import { PrivateKey, PublicKey } from './signature';
import {
  addMissingProofs,
  addMissingSignatures,
  FeePayer,
  Parties,
  Party,
  ZkappStateLength,
} from './party';
import { toParties } from './party-conversion';
import * as Fetch from './fetch';

export {
  createUnsignedTransaction,
  createTransaction,
  BerkeleyQANet,
  LocalBlockchain,
  nextTransactionId,
  CurrentTransaction,
  setCurrentTransaction,
  setActiveInstance,
  transaction,
  currentSlot,
  getAccount,
  getBalance,
  accountCreationFee,
};

interface TransactionId {
  wait(): Promise<void>;
}

interface Transaction {
  transaction: Parties;
  toJSON(): string;
  toGraphqlQuery(): string;
  sign(): Transaction;
  prove(): Promise<Transaction>;
  send(): TransactionId;
}

type Account = Fetch.Account;

let nextTransactionId: { value: number } = { value: 0 };

type FetchMode = 'fetch' | 'cached' | 'test';
type CurrentTransaction =
  | undefined
  | {
      sender?: PrivateKey;
      parties: Party[];
      nextPartyIndex: number;
      fetchMode: FetchMode;
    };

export let currentTransaction: CurrentTransaction = undefined;
function setCurrentTransaction(transaction: CurrentTransaction) {
  currentTransaction = transaction;
}

type SenderSpec =
  | PrivateKey
  | { privateKey: PrivateKey; fee?: number | string | UInt64 }
  | undefined;

function createUnsignedTransaction(
  f: () => unknown,
  { fetchMode = 'cached' as FetchMode } = {}
) {
  return createTransaction(undefined, f, { fetchMode });
}
function createTransaction(
  sender:
    | PrivateKey
    | { privateKey: PrivateKey; fee?: number | string | UInt64 }
    | undefined,
  f: () => unknown,
  { fetchMode = 'cached' as FetchMode } = {}
): Transaction {
  if (currentTransaction !== undefined) {
    throw new Error('Cannot start new transaction within another transaction');
  }
  let senderKey = sender instanceof PrivateKey ? sender : sender?.privateKey;
  let fee = sender instanceof PrivateKey ? undefined : sender?.fee;

  currentTransaction = {
    sender: senderKey,
    parties: [],
    nextPartyIndex: 0,
    fetchMode,
  };

  try {
    Circuit.runAndCheck(f);
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
    if (fee !== undefined) {
      feePayer.balance.subInPlace(
        fee instanceof UInt64 ? fee : UInt64.fromString(String(fee))
      );
    }
  } else {
    // otherwise use a dummy fee payer that has to be filled in later
    feePayer = Party.dummyFeePayer();
  }

  let transaction = { otherParties: currentTransaction.parties, feePayer };

  nextTransactionId.value += 1;
  currentTransaction = undefined;
  let self = {
    transaction,

    sign(additionalKeys?: PrivateKey[]) {
      self.transaction = addMissingSignatures(self.transaction, additionalKeys);
      return self;
    },

    async prove() {
      self.transaction = await addMissingProofs(self.transaction);
      return self;
    },

    toJSON() {
      return Ledger.partiesToJson(toParties(self.transaction));
    },

    toGraphqlQuery() {
      return Fetch.sendZkappQuery(self.toJSON());
    },

    send() {
      throw Error('this should be overriden');
    },
  };
  return self;
}

interface Mina {
  transaction(sender: SenderSpec, f: () => void): Promise<Transaction>;
  currentSlot(): UInt32;
  getAccount(publicKey: PublicKey): Account;
  fetchMissingAccounts(): Promise<void>;
  accountCreationFee(): UInt32;
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
interface Testnet extends Mina {
  /**
   * An array containing test accounts that are pre-filled with currency.
   */
  testAccounts: Array<{ publicKey: PublicKey; privateKey: PrivateKey }>;
}

const defaultAccountCreationFee = 1_000_000_000;

/**
 * A mock Mina blockchain running locally and useful for testing.
 */
function LocalBlockchain({
  accountCreationFee = defaultAccountCreationFee as string | number,
} = {}): MockMina {
  let accountCreationFee_ = String(accountCreationFee);
  const msPerSlot = 3 * 60 * 1000;
  const startTime = new Date().valueOf();

  const ledger = Ledger.create([]);

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

  return {
    accountCreationFee: () => UInt32.fromString(accountCreationFee_),
    currentSlot() {
      return UInt32.fromNumber(
        Math.ceil((new Date().valueOf() - startTime) / msPerSlot)
      );
    },
    getAccount(publicKey: PublicKey): Account {
      let ledgerAccount = ledger.getAccount(publicKey);
      if (ledgerAccount == undefined) {
        throw new Error(
          `getAccount: Could not find account for public key ${publicKey.toBase58()}`
        );
      } else {
        return {
          publicKey: publicKey,
          balance: new UInt64(ledgerAccount.balance.value),
          nonce: new UInt32(ledgerAccount.nonce.value),
          zkapp: ledgerAccount.zkapp,
        };
      }
    },
    async fetchMissingAccounts() {},
    async transaction(sender: SenderSpec, f: () => void) {
      let txn = createTransaction(sender, f);
      return {
        ...txn,
        send() {
          txn.sign();
          ledger.applyPartiesTransaction(
            toParties(txn.transaction),
            accountCreationFee_
          );
          return { wait: async () => {} };
        },
      };
    },
    applyJsonTransaction(json: string) {
      return ledger.applyJsonTransaction(json, accountCreationFee_);
    },
    addAccount,
    testAccounts,
  };
}

function RemoteBlockchain(
  graphqlEndpoint: string,
  testAccounts = [] as {
    publicKey: PublicKey;
    privateKey: PrivateKey;
  }[]
): Testnet {
  let accountCreationFee = UInt32.fromNumber(defaultAccountCreationFee);
  Fetch.setGraphqlEndpoint(graphqlEndpoint);
  return {
    accountCreationFee: () => accountCreationFee,
    currentSlot() {
      throw Error(
        'currentSlot() is not implemented yet for remote blockchains.'
      );
    },
    getAccount(publicKey: PublicKey) {
      if (currentTransaction?.fetchMode === 'test') {
        Fetch.markAccountToBeFetched(publicKey, graphqlEndpoint);
        return dummyAccount(publicKey);
      }
      if (
        currentTransaction == undefined ||
        currentTransaction.fetchMode === 'cached'
      ) {
        let account = Fetch.getCachedAccount(publicKey, graphqlEndpoint);
        if (account !== undefined) return account;
      }
      throw Error(
        `getAccount: Could not find account for public key ${publicKey.toBase58()}.\nGraphql endpoint: ${graphqlEndpoint}`
      );
    },
    async fetchMissingAccounts() {
      await Fetch.fetchMissingAccounts(graphqlEndpoint);
    },
    async transaction(sender: SenderSpec, f: () => void) {
      createTransaction(sender, f, { fetchMode: 'test' });
      await Fetch.fetchMissingAccounts(graphqlEndpoint);
      let txn = createTransaction(sender, f, { fetchMode: 'cached' });
      return {
        ...txn,
        send() {
          txn.sign();
          let sendPromise = Fetch.sendZkapp(txn.toJSON());
          return {
            async wait() {
              let [response, error] = await sendPromise;
              console.log('got graphql response', { response, error });
              console.log(
                'Info: waiting for inclusion in a block is not implemented yet.'
              );
              // if (error !== undefined) {
              //   console.log('Graphql transaction failed. Query:');
              //   console.log(txn.toGraphqlQuery());
              // }
            },
          };
        },
      };
    },
    testAccounts,
  };
}

function BerkeleyQANet(
  graphqlEndpoint = 'https://proxy.berkeley.minaexplorer.com/graphql'
): Testnet {
  let whaleKey = PrivateKey.fromBase58(
    'EKEtDLmauasBxaB3FsPVLHBdFHUoQMYa21y8phQwB9dV1fL4M2Cb'
  );
  let whaleAddress = PublicKey.fromBase58(
    'B62qpfgnUm7zVqi8MJHNB2m37rtgMNDbFNhC2DpMmmVpQt8x6gKv9Ww'
  );
  let testAccounts = [{ privateKey: whaleKey, publicKey: whaleAddress }];
  return RemoteBlockchain(graphqlEndpoint, testAccounts);
}

let activeInstance: Mina = {
  accountCreationFee: () => UInt32.fromNumber(defaultAccountCreationFee),
  currentSlot: () => {
    throw new Error('must call Mina.setActiveInstance first');
  },
  getAccount: (publicKey: PublicKey) => {
    if (currentTransaction?.fetchMode === 'test') {
      Fetch.markAccountToBeFetched(publicKey, Fetch.defaultGraphqlEndpoint);
      return dummyAccount(publicKey);
    }
    if (currentTransaction?.fetchMode === 'cached') {
      let account = Fetch.getCachedAccount(
        publicKey,
        Fetch.defaultGraphqlEndpoint
      );
      if (account === undefined)
        throw Error(
          `getAccount: Could not find account for public key ${publicKey.toBase58()}. Either call Mina.setActiveInstance first or explicitly add the account with addCachedAccount`
        );
      return account;
    }
    throw new Error('must call Mina.setActiveInstance first');
  },
  fetchMissingAccounts() {
    throw new Error('must call Mina.setActiveInstance first');
  },
  transaction: () => {
    throw new Error('must call Mina.setActiveInstance first');
  },
};

/**
 * Set the currently used Mina instance.
 */
function setActiveInstance(m: Mina) {
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
function transaction(sender: PrivateKey, f: () => void): Promise<Transaction> {
  return activeInstance.transaction(sender, f);
}

/**
 * @return The current slot number, according to the active Mina instance.
 */
function currentSlot(): UInt32 {
  return activeInstance.currentSlot();
}

/**
 * @return The account data associated to the given public key.
 */
function getAccount(pubkey: PublicKey) {
  return activeInstance.getAccount(pubkey);
}

/**
 * @return The balance associated to the given public key.
 */
function getBalance(pubkey: PublicKey) {
  return activeInstance.getAccount(pubkey).balance;
}

function accountCreationFee() {
  return activeInstance.accountCreationFee();
}

function dummyAccount(pubkey?: PublicKey): Account {
  return {
    balance: UInt64.zero,
    nonce: UInt32.zero,
    publicKey: pubkey ?? PublicKey.empty(),
    zkapp: { appState: Array(ZkappStateLength).fill(Field.zero) },
  };
}
