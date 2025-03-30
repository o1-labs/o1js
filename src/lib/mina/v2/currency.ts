import { UInt64 } from '../../provable/int.js';

export { MinaAmount };

type MinaAmount = UInt64;
const MinaAmount = {
  fromMINA: (amount: bigint): MinaAmount => {
    return UInt64.from(amount * BigInt(1e9));
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
