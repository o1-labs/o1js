"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleLedger = void 0;
const account_js_1 = require("../account.js");
const field_js_1 = require("../../../provable/field.js");
const apply_js_1 = require("./apply.js");
const types_js_1 = require("../../../../bindings/mina-transaction/v1/types.js");
class SimpleLedger {
    constructor() {
        this.accounts = new Map();
    }
    static create() {
        return new SimpleLedger();
    }
    exists({ publicKey, tokenId = types_js_1.Types.TokenId.empty() }) {
        return this.accounts.has(accountId({ publicKey, tokenId }));
    }
    store(account) {
        this.accounts.set(accountId(account), account);
    }
    load({ publicKey, tokenId = types_js_1.Types.TokenId.empty() }) {
        let id = accountId({ publicKey, tokenId });
        let account = this.accounts.get(id);
        return account;
    }
    apply(update) {
        let id = accountId(update.body);
        let account = this.accounts.get(id);
        account ?? (account = (0, account_js_1.newAccount)(update.body));
        let updated = (0, apply_js_1.applyAccountUpdate)(account, update);
        this.accounts.set(id, updated);
    }
}
exports.SimpleLedger = SimpleLedger;
function accountId(account) {
    let id = account.publicKey.x.toBigInt();
    id <<= 1n;
    id |= BigInt(account.publicKey.isOdd.toBoolean());
    id <<= BigInt(field_js_1.Field.sizeInBits);
    id |= account.tokenId.toBigInt();
    return id;
}
