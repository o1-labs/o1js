"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenContract = void 0;
const wrapped_js_1 = require("../../../provable/wrapped.js");
const int_js_1 = require("../../../provable/int.js");
const provable_js_1 = require("../../../provable/provable.js");
const signature_js_1 = require("../../../provable/crypto/signature.js");
const account_update_js_1 = require("../account-update.js");
const zkapp_js_1 = require("../zkapp.js");
const forest_iterator_js_1 = require("./forest-iterator.js");
const token_methods_js_1 = require("./token-methods.js");
/**
 *
 * Base token contract which
 * - implements the `Approvable` API, with the `approveBase()` method left to be defined by subclasses
 * - implements the `Transferable` API as a wrapper around the `Approvable` API
 */
class TokenContract extends zkapp_js_1.SmartContract {
    // change default permissions - important that token contracts use an access permission
    /** The maximum number of account updates using the token in a single
     * transaction that this contract supports. */
    static MAX_ACCOUNT_UPDATES = 9;
    /**
     * Deploys a {@link TokenContract}.
     *
     * In addition to base smart contract deployment, this adds two steps:
     * - set the `access` permission to `proofOrSignature()`, to prevent against unauthorized token operations
     *   - not doing this would imply that anyone can bypass token contract authorization and simply mint themselves tokens
     * - require the zkapp account to be new, using the `isNew` precondition.
     *   this guarantees that the access permission is set from the very start of the existence of this account.
     *   creating the zkapp account before deployment would otherwise be a security vulnerability that is too easy to introduce.
     *
     * Note that because of the `isNew` precondition, the zkapp account must not be created prior to calling `deploy()`.
     *
     * If the contract needs to be re-deployed, you can switch off this behaviour by overriding the `isNew` precondition:
     * ```ts
     * async deploy() {
     *   await super.deploy();
     *   // DON'T DO THIS ON THE INITIAL DEPLOYMENT!
     *   this.account.isNew.requireNothing();
     * }
     * ```
     */
    async deploy(args) {
        await super.deploy(args);
        // set access permission, to prevent unauthorized token operations
        this.account.permissions.set({
            ...account_update_js_1.Permissions.default(),
            access: account_update_js_1.Permissions.proofOrSignature(),
        });
        // assert that this account is new, to ensure unauthorized token operations
        // are not possible before this contract is deployed
        // see https://github.com/o1-labs/o1js/issues/1439 for details
        this.account.isNew.requireEquals((0, wrapped_js_1.Bool)(true));
    }
    /**
     * Returns the `tokenId` of the token managed by this contract.
     */
    deriveTokenId() {
        return account_update_js_1.TokenId.derive(this.address, this.tokenId);
    }
    /**
     * Helper methods to use from within a token contract.
     */
    get internal() {
        return (0, token_methods_js_1.tokenMethods)(this.self);
    }
    /**
     * Iterate through the account updates in `updates` and apply `callback` to each.
     *
     * This method is provable and is suitable as a base for implementing `approveUpdates()`.
     */
    forEachUpdate(updates, callback) {
        let iterator = forest_iterator_js_1.TokenAccountUpdateIterator.create(updates, this.deriveTokenId());
        // iterate through the forest and apply user-defined logic
        for (let i = 0; i < this.constructor.MAX_ACCOUNT_UPDATES; i++) {
            let { accountUpdate, usesThisToken } = iterator.next();
            callback(accountUpdate, usesThisToken);
        }
        // prove that we checked all updates
        iterator.assertFinished(`Number of account updates to approve exceed ` +
            `the supported limit of ${this.constructor.MAX_ACCOUNT_UPDATES}.\n`);
        // skip hashing our child account updates in the method wrapper
        // since we just did that in the loop above
        this.approve(updates);
    }
    /**
     * Use `forEachUpdate()` to prove that the total balance change of child account updates is zero.
     *
     * This is provided out of the box as it is both a good example, and probably the most common implementation, of `approveBase()`.
     */
    checkZeroBalanceChange(updates) {
        let totalBalanceChange = int_js_1.Int64.zero;
        this.forEachUpdate(updates, (accountUpdate, usesToken) => {
            totalBalanceChange = totalBalanceChange.add(provable_js_1.Provable.if(usesToken, accountUpdate.balanceChange, int_js_1.Int64.zero));
        });
        // prove that the total balance change is zero
        totalBalanceChange.assertEquals(0);
    }
    /**
     * Approve a single account update (with arbitrarily many children).
     */
    async approveAccountUpdate(accountUpdate) {
        let forest = toForest([accountUpdate]);
        await this.approveBase(forest);
    }
    /**
     * Approve a list of account updates (with arbitrarily many children).
     */
    async approveAccountUpdates(accountUpdates) {
        let forest = toForest(accountUpdates);
        await this.approveBase(forest);
    }
    // TRANSFERABLE API - simple wrapper around Approvable API
    /**
     * Transfer `amount` of tokens from `from` to `to`.
     */
    async transfer(from, to, amount) {
        // coerce the inputs to AccountUpdate and pass to `approveBase()`
        let tokenId = this.deriveTokenId();
        if (from instanceof signature_js_1.PublicKey) {
            from = account_update_js_1.AccountUpdate.default(from, tokenId);
            from.requireSignature();
            from.label = `${this.constructor.name}.transfer() (from)`;
        }
        if (to instanceof signature_js_1.PublicKey) {
            to = account_update_js_1.AccountUpdate.default(to, tokenId);
            to.label = `${this.constructor.name}.transfer() (to)`;
        }
        from.balanceChange = int_js_1.Int64.from(amount).neg();
        to.balanceChange = int_js_1.Int64.from(amount);
        let forest = toForest([from, to]);
        await this.approveBase(forest);
    }
}
exports.TokenContract = TokenContract;
function toForest(updates) {
    let trees = updates.map((a) => (a instanceof account_update_js_1.AccountUpdate ? a.extractTree() : a));
    return account_update_js_1.AccountUpdateForest.fromReverse(trees);
}
