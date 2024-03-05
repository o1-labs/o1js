import {
  ZkappCommand,
  AccountUpdate,
  ZkappPublicInput,
  AccountUpdateLayout,
  FeePayerUnsigned,
  addMissingSignatures,
  TokenId,
  addMissingProofs,
} from '../account-update.js';
import { prettifyStacktrace } from '../errors.js';
import { Field } from '../core.js';
import { PrivateKey, PublicKey } from '../signature.js';
import { UInt32, UInt64 } from '../int.js';
import { Empty, Proof } from '../proof-system.js';
import { currentTransaction } from './transaction-context.js';
import { Provable } from '../provable.js';
import { assertPreconditionInvariants } from '../precondition.js';
import { Account } from './account.js';
import {
  type DeprecatedFeePayerSpec,
  type FeePayerSpec,
  activeInstance,
} from './mina-instance.js';
import * as Fetch from '../fetch.js';
import { type SendZkAppResponse, sendZkappQuery } from './graphql.js';
import { type FetchMode } from './transaction-context.js';

export {
  type Transaction,
  type PendingTransaction,
  type IncludedTransaction,
  type RejectedTransaction,
  createTransaction,
  sendTransaction,
  newTransaction,
  getAccount,
  transaction,
  createIncludedOrRejectedTransaction,
};

/**
 * Defines the structure and operations associated with a transaction.
 * This type encompasses methods for serializing the transaction, signing it, generating proofs,
 * and submitting it to the network.
 */
type Transaction = {
  /**
   * Transaction structure used to describe a state transition on the Mina blockchain.
   */
  transaction: ZkappCommand;
  /**
   * Serializes the transaction to a JSON string.
   * @returns A string representation of the {@link Transaction}.
   */
  toJSON(): string;
  /**
   * Produces a pretty-printed JSON representation of the {@link Transaction}.
   * @returns A formatted string representing the transaction in JSON.
   */
  toPretty(): any;
  /**
   * Constructs the GraphQL query string used for submitting the transaction to a Mina daemon.
   * @returns The GraphQL query string for the {@link Transaction}.
   */
  toGraphqlQuery(): string;
  /**
   * Signs all {@link AccountUpdate}s included in the {@link Transaction} that require a signature.
   * {@link AccountUpdate}s that require a signature can be specified with `{AccountUpdate|SmartContract}.requireSignature()`.
   * @param additionalKeys The list of keys that should be used to sign the {@link Transaction}
   * @returns The {@link Transaction} instance with all required signatures applied.
   * @example
   * ```ts
   * const signedTx = transaction.sign([userPrivateKey]);
   * console.log('Transaction signed successfully.');
   * ```
   */
  sign(additionalKeys?: PrivateKey[]): Transaction;
  /**
   * Initiates the proof generation process for the {@link Transaction}. This asynchronous operation is
   * crucial for zero-knowledge-based transactions, where proofs are required to validate state transitions.
   * This can take some time.
   * @example
   * ```ts
   * await transaction.prove();
   * ```
   */
  prove(): Promise<(Proof<ZkappPublicInput, Empty> | undefined)[]>;
  /**
   * Submits the {@link Transaction} to the network. This method asynchronously sends the transaction
   * for processing and returns a {@link PendingTransaction} instance, which can be used to monitor its progress.
   * @returns A promise that resolves to a {@link PendingTransaction} instance representing the submitted transaction.
   * @example
   * ```ts
   * const pendingTransaction = await transaction.send();
   * console.log('Transaction sent successfully to the Mina daemon.');
   * ```
   */
  send(): Promise<PendingTransaction>;

  /**
   * Sends the {@link Transaction} to the network, unlike the standard send(), this function will throw an error if internal errors are detected.
   * @throws {Error} If the transaction fails to be sent to the Mina daemon or if it encounters errors during processing.
   * @example
   * ```ts
   * try {
   *  const pendingTransaction = await transaction.send();
   *  console.log('Transaction sent successfully to the Mina daemon.');
   * } catch (error) {
   *  console.error('Transaction failed with errors:', error);
   * }
   * ```
   */
  sendSafe(): Promise<PendingTransaction | RejectedTransaction>;
};

/**
 * Represents a transaction that has been submitted to the blockchain but has not yet reached a final state.
 * The {@link PendingTransaction} type extends certain functionalities from the base {@link Transaction} type,
 * adding methods to monitor the transaction's progress towards being finalized (either included in a block or rejected).
 */
