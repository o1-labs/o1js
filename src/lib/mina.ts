// This is for an account where any of a list of public keys can update the state

import { Circuit, Ledger, Field } from '../snarky';
import { UInt32, UInt64 } from './int';
import { PrivateKey, PublicKey } from './signature';
import {
  addMissingProofs,
  addMissingSignatures,
  FeePayerUnsigned,
  Parties,
  partiesToJson,
  Party,
  ZkappStateLength,
  ZkappPublicInput,
  getDefaultTokenId,
  CallForest,
  Authorization,
} from './party';
import * as Fetch from './fetch';
import { assertPreconditionInvariants, NetworkValue } from './precondition';
import { cloneCircuitValue } from './circuit_value';
import { Proof, snarkContext } from './proof_system';
import { Context } from './global-context';

export {
  createTransaction,
  BerkeleyQANet,
  LocalBlockchain,
  currentTransaction,
  CurrentTransaction,
  setActiveInstance,
  transaction,
  currentSlot,
  getAccount,
  getBalance,
  getNetworkState,
  accountCreationFee,
  sendTransaction,
  fetchEvents,
  FeePayerSpec,
};
interface TransactionId {
  wait(): Promise<void>;
}

interface Transaction {
  transaction: Parties;
  toJSON(): string;
  toGraphqlQuery(): string;
  sign(additionalKeys?: PrivateKey[]): Transaction;
  prove(): Promise<(Proof<ZkappPublicInput> | undefined)[]>;
  send(): TransactionId;
}

type Account = Fetch.Account;

type FetchMode = 'fetch' | 'cached' | 'test';
type CurrentTransaction = {
  sender?: PrivateKey;
  parties: Party[];
  fetchMode: FetchMode;
  isFinalRunOutsideCircuit: boolean;
};

let currentTransaction = Context.create<CurrentTransaction>();

type FeePayerSpec =
  | PrivateKey
  | { feePayerKey: PrivateKey; fee?: number | string | UInt64; memo?: string }
  | undefined;

function reportGetAccountError(publicKey: string, tokenId: string) {
  if (tokenId === Ledger.fieldToBase58(getDefaultTokenId())) {
    return `getAccount: Could not find account for public key ${publicKey}`;
  } else {
    return `getAccount: Could not find account for public key ${publicKey} with the tokenId ${tokenId}`;
  }
}

