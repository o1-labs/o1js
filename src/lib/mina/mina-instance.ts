/**
 * This module holds the global Mina instance and its interface.
 */
import { Field } from '../provable/wrapped.js';
import { UInt64, UInt32 } from '../provable/int.js';
import { PublicKey } from '../provable/crypto/signature.js';
import type { EventActionFilterOptions } from '././../mina/graphql.js';
import type { NetworkId } from '../../mina-signer/src/types.js';
import type { Account } from './account.js';
import type { NetworkValue } from './precondition.js';
import type * as Fetch from './fetch.js';
import type {
  TransactionPromise,
  PendingTransactionPromise,
  Transaction,
} from './transaction.js';

export {
  Mina,
  FeePayerSpec,
  ActionStates,
  NetworkConstants,
  defaultNetworkConstants,
  activeInstance,
  setActiveInstance,
  ZkappStateLength,
  currentSlot,
  getAccount,
  hasAccount,
  getBalance,
  getNetworkId,
  getNetworkConstants,
  getNetworkState,
  fetchEvents,
  fetchActions,
  getActions,
  getProofsEnabled,
};

const defaultAccountCreationFee = 1_000_000_000;
const defaultNetworkConstants: NetworkConstants = {
  genesisTimestamp: UInt64.from(0),
  slotTime: UInt64.from(3 * 60 * 1000),
  accountCreationFee: UInt64.from(defaultAccountCreationFee),
};

const ZkappStateLength = 8;

/**
 * Allows you to specify information about the fee payer account and the transaction.
 */
type FeePayerSpec =
  | PublicKey
  | {
      sender: PublicKey;
      fee?: number | string | UInt64;
      memo?: string;
      nonce?: number;
    }
  | undefined;

type ActionStates = {
  fromActionState?: Field;
  endActionState?: Field;
};

type NetworkConstants = {
  genesisTimestamp: UInt64;
  /**
   * Duration of 1 slot in millisecondw
   */
  slotTime: UInt64;
  accountCreationFee: UInt64;
};

type Mina = {
  transaction(
    sender: FeePayerSpec,
    f: () => Promise<void>
  ): TransactionPromise<false, false>;
  currentSlot(): UInt32;
  hasAccount(publicKey: PublicKey, tokenId?: Field): boolean;
  getAccount(publicKey: PublicKey, tokenId?: Field): Account;
  getNetworkState(): NetworkValue;
  getNetworkConstants(): NetworkConstants;
  sendTransaction(
    transaction: Transaction<boolean, boolean>
  ): PendingTransactionPromise;
  fetchEvents: (
    publicKey: PublicKey,
    tokenId?: Field,
    filterOptions?: EventActionFilterOptions
  ) => ReturnType<typeof Fetch.fetchEvents>;
  fetchActions: (
    publicKey: PublicKey,
    actionStates?: ActionStates,
    tokenId?: Field
  ) => ReturnType<typeof Fetch.fetchActions>;
  getActions: (
    publicKey: PublicKey,
    actionStates?: ActionStates,
    tokenId?: Field
  ) => { hash: string; actions: string[][] }[];
  proofsEnabled: boolean;
  getNetworkId(): NetworkId;
};

let activeInstance: Mina = {
  getNetworkConstants: () => defaultNetworkConstants,
  currentSlot: noActiveInstance,
  hasAccount: noActiveInstance,
  getAccount: noActiveInstance,
  getNetworkState: noActiveInstance,
  sendTransaction: noActiveInstance,
  transaction: noActiveInstance,
  fetchEvents: noActiveInstance,
  fetchActions: noActiveInstance,
  getActions: noActiveInstance,
  proofsEnabled: true,
  getNetworkId: () => 'testnet',
};

/**
 * Set the currently used Mina instance.
 */
function setActiveInstance(m: Mina) {
  activeInstance = m;
}

function noActiveInstance(): never {
  throw Error('Must call Mina.setActiveInstance first');
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
 * Checks if an account exists within the ledger.
 */
function hasAccount(publicKey: PublicKey, tokenId?: Field): boolean {
  return activeInstance.hasAccount(publicKey, tokenId);
}

/**
 * @return The current Mina network ID.
 */
function getNetworkId() {
  return activeInstance.getNetworkId();
}

/**
 * @return Data associated with the current Mina network constants.
 */
function getNetworkConstants() {
  return activeInstance.getNetworkConstants();
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

/**
 * @return A list of emitted events associated to the given public key.
 */
async function fetchEvents(
  publicKey: PublicKey,
  tokenId: Field,
  filterOptions: EventActionFilterOptions = {}
) {
  return await activeInstance.fetchEvents(publicKey, tokenId, filterOptions);
}

/**
 * @return A list of emitted sequencing actions associated to the given public key.
 */
async function fetchActions(
  publicKey: PublicKey,
  actionStates?: ActionStates,
  tokenId?: Field
) {
  return await activeInstance.fetchActions(publicKey, actionStates, tokenId);
}

/**
 * @return A list of emitted sequencing actions associated to the given public key.
 */
function getActions(
  publicKey: PublicKey,
  actionStates?: ActionStates,
  tokenId?: Field
) {
  return activeInstance.getActions(publicKey, actionStates, tokenId);
}

function getProofsEnabled() {
  return activeInstance.proofsEnabled;
}
