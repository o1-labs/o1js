"use strict";
// @generated this file is auto-generated - don't edit it directly
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeMap = exports.empty = exports.toJSONEssential = exports.signableFromLayout = exports.Json = exports.Account = exports.AccountUpdate = exports.ZkappCommand = exports.customTypes = void 0;
const transaction_leaves_bigint_js_1 = require("../../v1/transaction-leaves-bigint.js");
const from_layout_js_1 = require("../../../lib/from-layout.js");
const Json = require("./transaction-json.js");
exports.Json = Json;
const js_layout_js_1 = require("./js-layout.js");
__exportStar(require("../../v1/transaction-leaves-bigint.js"), exports);
const TypeMap = {
    PublicKey: transaction_leaves_bigint_js_1.PublicKey,
    UInt64: transaction_leaves_bigint_js_1.UInt64,
    UInt32: transaction_leaves_bigint_js_1.UInt32,
    TokenId: transaction_leaves_bigint_js_1.TokenId,
    Field: transaction_leaves_bigint_js_1.Field,
    AuthRequired: transaction_leaves_bigint_js_1.AuthRequired,
    BalanceChange: transaction_leaves_bigint_js_1.BalanceChange,
    Sign: transaction_leaves_bigint_js_1.Sign,
    Bool: transaction_leaves_bigint_js_1.Bool,
};
exports.TypeMap = TypeMap;
let customTypes = {
    TransactionVersion: transaction_leaves_bigint_js_1.TransactionVersion,
    ZkappUri: transaction_leaves_bigint_js_1.ZkappUri,
    TokenSymbol: transaction_leaves_bigint_js_1.TokenSymbol,
    StateHash: transaction_leaves_bigint_js_1.StateHash,
    BalanceChange: transaction_leaves_bigint_js_1.BalanceChange,
    Events: transaction_leaves_bigint_js_1.Events,
    Actions: transaction_leaves_bigint_js_1.Actions,
    ActionState: transaction_leaves_bigint_js_1.ActionState,
    MayUseToken: transaction_leaves_bigint_js_1.MayUseToken,
    VerificationKeyHash: transaction_leaves_bigint_js_1.VerificationKeyHash,
    ReceiptChainHash: transaction_leaves_bigint_js_1.ReceiptChainHash,
};
exports.customTypes = customTypes;
let { signableFromLayout, toJSONEssential, empty } = (0, from_layout_js_1.SignableFromLayout)(TypeMap, customTypes);
exports.signableFromLayout = signableFromLayout;
exports.toJSONEssential = toJSONEssential;
exports.empty = empty;
let ZkappCommand = signableFromLayout(js_layout_js_1.jsLayout.ZkappCommand);
exports.ZkappCommand = ZkappCommand;
let AccountUpdate = signableFromLayout(js_layout_js_1.jsLayout.AccountUpdate);
exports.AccountUpdate = AccountUpdate;
let Account = signableFromLayout(js_layout_js_1.jsLayout.Account);
exports.Account = Account;