function createTransaction(
  feePayer: FeePayerSpec,
  f: () => unknown,
  { fetchMode = 'cached' as FetchMode, isFinalRunOutsideCircuit = true } = {}
): Transaction {
  if (currentTransaction.has()) {
    throw new Error('Cannot start new transaction within another transaction');
  }
  let feePayerKey =
    feePayer instanceof PrivateKey ? feePayer : feePayer?.feePayerKey;
  let fee = feePayer instanceof PrivateKey ? undefined : feePayer?.fee;
  let memo = feePayer instanceof PrivateKey ? '' : feePayer?.memo ?? '';

  let transactionId = currentTransaction.enter({
    sender: feePayerKey,
    parties: [],
    fetchMode,
    isFinalRunOutsideCircuit,
  });

  // run circuit
  // we have this while(true) loop because one of the smart contracts we're calling inside `f` might be calling
  // SmartContract.analyzeMethods, which would be running its methods again inside `Circuit.constraintSystem`, which
  // would throw an error when nested inside `Circuit.runAndCheck`. So if that happens, we have to run `analyzeMethods` first
  // and retry `Circuit.runAndCheck(f)`. Since at this point in the function, we don't know which smart contracts are involved,
  // we created that hack with a `bootstrap()` function that analyzeMethods sticks on the error, to call itself again.
  try {
    let err: any;
    while (true) {
      if (err !== undefined) err.bootstrap();
      try {
        snarkContext.runWith({ inRunAndCheck: true }, () =>
          Circuit.runAndCheck(f)
        );
        break;
      } catch (err_) {
        if ((err_ as any)?.bootstrap) err = err_;
        else throw err_;
      }
    }
  } catch (err) {
    currentTransaction.leave(transactionId);
    throw err;
  }
  let otherParties = CallForest.toFlatList(currentTransaction.get().parties);
  try {
    // check that on-chain values weren't used without setting a precondition
    for (let party of otherParties) {
      assertPreconditionInvariants(party);
    }
  } catch (err) {
    currentTransaction.leave(transactionId);
    throw err;
  }

  let feePayerParty: FeePayerUnsigned;
  if (feePayerKey !== undefined) {
    // if senderKey is provided, fetch account to get nonce and mark to be signed
    let senderAddress = feePayerKey.toPublicKey();
    let senderAccount = getAccount(senderAddress, getDefaultTokenId());
    feePayerParty = Party.defaultFeePayer(
      senderAddress,
      feePayerKey,
      senderAccount.nonce
    );
    if (fee !== undefined) {
      feePayerParty.body.fee =
        fee instanceof UInt64 ? fee : UInt64.fromString(String(fee));
    }
  } else {
    // otherwise use a dummy fee payer that has to be filled in later
    feePayerParty = Party.dummyFeePayer();
  }

  let transaction: Parties = { otherParties, feePayer: feePayerParty, memo };

  currentTransaction.leave(transactionId);
  let self: Transaction = {
    transaction,

    sign(additionalKeys?: PrivateKey[]) {
      self.transaction = addMissingSignatures(self.transaction, additionalKeys);
      return self;
    },

    async prove() {
      let { parties, proofs } = await addMissingProofs(self.transaction);
      self.transaction = parties;
      return proofs;
    },

    toJSON() {
      let json = partiesToJson(self.transaction);
      return JSON.stringify(json);
    },

    toGraphqlQuery() {
      return Fetch.sendZkappQuery(self.toJSON());
    },

    send() {
      return sendTransaction(self);
    },
  };
  return self;
}

interface Mina {
  transaction(sender: FeePayerSpec, f: () => void): Promise<Transaction>;
  currentSlot(): UInt32;
  getAccount(publicKey: PublicKey, tokenId?: Field): Account;
  getNetworkState(): NetworkValue;
  accountCreationFee(): UInt64;
  sendTransaction(transaction: Transaction): TransactionId;
  fetchEvents: (publicKey: PublicKey, tokenId?: Field) => any;
}

interface MockMina extends Mina {
  addAccount(publicKey: PublicKey, balance: string): void;
  /**
   * An array of 10 test accounts that have been pre-filled with
   * 30000000000 units of currency.
   */
  testAccounts: Array<{ publicKey: PublicKey; privateKey: PrivateKey }>;
  applyJsonTransaction: (tx: string) => void;
  setTimestamp: (ms: UInt64) => void;
  setGlobalSlot: (slot: UInt32) => void;
  setGlobalSlotSinceHardfork: (slot: UInt32) => void;
  setBlockchainLength: (height: UInt32) => void;
  setTotalCurrency: (currency: UInt32) => void;
}

const defaultAccountCreationFee = 1_000_000_000;

/**
 * A mock Mina blockchain running locally and useful for testing.
 */
