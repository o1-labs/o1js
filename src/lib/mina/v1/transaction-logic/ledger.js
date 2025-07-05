import { newAccount } from '../account.js';
import { Field } from '../../../provable/field.js';
import { applyAccountUpdate } from './apply.js';
import { Types } from '../../../../bindings/mina-transaction/v1/types.js';
export { SimpleLedger };
class SimpleLedger {
    constructor() {
        this.accounts = new Map();
    }
    static create() {
        return new SimpleLedger();
    }
    exists({ publicKey, tokenId = Types.TokenId.empty() }) {
        return this.accounts.has(accountId({ publicKey, tokenId }));
    }
    store(account) {
        this.accounts.set(accountId(account), account);
    }
    load({ publicKey, tokenId = Types.TokenId.empty() }) {
        let id = accountId({ publicKey, tokenId });
        let account = this.accounts.get(id);
        return account;
    }
    apply(update) {
        let id = accountId(update.body);
        let account = this.accounts.get(id);
        account ?? (account = newAccount(update.body));
        let updated = applyAccountUpdate(account, update);
        this.accounts.set(id, updated);
    }
}
function accountId(account) {
    let id = account.publicKey.x.toBigInt();
    id <<= 1n;
    id |= BigInt(account.publicKey.isOdd.toBoolean());
    id <<= BigInt(Field.sizeInBits);
    id |= account.tokenId.toBigInt();
    return id;
}
