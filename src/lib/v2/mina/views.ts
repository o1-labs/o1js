// Views into chain-state (ledger and best block)

import { Account, AccountId, AccountIdMap } from './account.js';
import { MinaAmount } from './core.js';
import { Field } from '../../provable/field.js';
import { UInt32 } from '../../provable/int.js';

export interface ChainView {
  snarkedLedgerHash: Field;
  blockchainLength: UInt32;
  minWindowDensity: UInt32;
  totalCurrency: MinaAmount;
  globalSlotSinceGenesis: UInt32;
  stakingEpochData: EpochData;
  nextEpochData: EpochData;
}

export interface EpochData {
  ledger: EpochLedgerData;
  seed: Field;
  startCheckpoint: Field;
  lockCheckpoint: Field;
  epochLength: UInt32;
}

export interface EpochLedgerData {
  hash: Field;
  totalCurrency: MinaAmount;
}

export interface LedgerView {
  hasAccount(accountId: AccountId): boolean;
  getAccount(accountId: AccountId): Account | null;
  setAccount(account: Account): void;
  updateAccount(accountId: AccountId, f: (account: Account) => Account): void;
}

export class LocalLedger implements LedgerView {
  private accounts: AccountIdMap<Account>;

  constructor(accounts: Account[]) {
    this.accounts = new AccountIdMap();

    for (const account of accounts) {
      this.setAccount(account);
    }
  }

  hasAccount(accountId: AccountId): boolean {
    return this.accounts.has(accountId);
  }

  getAccount(accountId: AccountId): Account | null {
    return this.accounts.get(accountId);
  }

  setAccount(account: Account): void {
    return this.accounts.set(account.accountId, account);
  }

  updateAccount(accountId: AccountId, f: (account: Account) => Account): void {
    return this.accounts.update(accountId, (possibleAccount) => {
      const account = possibleAccount ?? Account.empty(accountId);
      const updatedAccount = f(account);
      // TODO: if(!updatedAccount.accountId.equals(accountId).toBoolean()) throw new Error('...')
      return updatedAccount;
    });
  }
}
