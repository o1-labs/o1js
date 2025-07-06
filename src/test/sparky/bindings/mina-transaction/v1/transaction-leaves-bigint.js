"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionVersion = exports.StateHash = exports.ReceiptChainHash = exports.VerificationKeyHash = exports.ActionState = exports.TokenSymbol = exports.ZkappUri = exports.Actions = exports.Events = exports.MayUseToken = exports.TokenId = exports.BalanceChange = exports.Sign = exports.UInt32 = exports.UInt64 = exports.AuthRequired = exports.Bool = exports.Field = exports.PublicKey = void 0;
const field_bigint_js_1 = require("../../../mina-signer/src/field-bigint.js");
Object.defineProperty(exports, "Field", { enumerable: true, get: function () { return field_bigint_js_1.Field; } });
Object.defineProperty(exports, "Bool", { enumerable: true, get: function () { return field_bigint_js_1.Bool; } });
Object.defineProperty(exports, "UInt32", { enumerable: true, get: function () { return field_bigint_js_1.UInt32; } });
Object.defineProperty(exports, "UInt64", { enumerable: true, get: function () { return field_bigint_js_1.UInt64; } });
Object.defineProperty(exports, "Sign", { enumerable: true, get: function () { return field_bigint_js_1.Sign; } });
const curve_bigint_js_1 = require("../../../mina-signer/src/curve-bigint.js");
Object.defineProperty(exports, "PublicKey", { enumerable: true, get: function () { return curve_bigint_js_1.PublicKey; } });
const derived_leaves_js_1 = require("./derived-leaves.js");
const events_js_1 = require("../../../lib/mina/v1/events.js");
const poseidon_bigint_js_1 = require("../../../mina-signer/src/poseidon-bigint.js");
const constants_js_1 = require("../../crypto/constants.js");
const derivers_bigint_js_1 = require("../../../mina-signer/src/derivers-bigint.js");
const { TokenId, StateHash, TokenSymbol, AuthRequired, ZkappUri, MayUseToken } = (0, derived_leaves_js_1.derivedLeafTypesSignable)({ Field: field_bigint_js_1.Field, Bool: field_bigint_js_1.Bool, HashHelpers: poseidon_bigint_js_1.HashHelpers, packToFields: poseidon_bigint_js_1.packToFields });
exports.TokenId = TokenId;
exports.StateHash = StateHash;
exports.TokenSymbol = TokenSymbol;
exports.AuthRequired = AuthRequired;
exports.ZkappUri = ZkappUri;
exports.MayUseToken = MayUseToken;
const { Events, Actions } = (0, events_js_1.createEvents)({ Field: field_bigint_js_1.Field, Poseidon: poseidon_bigint_js_1.Poseidon });
exports.Events = Events;
exports.Actions = Actions;
const ActionState = {
    ...field_bigint_js_1.Field,
    empty: Actions.emptyActionState,
};
exports.ActionState = ActionState;
const VerificationKeyHash = {
    ...field_bigint_js_1.Field,
    empty: () => (0, field_bigint_js_1.Field)(constants_js_1.mocks.dummyVerificationKeyHash),
};
exports.VerificationKeyHash = VerificationKeyHash;
const ReceiptChainHash = {
    ...field_bigint_js_1.Field,
    empty: () => poseidon_bigint_js_1.HashHelpers.emptyHashWithPrefix('CodaReceiptEmpty'),
};
exports.ReceiptChainHash = ReceiptChainHash;
const TransactionVersion = {
    ...field_bigint_js_1.UInt32,
    empty: () => (0, field_bigint_js_1.UInt32)(constants_js_1.protocolVersions.txnVersion),
};
exports.TransactionVersion = TransactionVersion;
const BalanceChange = (0, derivers_bigint_js_1.signable)({ magnitude: field_bigint_js_1.UInt64, sgn: field_bigint_js_1.Sign });
exports.BalanceChange = BalanceChange;
