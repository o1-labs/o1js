"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillPartialAccount = exports.parseFetchedAccount = exports.newAccount = exports.Account = void 0;
const types_js_1 = require("../../../bindings/mina-transaction/v1/types.js");
const wrapped_js_1 = require("../../provable/wrapped.js");
const account_update_js_1 = require("./account-update.js");
const int_js_1 = require("../../provable/int.js");
const signature_js_1 = require("../../provable/crypto/signature.js");
const base58_encodings_js_1 = require("./base58-encodings.js");
const from_layout_js_1 = require("../../../bindings/lib/from-layout.js");
const transaction_js_1 = require("../../../bindings/mina-transaction/gen/v1/transaction.js");
const js_layout_js_1 = require("../../../bindings/mina-transaction/gen/v1/js-layout.js");
const Account = types_js_1.Types.Account;
exports.Account = Account;
function newAccount(accountId) {
    let account = Account.empty();
    account.publicKey = accountId.publicKey;
    account.tokenId = accountId.tokenId ?? types_js_1.Types.TokenId.empty();
    account.permissions = account_update_js_1.Permissions.initial();
    return account;
}
exports.newAccount = newAccount;
// convert FetchedAccount (from graphql) to Account (internal representation both here and in Mina)
function parseFetchedAccount(account) {
    const { publicKey, nonce, zkappState, balance, permissions, timing: { cliffAmount, cliffTime, initialMinimumBalance, vestingIncrement, vestingPeriod }, delegateAccount, receiptChainHash, actionState, token, tokenSymbol, verificationKey, provedState, zkappUri, } = account;
    let hasZkapp = zkappState !== null ||
        verificationKey !== null ||
        actionState !== null ||
        zkappUri !== null ||
        provedState;
    let partialAccount = {
        publicKey: signature_js_1.PublicKey.fromBase58(publicKey),
        tokenId: base58_encodings_js_1.TokenId.fromBase58(token),
        tokenSymbol: tokenSymbol ?? undefined,
        balance: balance && int_js_1.UInt64.from(balance.total),
        nonce: int_js_1.UInt32.from(nonce),
        receiptChainHash: (receiptChainHash && base58_encodings_js_1.ReceiptChainHash.fromBase58(receiptChainHash)) || undefined,
        delegate: (delegateAccount && signature_js_1.PublicKey.fromBase58(delegateAccount.publicKey)) ?? undefined,
        votingFor: undefined, // TODO
        timing: (cliffAmount &&
            cliffTime &&
            initialMinimumBalance &&
            vestingIncrement &&
            vestingPeriod && {
            isTimed: (0, wrapped_js_1.Bool)(true),
            cliffAmount: int_js_1.UInt64.from(cliffAmount),
            cliffTime: int_js_1.UInt32.from(cliffTime),
            initialMinimumBalance: int_js_1.UInt64.from(initialMinimumBalance),
            vestingIncrement: int_js_1.UInt64.from(vestingIncrement),
            vestingPeriod: int_js_1.UInt32.from(vestingPeriod),
        }) ||
            undefined,
        permissions: (permissions && account_update_js_1.Permissions.fromJSON(permissions)) ?? account_update_js_1.Permissions.initial(),
        zkapp: hasZkapp
            ? {
                appState: (zkappState && zkappState.map(wrapped_js_1.Field)) ?? undefined,
                verificationKey: (verificationKey && {
                    data: verificationKey.verificationKey,
                    hash: (0, wrapped_js_1.Field)(verificationKey.hash),
                }) ??
                    undefined,
                zkappVersion: undefined, // TODO
                actionState: (actionState && actionState.map(wrapped_js_1.Field)) ?? undefined,
                lastActionSlot: undefined, // TODO
                provedState: provedState !== null ? (0, wrapped_js_1.Bool)(provedState) : undefined,
                zkappUri: zkappUri !== null ? zkappUri : undefined,
            }
            : undefined,
    };
    return fillPartialAccount(partialAccount);
}
exports.parseFetchedAccount = parseFetchedAccount;
function fillPartialAccount(account) {
    return (0, from_layout_js_1.genericLayoutFold)(transaction_js_1.TypeMap, transaction_js_1.customTypes, {
        map(type, value) {
            // if value exists, use it; otherwise fall back to dummy value
            if (value !== undefined)
                return value;
            return type.empty();
        },
        reduceArray(array) {
            return array;
        },
        reduceObject(_, record) {
            return record;
        },
        reduceFlaggedOption() {
            // doesn't occur for accounts
            throw Error('not relevant');
        },
        reduceOrUndefined(value) {
            // don't fill in value that's allowed to be undefined
            return value;
        },
    }, js_layout_js_1.jsLayout.Account, account);
}
exports.fillPartialAccount = fillPartialAccount;
