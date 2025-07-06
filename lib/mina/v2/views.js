"use strict";
// Views into chain-state (ledger and best block)
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalLedger = exports.LocalChain = void 0;
const account_js_1 = require("./account.js");
const field_js_1 = require("../../provable/field.js");
const int_js_1 = require("../../provable/int.js");
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
        return new LocalChain(field_js_1.Field.empty(), int_js_1.UInt32.from(0), int_js_1.UInt32.from(0), int_js_1.UInt64.from(0), int_js_1.UInt32.from(0), {
            ledger: {
                hash: field_js_1.Field.empty(),
                totalCurrency: int_js_1.UInt64.from(0),
            },
            seed: field_js_1.Field.empty(),
            startCheckpoint: field_js_1.Field.empty(),
            lockCheckpoint: field_js_1.Field.empty(),
            epochLength: int_js_1.UInt32.from(0),
        }, {
            ledger: {
                hash: field_js_1.Field.empty(),
                totalCurrency: int_js_1.UInt64.from(0),
            },
            seed: field_js_1.Field.empty(),
            startCheckpoint: field_js_1.Field.empty(),
            lockCheckpoint: field_js_1.Field.empty(),
            epochLength: int_js_1.UInt32.from(0),
        });
    }
}
exports.LocalChain = LocalChain;
class LocalLedger {
    constructor(accounts) {
        this.accounts = new account_js_1.AccountIdMap();
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
            const account = possibleAccount ?? account_js_1.Account.empty(accountId);
            const updatedAccount = f(account);
            // TODO: if(!updatedAccount.accountId.equals(accountId).toBoolean()) throw new Error('...')
            return updatedAccount;
        });
    }
}
exports.LocalLedger = LocalLedger;