type PendingTransaction = Pick<
  Transaction,
  'transaction' | 'toJSON' | 'toPretty'
> & {
  /**
   * @property {boolean} isSuccess Indicates whether the transaction was successfully sent to the Mina daemon.
   * It does not guarantee inclusion in a block. A value of `true` means the transaction was accepted by the Mina daemon for processing.
   * However, the transaction may still be rejected later during the finalization process if it fails to be included in a block.
   * Use `.wait()` or `.waitOrThrowIfError()` methods to determine the final state of the transaction.
   * @example
   * ```ts
   * if (pendingTransaction.isSuccess) {
   *   console.log('Transaction sent successfully to the Mina daemon.');
   *   try {
   *     await pendingTransaction.waitOrThrowIfError();
   *     console.log('Transaction was included in a block.');
   *   } catch (error) {
   *     console.error('Transaction was rejected or failed to be included in a block:', error);
   *   }
   * } else {
   *   console.error('Failed to send transaction to the Mina daemon.');
   * }
   * ```
   */
  isSuccess: boolean;

  /**
   * Waits for the transaction to be finalized and returns the result.
   * @param {Object} [options] Configuration options for polling behavior.
   * @param {number} [options.maxAttempts] The maximum number of attempts to check the transaction status.
   * @param {number} [options.interval] The interval, in milliseconds, between status checks.
   * @returns {Promise<IncludedTransaction | RejectedTransaction>} A promise that resolves to the transaction's final state.
   * @example
   * ```ts
   * const transaction = await pendingTransaction.wait({ maxAttempts: 5, interval: 1000 });
   * console.log(transaction.status); // 'included' or 'rejected'
   * ```
   */
  wait(options?: {
    maxAttempts?: number;
    interval?: number;
  }): Promise<IncludedTransaction | RejectedTransaction>;

  /**
   * Similar to `wait`, but throws an error if the transaction is rejected or if it fails to finalize within the given attempts.
   * @param {Object} [options] Configuration options for polling behavior.
   * @param {number} [options.maxAttempts] The maximum number of polling attempts.
   * @param {number} [options.interval] The time interval, in milliseconds, between each polling attempt.
   * @returns {Promise<IncludedTransaction | RejectedTransaction>} A promise that resolves to the transaction's final state or throws an error.
   * @example
   * ```ts
   * try {
   *   const transaction = await pendingTransaction.waitOrThrowIfError({ maxAttempts: 10, interval: 2000 });
   *   console.log('Transaction included in a block.');
   * } catch (error) {
   *   console.error('Transaction rejected or failed to finalize:', error);
   * }
   * ```
   */
  waitOrThrowIfError(options?: {
    maxAttempts?: number;
    interval?: number;
  }): Promise<IncludedTransaction | RejectedTransaction>;

  /**
   * Returns the transaction hash as a string identifier.
   * @property {string} The hash of the transaction.
   * @example
   * ```ts
   * const txHash = pendingTransaction.hash;
   * console.log(`Transaction hash: ${txHash}`);
   * ```
   */
  hash: string;

  /**
   * Optional. Contains response data from a ZkApp transaction submission.
   *
   * @property {SendZkAppResponse} [data] The response data from the transaction submission.
   */
  data?: SendZkAppResponse;

  /**
   * An array of error messages related to the transaction processing.
   *
   * @property {string[]} errors Descriptive error messages if the transaction encountered issues during processing.
   * @example
   * ```ts
   * if (!pendingTransaction.isSuccess && pendingTransaction.errors.length > 0) {
   *   console.error(`Transaction errors: ${pendingTransaction.errors.join(', ')}`);
   * }
   * ```
   */
  errors: string[];
};

/**
 * Represents a transaction that has been successfully included in a block.
 */
type IncludedTransaction = Pick<
  PendingTransaction,
  'transaction' | 'toJSON' | 'toPretty' | 'hash' | 'data'
> & {
  /**
   * @property {string} status The final status of the transaction, indicating successful inclusion in a block.
   * @example
   * ```ts
   * const includedTx: IncludedTransaction = await pendingTransaction.wait();
   * if (includedTx.status === 'included') {
   *   console.log(`Transaction ${includedTx.hash()} included in a block.`);
   * }
   * ```
   */
  status: 'included';
};

/**
 * Represents a transaction that has been rejected and not included in a blockchain block.
 */
type RejectedTransaction = Pick<
  PendingTransaction,
  'transaction' | 'toJSON' | 'toPretty' | 'hash' | 'data'
