/**
 * This module holds the global Mina instance and its interface.
 */
import type { Field } from '../field.js';
import { UInt64, UInt32 } from '../int.js';
import type { PublicKey, PrivateKey } from '../signature.js';
import type { Transaction, TransactionId } from '../mina.js';
import type { Account } from './account.js';
import type { NetworkValue } from '../precondition.js';
import type * as Fetch from '../fetch.js';

export {
  Mina,
  FeePayerSpec,
  DeprecatedFeePayerSpec,
  ActionStates,
  activeInstance,
  setActiveInstance,
  ZkappStateLength,
};

const defaultAccountCreationFee = 1_000_000_000;
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

type DeprecatedFeePayerSpec =
  | PublicKey
  | PrivateKey
  | ((
      | {
          feePayerKey: PrivateKey;
          sender?: PublicKey;
        }
      | {
          feePayerKey?: PrivateKey;
          sender: PublicKey;
        }
    ) & {
      fee?: number | string | UInt64;
      memo?: string;
      nonce?: number;
    })
  | undefined;

type ActionStates = {
  fromActionState?: Field;
  endActionState?: Field;
};

interface Mina {
  transaction(
    sender: DeprecatedFeePayerSpec,
    f: () => void
  ): Promise<Transaction>;
  currentSlot(): UInt32;
  hasAccount(publicKey: PublicKey, tokenId?: Field): boolean;
  getAccount(publicKey: PublicKey, tokenId?: Field): Account;
  getNetworkState(): NetworkValue;
  getNetworkConstants(): {
    genesisTimestamp: UInt64;
    /**
     * Duration of 1 slot in millisecondw
     */
    slotTime: UInt64;
    accountCreationFee: UInt64;
  };
  accountCreationFee(): UInt64;
  sendTransaction(transaction: Transaction): Promise<TransactionId>;
  fetchEvents: (
    publicKey: PublicKey,
    tokenId?: Field,
    filterOptions?: Fetch.EventActionFilterOptions
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
}

let activeInstance: Mina = {
  accountCreationFee: () => UInt64.from(defaultAccountCreationFee),
  getNetworkConstants: noActiveInstance,
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
