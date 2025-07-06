"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenMethods = void 0;
const account_update_js_1 = require("../account-update.js");
const smart_contract_base_js_1 = require("../smart-contract-base.js");
const signature_js_1 = require("../../../provable/crypto/signature.js");
const wrapped_js_1 = require("../../../provable/wrapped.js");
function tokenMethods(self) {
    return {
        /**
         * Mints token balance to `address`. Returns the mint account update.
         */
        mint({ address, amount, }) {
            let id = account_update_js_1.TokenId.derive(self.publicKey, self.tokenId);
            let receiver = getApprovedUpdate(self, id, address, 'token.mint()');
            receiver.balance.addInPlace(amount);
            return receiver;
        },
        /**
         * Burn token balance on `address`. Returns the burn account update.
         */
        burn({ address, amount, }) {
            let id = account_update_js_1.TokenId.derive(self.publicKey, self.tokenId);
            let sender = getApprovedUpdate(self, id, address, 'token.burn()');
            // Sub the amount to burn from the sender's account
            sender.balance.subInPlace(amount);
            // Require signature from the sender account being deducted
            sender.body.useFullCommitment = (0, wrapped_js_1.Bool)(true);
            account_update_js_1.Authorization.setLazySignature(sender);
            return sender;
        },
        /**
         * Move token balance from `from` to `to`. Returns the `to` account update.
         */
        send({ from, to, amount, }) {
            let id = account_update_js_1.TokenId.derive(self.publicKey, self.tokenId);
            let sender = getApprovedUpdate(self, id, from, 'token.send() (sender)');
            sender.balance.subInPlace(amount);
            sender.body.useFullCommitment = (0, wrapped_js_1.Bool)(true);
            account_update_js_1.Authorization.setLazySignature(sender);
            let receiver = getApprovedUpdate(self, id, to, 'token.send() (receiver)');
            receiver.balance.addInPlace(amount);
            return receiver;
        },
    };
}
exports.tokenMethods = tokenMethods;
// helper
function getApprovedUpdate(self, tokenId, child, label) {
    if ((0, smart_contract_base_js_1.isSmartContract)(child)) {
        child = child.self;
    }
    if (child instanceof account_update_js_1.AccountUpdate) {
        child.tokenId.assertEquals(tokenId);
        self.approve(child);
    }
    if (child instanceof signature_js_1.PublicKey) {
        child = account_update_js_1.AccountUpdate.default(child, tokenId);
        self.approve(child);
    }
    if (!child.label)
        child.label = `${self.label ?? 'Unlabeled'}.${label}`;
    return child;
}
