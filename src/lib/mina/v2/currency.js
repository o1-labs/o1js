import { Int64, UInt64 } from '../../provable/int.js';
export { MinaAmount, BalanceChange };
const MinaAmount = {
    fromMINA: (amount) => {
        if (typeof amount === 'number') {
            return UInt64.from(amount * 1e9);
        }
        else
            return UInt64.from(amount * BigInt(1e9));
    },
    toMINA: (amount) => {
        return amount.toBigInt() / BigInt(1e9);
    },
    fromNanoMINA: (amount) => {
        return UInt64.from(amount);
    },
    toNanoMINA: (amount) => {
        return amount.toBigInt();
    },
};
const BalanceChange = {
    positive: {
        fromMINA: (amount) => {
            return Int64.from(amount * BigInt(1e9));
        },
    },
    negative: {
        fromMINA: (amount) => {
            return Int64.from(-amount * BigInt(1e9));
        },
    },
};
