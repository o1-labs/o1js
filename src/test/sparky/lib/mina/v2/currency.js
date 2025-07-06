"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceChange = exports.MinaAmount = void 0;
const int_js_1 = require("../../provable/int.js");
const MinaAmount = {
    fromMINA: (amount) => {
        if (typeof amount === 'number') {
            return int_js_1.UInt64.from(amount * 1e9);
        }
        else
            return int_js_1.UInt64.from(amount * BigInt(1e9));
    },
    toMINA: (amount) => {
        return amount.toBigInt() / BigInt(1e9);
    },
    fromNanoMINA: (amount) => {
        return int_js_1.UInt64.from(amount);
    },
    toNanoMINA: (amount) => {
        return amount.toBigInt();
    },
};
exports.MinaAmount = MinaAmount;
const BalanceChange = {
    positive: {
        fromMINA: (amount) => {
            return int_js_1.Int64.from(amount * BigInt(1e9));
        },
    },
    negative: {
        fromMINA: (amount) => {
            return int_js_1.Int64.from(-amount * BigInt(1e9));
        },
    },
};
exports.BalanceChange = BalanceChange;