function LocalBlockchain({
  accountCreationFee = defaultAccountCreationFee as string | number,
} = {}): MockMina {
  const msPerSlot = 3 * 60 * 1000;
  const startTime = new Date().valueOf();

  const ledger = Ledger.create([]);

  let networkState = defaultNetworkState();

  function addAccount(pk: PublicKey, balance: string) {
    ledger.addAccount(pk, balance);
  }

  let testAccounts: any[] = [];
  for (let i = 0; i < 10; ++i) {
    const largeValue = '30000000000';
    const k = PrivateKey.random();
    const pk = k.toPublicKey();
    addAccount(pk, largeValue);
    testAccounts.push({ privateKey: k, publicKey: pk });
  }

  const events: Record<string, any> = {};

  return {
    accountCreationFee: () => UInt64.from(accountCreationFee),
    currentSlot() {
      return UInt32.fromNumber(
        Math.ceil((new Date().valueOf() - startTime) / msPerSlot)
      );
    },
    getAccount(
      publicKey: PublicKey,
      tokenId: Field = getDefaultTokenId()
    ): Account {
      let ledgerAccount = ledger.getAccount(publicKey, tokenId);
      if (ledgerAccount == undefined) {
        throw new Error(
          reportGetAccountError(
            publicKey.toBase58(),
            Ledger.fieldToBase58(tokenId)
          )
        );
      } else {
        return {
          publicKey: publicKey,
          tokenId,
          balance: new UInt64(ledgerAccount.balance.value),
          nonce: new UInt32(ledgerAccount.nonce.value),
          zkapp: ledgerAccount.zkapp,
          tokenSymbol: ledgerAccount.tokenSymbol,
        };
      }
    },
    getNetworkState() {
      return networkState;
    },
    sendTransaction(txn: Transaction) {
      txn.sign();

      let partiesJson = partiesToJson(txn.transaction);

      ledger.applyJsonTransaction(
        JSON.stringify(partiesJson),
        String(accountCreationFee),
        JSON.stringify(getNetworkPreconditions(networkState))
      );

      // fetches all events from the transaction and stores them
      // events are identified and associated with a publicKey and tokenId
      partiesJson.otherParties.forEach((p) => {
        let addr = p.body.publicKey;
        let tokenId = p.body.tokenId;
        if (events[addr] === undefined) {
          events[addr] = {};
        }
        if (p.body.events.length > 0) {
          if (events[addr][tokenId] === undefined) {
            events[addr][tokenId] = [];
          }
          events[addr][tokenId].push({
            events: p.body.events,
            slot: currentSlot().toString(), // TODO: use block when implemented
          });
        }
      });

      return { wait: async () => {} };
    },
    async transaction(sender: FeePayerSpec, f: () => void) {
      // bad hack: run transaction just to see whether it creates proofs
      // if it doesn't, this is the last chance to run SmartContract.runOutsideCircuit, which is supposed to run only once
      // TODO: this has obvious holes if multiple zkapps are involved, but not relevant currently because we can't prove with multiple parties
      // and hopefully with upcoming work by Matt we can just run everything in the prover, and nowhere else
      let tx = createTransaction(sender, f, {
        isFinalRunOutsideCircuit: false,
      });
      let hasProofs = tx.transaction.otherParties.some(
        Authorization.hasLazyProof
      );
      return createTransaction(sender, f, {
        isFinalRunOutsideCircuit: !hasProofs,
      });
    },
    applyJsonTransaction(json: string) {
      return ledger.applyJsonTransaction(
        json,
        String(accountCreationFee),
        JSON.stringify(getNetworkPreconditions(defaultNetworkState()))
      );
    },
    async fetchEvents(
      publicKey: PublicKey,
      tokenId: Field = getDefaultTokenId()
    ): Promise<any[]> {
      return (
        events?.[publicKey.toBase58()]?.[Ledger.fieldToBase58(tokenId)] ?? []
      );
    },
    addAccount,
    testAccounts,
    setTimestamp(ms: UInt64) {
      networkState.timestamp = ms;
    },
    setGlobalSlot(slot: UInt32) {
      networkState.globalSlotSinceGenesis = slot;
    },
    setGlobalSlotSinceHardfork(slot: UInt32) {
      networkState.globalSlotSinceHardFork = slot;
    },
    setBlockchainLength(height: UInt32) {
      networkState.blockchainLength = height;
    },
    setTotalCurrency(currency: UInt32) {
      networkState.totalCurrency = currency;
    },
  };
}

