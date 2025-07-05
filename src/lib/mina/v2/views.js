// Views into chain-state (ledger and best block)
import { Account, AccountIdMap } from './account.js';
import { Field } from '../../provable/field.js';
import { UInt32, UInt64 } from '../../provable/int.js';
export { LocalChain, LocalLedger };
class LocalChain {
    constructor(snarkedLedgerHash, blockchainLength, minWindowDensity, totalCurrency, globalSlotSinceGenesis, stakingEpochData, nextEpochData) {
        this.snarkedLedgerHash = snarkedLedgerHash;
        this.blockchainLength = blockchainLength;
        this.minWindowDensity = minWindowDensity;
        this.totalCurrency = totalCurrency;
        this.globalSlotSinceGenesis = globalSlotSinceGenesis;
        this.stakingEpochData = stakingEpochData;
        this.nextEpochData = nextEpochData;
    }
    static initial() {
        return new LocalChain(Field.empty(), UInt32.from(0), UInt32.from(0), UInt64.from(0), UInt32.from(0), {
            ledger: {
                hash: Field.empty(),
                totalCurrency: UInt64.from(0),
            },
            seed: Field.empty(),
            startCheckpoint: Field.empty(),
            lockCheckpoint: Field.empty(),
            epochLength: UInt32.from(0),
        }, {
            ledger: {
                hash: Field.empty(),
                totalCurrency: UInt64.from(0),
            },
            seed: Field.empty(),
            startCheckpoint: Field.empty(),
            lockCheckpoint: Field.empty(),
            epochLength: UInt32.from(0),
        });
    }
}
class LocalLedger {
    constructor(accounts) {
        this.accounts = new AccountIdMap();
        for (const account of accounts) {
            this.setAccount(account);
        }
    }
    hasAccount(accountId) {
        return this.accounts.has(accountId);
    }
    getAccount(accountId) {
        return this.accounts.get(accountId);
    }
    setAccount(account) {
        return this.accounts.set(account.accountId, account);
    }
    updateAccount(accountId, f) {
        return this.accounts.update(accountId, (possibleAccount) => {
            const account = possibleAccount ?? Account.empty(accountId);
            const updatedAccount = f(account);
            // TODO: if(!updatedAccount.accountId.equals(accountId).toBoolean()) throw new Error('...')
            return updatedAccount;
        });
    }
}
