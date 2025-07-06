"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contract = exports.accountUpdateLayout = exports.smartContractContext = void 0;
const global_context_js_1 = require("../../util/global-context.js");
const transaction_context_js_1 = require("./transaction-context.js");
const assert_js_1 = require("../../util/assert.js");
let smartContractContext = global_context_js_1.Context.create({
    default: null,
});
exports.smartContractContext = smartContractContext;
function accountUpdateLayout() {
    // in a smart contract, return the layout currently created in the contract call
    let layout = smartContractContext.get()?.selfLayout;
    // if not in a smart contract but in a transaction, return the layout of the transaction
    layout ?? (layout = (0, transaction_context_js_1.currentTransaction)()?.layout);
    return layout;
}
exports.accountUpdateLayout = accountUpdateLayout;
function contract(expectedConstructor) {
    let ctx = smartContractContext.get();
    (0, assert_js_1.assert)(ctx !== null, 'This method must be called within a contract method');
    if (expectedConstructor !== undefined) {
        (0, assert_js_1.assert)(ctx.this.constructor === expectedConstructor, `This method must be called on a ${expectedConstructor.name} contract`);
    }
    return ctx.this;
}
exports.contract = contract;