function RemoteBlockchain(graphqlEndpoint: string): Mina {
  let accountCreationFee = UInt64.from(defaultAccountCreationFee);
  Fetch.setGraphqlEndpoint(graphqlEndpoint);
  return {
    accountCreationFee: () => accountCreationFee,
    currentSlot() {
      throw Error(
        'currentSlot() is not implemented yet for remote blockchains.'
      );
    },
    getAccount(publicKey: PublicKey, tokenId: Field = getDefaultTokenId()) {
      if (currentTransaction()?.fetchMode === 'test') {
        Fetch.markAccountToBeFetched(publicKey, tokenId, graphqlEndpoint);
        let account = Fetch.getCachedAccount(
          publicKey,
          tokenId,
          graphqlEndpoint
        );
        return account ?? dummyAccount(publicKey);
      }
      if (
        !currentTransaction.has() ||
        currentTransaction.get().fetchMode === 'cached'
      ) {
        let account = Fetch.getCachedAccount(
          publicKey,
          tokenId,
          graphqlEndpoint
        );
        if (account !== undefined) return account;
      }
      throw Error(
        `${reportGetAccountError(
          publicKey.toBase58(),
          Ledger.fieldToBase58(tokenId)
        )}\nGraphql endpoint: ${graphqlEndpoint}`
      );
    },
    getNetworkState() {
      if (currentTransaction()?.fetchMode === 'test') {
        Fetch.markNetworkToBeFetched(graphqlEndpoint);
        let network = Fetch.getCachedNetwork(graphqlEndpoint);
        return network ?? defaultNetworkState();
      }
      if (
        !currentTransaction.has() ||
        currentTransaction.get().fetchMode === 'cached'
      ) {
        let network = Fetch.getCachedNetwork(graphqlEndpoint);
        if (network !== undefined) return network;
      }
      throw Error(
        `getNetworkState: Could not fetch network state from graphql endpoint ${graphqlEndpoint}`
      );
    },
    sendTransaction(txn: Transaction) {
      txn.sign();
      let sendPromise = Fetch.sendZkapp(txn.toJSON());
      return {
        async wait() {
          let [response, error] = await sendPromise;
          if (error === undefined) {
            if (
              response!.data === null &&
              (response as any).errors?.length > 0
            ) {
              console.log('got graphql errors', (response as any).errors);
            } else {
              console.log('got graphql response', response?.data);
              console.log(
                'Info: waiting for inclusion in a block is not implemented yet.'
              );
            }
          } else {
            console.log('got fetch error', error);
          }
        },
      };
    },
    async transaction(sender: FeePayerSpec, f: () => void) {
      let tx = createTransaction(sender, f, {
        fetchMode: 'test',
        isFinalRunOutsideCircuit: false,
      });
      await Fetch.fetchMissingData(graphqlEndpoint);
      let hasProofs = tx.transaction.otherParties.some(
        Authorization.hasLazyProof
      );
      return createTransaction(sender, f, {
        fetchMode: 'cached',
        isFinalRunOutsideCircuit: !hasProofs,
      });
    },
    async fetchEvents() {
      throw Error(
        'fetchEvents() is not implemented yet for remote blockchains.'
      );
    },
  };
}

function BerkeleyQANet(graphqlEndpoint: string) {
  return RemoteBlockchain(graphqlEndpoint);
}