> & {
  /**
   * @property {string} status The final status of the transaction, specifically indicating that it has been rejected.
   * @example
   * ```ts
   * const rejectedTx: RejectedTransaction = await pendingTransaction.wait();
   * if (rejectedTx.status === 'rejected') {
   *   console.error(`Transaction ${rejectedTx.hash()} was rejected.`);
   *   rejectedTx.errors.forEach((error, i) => {
   *     console.error(`Error ${i + 1}: ${error}`);
   *   });
   * }
   * ```
   */
  status: 'rejected';

  /**
   * @property {string[]} errors An array of error messages detailing the reasons for the transaction's rejection.
   */
  errors: string[];
};

function createTransaction(
  feePayer: DeprecatedFeePayerSpec,
  f: () => unknown,
  numberOfRuns: 0 | 1 | undefined,
  {
    fetchMode = 'cached' as FetchMode,
    isFinalRunOutsideCircuit = true,
    proofsEnabled = true,
  } = {}
): Transaction {
  if (currentTransaction.has()) {
    throw new Error('Cannot start new transaction within another transaction');
  }
  let feePayerSpec: {
    sender?: PublicKey;
    feePayerKey?: PrivateKey;
    fee?: number | string | UInt64;
    memo?: string;
    nonce?: number;
  };
  if (feePayer === undefined) {
    feePayerSpec = {};
  } else if (feePayer instanceof PrivateKey) {
    feePayerSpec = { feePayerKey: feePayer, sender: feePayer.toPublicKey() };
  } else if (feePayer instanceof PublicKey) {
    feePayerSpec = { sender: feePayer };
  } else {
    feePayerSpec = feePayer;
    if (feePayerSpec.sender === undefined)
      feePayerSpec.sender = feePayerSpec.feePayerKey?.toPublicKey();
  }
  let { feePayerKey, sender, fee, memo = '', nonce } = feePayerSpec;

  let transactionId = currentTransaction.enter({
    sender,
    layout: new AccountUpdateLayout(),
    fetchMode,
    isFinalRunOutsideCircuit,
    numberOfRuns,
  });

  // run circuit
  // we have this while(true) loop because one of the smart contracts we're calling inside `f` might be calling
  // SmartContract.analyzeMethods, which would be running its methods again inside `Provable.constraintSystem`, which
  // would throw an error when nested inside `Provable.runAndCheck`. So if that happens, we have to run `analyzeMethods` first
  // and retry `Provable.runAndCheck(f)`. Since at this point in the function, we don't know which smart contracts are involved,
  // we created that hack with a `bootstrap()` function that analyzeMethods sticks on the error, to call itself again.
  try {
    let err: any;
    while (true) {
      if (err !== undefined) err.bootstrap();
      try {
        if (fetchMode === 'test') {
          Provable.runUnchecked(() => {
            f();
            Provable.asProver(() => {
              let tx = currentTransaction.get();
              tx.layout.toConstantInPlace();
            });
          });
        } else {
          f();
        }
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

  let accountUpdates = currentTransaction
    .get()
    .layout.toFlatList({ mutate: true });

  try {
    // check that on-chain values weren't used without setting a precondition
    for (let accountUpdate of accountUpdates) {
      assertPreconditionInvariants(accountUpdate);
    }
  } catch (err) {
    currentTransaction.leave(transactionId);
    throw err;
  }

  let feePayerAccountUpdate: FeePayerUnsigned;
  if (sender !== undefined) {
    // if senderKey is provided, fetch account to get nonce and mark to be signed
    let nonce_;
    let senderAccount = getAccount(sender, TokenId.default);

    if (nonce === undefined) {
      nonce_ = senderAccount.nonce;
    } else {
      nonce_ = UInt32.from(nonce);
      senderAccount.nonce = nonce_;
      Fetch.addCachedAccount(senderAccount);
    }
    feePayerAccountUpdate = AccountUpdate.defaultFeePayer(sender, nonce_);
    if (feePayerKey !== undefined)
      feePayerAccountUpdate.lazyAuthorization!.privateKey = feePayerKey;
    if (fee !== undefined) {
      feePayerAccountUpdate.body.fee =
        fee instanceof UInt64 ? fee : UInt64.from(String(fee));
    }
  } else {
    // otherwise use a dummy fee payer that has to be filled in later
    feePayerAccountUpdate = AccountUpdate.dummyFeePayer();
  }

  let transaction: ZkappCommand = {
    accountUpdates,
    feePayer: feePayerAccountUpdate,
    memo,
  };

  currentTransaction.leave(transactionId);
  return newTransaction(transaction, proofsEnabled);
}

function newTransaction(transaction: ZkappCommand, proofsEnabled?: boolean) {
  let self: Transaction = {
    transaction,
    sign(additionalKeys?: PrivateKey[]) {
      self.transaction = addMissingSignatures(self.transaction, additionalKeys);
      return self;
    },
    async prove() {
      let { zkappCommand, proofs } = await addMissingProofs(self.transaction, {
        proofsEnabled,
      });
      self.transaction = zkappCommand;
      return proofs;
    },
    toJSON() {
      let json = ZkappCommand.toJSON(self.transaction);
      return JSON.stringify(json);
    },
    toPretty() {
      return ZkappCommand.toPretty(self.transaction);
    },
    toGraphqlQuery() {
      return sendZkappQuery(self.toJSON());
    },
    async send() {
      const pendingTransaction = await sendTransaction(self);
      if (pendingTransaction.errors.length > 0) {
        throw Error(
          `Transaction failed with errors:\n- ${pendingTransaction.errors.join(
            '\n- '
          )}`
        );
      }
      return pendingTransaction;
    },
    async sendSafe() {
      const pendingTransaction = await sendTransaction(self);
      if (pendingTransaction.errors.length > 0) {
        return createRejectedTransaction(
          pendingTransaction,
          pendingTransaction.errors
        );
      }
      return pendingTransaction;
    },
  };
  return self;
}

/**
 * Construct a smart contract transaction. Within the callback passed to this function,
 * you can call into the methods of smart contracts.
 *
 * ```
 * let tx = await Mina.transaction(sender, () => {
 *   myZkapp.update();
 *   someOtherZkapp.someOtherMethod();
 * });
 * ```
 *
 * @return A transaction that can subsequently be submitted to the chain.
 */
function transaction(sender: FeePayerSpec, f: () => void): Promise<Transaction>;
function transaction(f: () => void): Promise<Transaction>;
/**
 * @deprecated It's deprecated to pass in the fee payer's private key. Pass in the public key instead.
 * ```
 * // good
 * Mina.transaction(publicKey, ...);
 * Mina.transaction({ sender: publicKey }, ...);
 *
 * // deprecated
 * Mina.transaction(privateKey, ...);
 * Mina.transaction({ feePayerKey: privateKey }, ...);
 * ```
 */
function transaction(
  sender: DeprecatedFeePayerSpec,
  f: () => void
): Promise<Transaction>;
function transaction(
  senderOrF: DeprecatedFeePayerSpec | (() => void),
  fOrUndefined?: () => void
): Promise<Transaction> {
  let sender: DeprecatedFeePayerSpec;
  let f: () => void;
  try {
    if (fOrUndefined !== undefined) {
      sender = senderOrF as DeprecatedFeePayerSpec;
      f = fOrUndefined;
    } else {
      sender = undefined;
      f = senderOrF as () => void;
    }
    return activeInstance.transaction(sender, f);
  } catch (error) {
    throw prettifyStacktrace(error);
  }
}

async function sendTransaction(txn: Transaction) {
  return await activeInstance.sendTransaction(txn);
}

/**
 * @return The account data associated to the given public key.
 */
function getAccount(publicKey: PublicKey, tokenId?: Field): Account {
  return activeInstance.getAccount(publicKey, tokenId);
}

function createRejectedTransaction(
  {
    transaction,
    data,
    toJSON,
    toPretty,
    hash,
  }: Omit<PendingTransaction, 'wait' | 'waitOrThrowIfError'>,
  errors: string[]
): RejectedTransaction {
  return {
    status: 'rejected',
    errors,
    transaction,
    toJSON,
    toPretty,
    hash,
    data,
  };
}

function createIncludedTransaction({
  transaction,
  data,
  toJSON,
  toPretty,
  hash,
}: Omit<
  PendingTransaction,
  'wait' | 'waitOrThrowIfError'
>): IncludedTransaction {
  return {
    status: 'included',
    transaction,
    toJSON,
    toPretty,
    hash,
    data,
  };
}

function createIncludedOrRejectedTransaction(
  transaction: Omit<PendingTransaction, 'wait' | 'waitOrThrowIfError'>,
  errors: string[]
): IncludedTransaction | RejectedTransaction {
  if (errors.length > 0) {
    return createRejectedTransaction(transaction, errors);
  }
  return createIncludedTransaction(transaction);
}
