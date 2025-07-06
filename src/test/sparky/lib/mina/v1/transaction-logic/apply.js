"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyAccountUpdate = void 0;
const account_js_1 = require("../account.js");
/**
 * Apply a single account update to update an account.
 *
 * TODO:
 * - This must receive and return some context global to the transaction, to check validity
 * - Should operate on the value / bigint type, not the provable type
 */
function applyAccountUpdate(account, update) {
    account.publicKey.assertEquals(update.publicKey);
    account.tokenId.assertEquals(update.tokenId, 'token id mismatch');
    // clone account (TODO: do this efficiently)
    let json = account_js_1.Account.toJSON(account);
    account = account_js_1.Account.fromJSON(json);
    // update permissions
    if (update.update.permissions.isSome.toBoolean()) {
        account.permissions = update.update.permissions.value;
    }
    return account;
}
exports.applyAccountUpdate = applyAccountUpdate;
