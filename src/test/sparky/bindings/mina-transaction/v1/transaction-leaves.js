"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MayUseToken = exports.TransactionVersion = exports.StateHash = exports.ReceiptChainHash = exports.VerificationKeyHash = exports.ActionState = exports.TokenSymbol = exports.ZkappUri = exports.Actions = exports.Events = exports.TokenId = exports.BalanceChange = exports.Sign = exports.UInt32 = exports.UInt64 = exports.AuthRequired = exports.Bool = exports.Field = exports.PublicKey = void 0;
const wrapped_js_1 = require("../../../lib/provable/wrapped.js");
Object.defineProperty(exports, "Field", { enumerable: true, get: function () { return wrapped_js_1.Field; } });
Object.defineProperty(exports, "Bool", { enumerable: true, get: function () { return wrapped_js_1.Bool; } });
const int_js_1 = require("../../../lib/provable/int.js");
Object.defineProperty(exports, "UInt32", { enumerable: true, get: function () { return int_js_1.UInt32; } });
Object.defineProperty(exports, "UInt64", { enumerable: true, get: function () { return int_js_1.UInt64; } });
Object.defineProperty(exports, "Sign", { enumerable: true, get: function () { return int_js_1.Sign; } });
const signature_js_1 = require("../../../lib/provable/crypto/signature.js");
Object.defineProperty(exports, "PublicKey", { enumerable: true, get: function () { return signature_js_1.PublicKey; } });
const derived_leaves_js_1 = require("./derived-leaves.js");
const events_js_1 = require("../../../lib/mina/v1/events.js");
const poseidon_js_1 = require("../../../lib/provable/crypto/poseidon.js");
const provable_derivers_js_1 = require("../../../lib/provable/types/provable-derivers.js");
const constants_js_1 = require("../../crypto/constants.js");
const { TokenId, StateHash, TokenSymbol, AuthRequired, ZkappUri } = (0, derived_leaves_js_1.derivedLeafTypes)({
    Field: wrapped_js_1.Field,
    Bool: wrapped_js_1.Bool,
    HashHelpers: poseidon_js_1.HashHelpers,
    packToFields: poseidon_js_1.packToFields,
});
exports.TokenId = TokenId;
exports.StateHash = StateHash;
exports.TokenSymbol = TokenSymbol;
exports.AuthRequired = AuthRequired;
exports.ZkappUri = ZkappUri;
const { Events, Actions } = (0, events_js_1.createEvents)({ Field: wrapped_js_1.Field, Poseidon: poseidon_js_1.Poseidon });
exports.Events = Events;
exports.Actions = Actions;
const ActionState = {
    ...(0, provable_derivers_js_1.provable)(wrapped_js_1.Field),
    empty: Actions.emptyActionState,
};
exports.ActionState = ActionState;
const VerificationKeyHash = {
    ...(0, provable_derivers_js_1.provable)(wrapped_js_1.Field),
    empty: () => (0, wrapped_js_1.Field)(constants_js_1.mocks.dummyVerificationKeyHash),
};
exports.VerificationKeyHash = VerificationKeyHash;
const ReceiptChainHash = {
    ...(0, provable_derivers_js_1.provable)(wrapped_js_1.Field),
    empty: () => (0, poseidon_js_1.emptyHashWithPrefix)('CodaReceiptEmpty'),
};
exports.ReceiptChainHash = ReceiptChainHash;
const TransactionVersion = {
    ...(0, provable_derivers_js_1.provable)(int_js_1.UInt32),
    empty: () => int_js_1.UInt32.from(constants_js_1.protocolVersions.txnVersion),
};
exports.TransactionVersion = TransactionVersion;
const BalanceChange = int_js_1.Int64;
exports.BalanceChange = BalanceChange;
const MayUseToken = {
    ...(0, provable_derivers_js_1.provable)({ parentsOwnToken: wrapped_js_1.Bool, inheritFromParent: wrapped_js_1.Bool }),
    check: ({ parentsOwnToken, inheritFromParent }) => {
        wrapped_js_1.Bool.check(parentsOwnToken);
        wrapped_js_1.Bool.check(inheritFromParent);
        parentsOwnToken
            .and(inheritFromParent)
            .assertFalse('MayUseToken: parentsOwnToken and inheritFromParent cannot both be true');
    },
};
exports.MayUseToken = MayUseToken;