let activeInstance: Mina = {
  accountCreationFee: () => UInt64.from(defaultAccountCreationFee),
  currentSlot: () => {
    throw new Error('must call Mina.setActiveInstance first');
  },
  getAccount: (publicKey: PublicKey, tokenId: Field = getDefaultTokenId()) => {
    if (currentTransaction()?.fetchMode === 'test') {
      Fetch.markAccountToBeFetched(
        publicKey,
        tokenId,
        Fetch.defaultGraphqlEndpoint
      );
      return dummyAccount(publicKey);
    }
    if (
      !currentTransaction.has() ||
      currentTransaction.get().fetchMode === 'cached'
    ) {
      let account = Fetch.getCachedAccount(
        publicKey,
        tokenId,
        Fetch.defaultGraphqlEndpoint
      );
      if (account === undefined)
        throw Error(
          `${reportGetAccountError(
            publicKey.toBase58(),
            Ledger.fieldToBase58(tokenId)
          )}\n\nEither call Mina.setActiveInstance first or explicitly add the account with addCachedAccount`
        );
      return account;
    }
    throw new Error('must call Mina.setActiveInstance first');
  },
  getNetworkState() {
    throw new Error('must call Mina.setActiveInstance first');
  },
  sendTransaction() {
    throw new Error('must call Mina.setActiveInstance first');
  },
  async transaction(sender: FeePayerSpec, f: () => void) {
    return createTransaction(sender, f);
  },
  fetchEvents() {
    throw Error('must call Mina.setActiveInstance first');
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
 * transaction(() => {
 *   myZkapp.update();
 *   someOtherZkapp.someOtherMethod();
 * })
 * ```
 *
 * @return A transaction that can subsequently be submitted to the chain.
 */
function transaction(f: () => void): Promise<Transaction>;
function transaction(sender: FeePayerSpec, f: () => void): Promise<Transaction>;
function transaction(
  senderOrF: FeePayerSpec | (() => void),
  fOrUndefined?: () => void
): Promise<Transaction> {
  let sender: FeePayerSpec;
  let f: () => void;
  if (fOrUndefined !== undefined) {
    sender = senderOrF as FeePayerSpec;
    f = fOrUndefined;
  } else {
    sender = undefined;
    f = senderOrF as () => void;
  }
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
function getAccount(publicKey: PublicKey, tokenId?: Field): Account {
  return activeInstance.getAccount(publicKey, tokenId);
}

/**
 * @return Data associated with the current state of the Mina network.
 */
function getNetworkState() {
  return activeInstance.getNetworkState();
}

/**
 * @return The balance associated to the given public key.
 */
function getBalance(publicKey: PublicKey, tokenId?: Field) {
  return activeInstance.getAccount(publicKey, tokenId).balance;
}

function accountCreationFee() {
  return activeInstance.accountCreationFee();
}

function sendTransaction(txn: Transaction) {
  return activeInstance.sendTransaction(txn);
}

/**
 * @return A list of emitted events associated to the given public key.
 */
async function fetchEvents(publicKey: PublicKey, tokenId: Field) {
  return await activeInstance.fetchEvents(publicKey, tokenId);
}

function dummyAccount(pubkey?: PublicKey): Account {
  return {
    balance: UInt64.zero,
    nonce: UInt32.zero,
    publicKey: pubkey ?? PublicKey.empty(),
    tokenId: getDefaultTokenId(),
    zkapp: { appState: Array(ZkappStateLength).fill(Field.zero) },
    tokenSymbol: '',
  };
}

interface DynamicPreconditions {
  timestamp: string;
  blockchainLength: string;
  totalCurrency: string;
  globalSlotSinceHardFork: string;
  globalSlotSinceGenesis: string;
}

function getNetworkPreconditions(network: NetworkValue): DynamicPreconditions {
  return {
    timestamp: network.timestamp.toString(),
    blockchainLength: network.blockchainLength.toString(),
    totalCurrency: network.totalCurrency.toString(),
    globalSlotSinceHardFork: network.globalSlotSinceHardFork.toString(),
    globalSlotSinceGenesis: network.globalSlotSinceGenesis.toString(),
  };
}

function defaultNetworkState(): NetworkValue {
  let epochData: NetworkValue['stakingEpochData'] = {
    ledger: { hash: Field.zero, totalCurrency: UInt64.zero },
    seed: Field.zero,
    startCheckpoint: Field.zero,
    lockCheckpoint: Field.zero,
    epochLength: UInt32.zero,
  };
  return {
    snarkedLedgerHash: Field.zero,
    timestamp: UInt64.zero,
    blockchainLength: UInt32.zero,
    minWindowDensity: UInt32.zero,
    totalCurrency: UInt64.zero,
    globalSlotSinceHardFork: UInt32.zero,
    globalSlotSinceGenesis: UInt32.zero,
    stakingEpochData: epochData,
    nextEpochData: cloneCircuitValue(epochData),
  };
}
