import { Int64, UInt64 } from '../../provable/int.js';

export { MinaAmount, BalanceChange };

type MinaAmount = UInt64;
const MinaAmount = {
  fromMINA: (amount: bigint | number): MinaAmount => {
    if (typeof amount === 'number') {
      return UInt64.from(amount * 1e9);
    } else return UInt64.from(amount * BigInt(1e9));
  },
  toMINA: (amount: MinaAmount): bigint => {
    return amount.toBigInt() / BigInt(1e9);
  },
  fromNanoMINA: (amount: bigint): MinaAmount => {
    return UInt64.from(amount);
  },
  toNanoMINA: (amount: MinaAmount): bigint => {
    return amount.toBigInt();
  },
};

type BalanceChange = Int64;
const BalanceChange = {
  positive: {
    fromMINA: (amount: bigint): BalanceChange => {
      return Int64.from(amount * BigInt(1e9));
    },
  },
  negative: {
    fromMINA: (amount: bigint): BalanceChange => {
      return Int64.from(-amount * BigInt(1e9));
    },
  },
};
