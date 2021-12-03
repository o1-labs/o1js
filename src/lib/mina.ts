// This is for an account where any of a list of public keys can update the state

import { CircuitValue } from './circuit_value';
import {
  Circuit,
  Ledger,
  Field,
  Bool,
  AccountPredicate_ as AccountPredicate,
  FullAccountPredicate_ as FullAccountPredicate,
  FeePayerParty,
  Parties,
  PartyBody as SnarkyBody,
  Party_ as SnarkyParty,
} from '../snarky';
import { UInt32, UInt64 } from './int';
import { PrivateKey, PublicKey } from './signature';
import {
  Body,
  EpochDataPredicate,
  Party,
  ProtocolStatePredicate,
} from './party';

export interface TransactionId {
  wait(): Promise<void>;
}

export interface Transaction {
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

type PartyPredicate = UInt32 | FullAccountPredicate | void;

export let currentTransaction:
  | {
      sender: PrivateKey;
      parties: Array<{ body: Body; predicate: PartyPredicate }>;
      nextPartyIndex: number;
      protocolState: ProtocolStatePredicate;
    }
  | undefined = undefined;

interface Mina {
  transaction(sender: PrivateKey, f: () => void | Promise<void>): Transaction;
  currentSlot(): UInt32;
  getAccount(publicKey: PublicKey): Promise<Account>;
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

  const getAccount = (pk: PublicKey): Promise<Account> => {
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
      return new Promise((r) => r(a));
    }
  };

  function epochData(d: EpochDataPredicate) {
    return {
      ledger: {
        hash: d.ledger.hash_,
        totalCurrency: d.ledger.totalCurrency,
      },
      seed: d.seed_,
      startCheckpoint: d.startCheckpoint_,
      lockCheckpoint: d.lockCheckpoint_,
      epochLength: d.epochLength,
    };
  }

  const body = (b: Body): SnarkyBody => {
    return {
      publicKey: b.publicKey,
      update: b.update,
      tokenId: b.tokenId,
      delta: b.delta,
      // TODO: events
      events: [],
      sequenceEvents: [],
      // TODO: calldata
      callData: Field.zero,
      // TODO
      depth: 0,
    };
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
      protocolState: ProtocolStatePredicate.ignoreAll(),
    };

    const result = Circuit.runAndCheck(() => {
      const res = f();
      if (res instanceof Promise) {
        return res.then(() => {
          return () => {};
        });
      } else {
        const r: Promise<() => void> = new Promise((k) => k(() => {}));
        return r;
      }
    }).catch((err) => {
      currentTransaction = undefined;
      // TODO would be nice if the error would be a bit more descriptive about what failed
      throw err;
    });

    const senderPubkey = sender.toPublicKey();
    const txn = result
      .then(() => getAccount(senderPubkey))
      .then((senderAccount) => {
        if (currentTransaction === undefined) {
          throw new Error('Transaction is undefined');
        }

        const otherParties: Array<SnarkyParty> = currentTransaction.parties.map(
          (p) => {
            let predicate: AccountPredicate;
            if (p.predicate instanceof UInt32) {
              predicate = { type: 'nonce', value: p.predicate };
            } else if (p.predicate === undefined) {
              predicate = { type: 'accept' };
            } else {
              predicate = { type: 'full', value: p.predicate };
            }

            return {
              body: body(p.body),
              predicate,
            };
          }
        );

        const feePayer: FeePayerParty = {
          body: body(Body.keepAll(senderPubkey)),
          predicate: senderAccount.nonce,
        };

        const ps = currentTransaction.protocolState;

        const txn: Parties = {
          protocolState: {
            snarkedLedgerHash: ps.snarkedLedgerHash_,
            snarkedNextAvailableToken: ps.snarkedNextAvailableToken,
            timestamp: ps.timestamp,
            blockchainLength: ps.blockchainLength,
            minWindowDensity: ps.minWindowDensity,
            lastVrfOutput: ps.lastVrfOutput_,
            totalCurrency: ps.totalCurrency,
            globalSlotSinceGenesis: ps.globalSlotSinceGenesis,
            globalSlotSinceHardFork: ps.globalSlotSinceHardFork,
            nextEpochData: epochData(ps.nextEpochData),
            stakingEpochData: epochData(ps.stakingEpochData),
          },
          otherParties,
          feePayer,
        };

        nextTransactionId.value += 1;
        currentTransaction = undefined;
        return txn;
      });

    return {
      send: () => {
        const res = txn.then((txn) => ledger.applyPartiesTransaction(txn));
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
export function getAccount(pubkey: PublicKey): Promise<Account> {
  return activeInstance.getAccount(pubkey);
}

/**
 * @return The balance associated to the given public key.
 */
export function getBalance(pubkey: PublicKey): Promise<UInt64> {
  return activeInstance.getAccount(pubkey).then((a) => a.balance);
}
