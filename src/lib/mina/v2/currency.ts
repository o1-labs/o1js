import { Int64, UInt64 } from '../../provable/int.js';

export { MinaAmount, BalanceChange, CurrencyUtils };

function safeNumberMultiplication(num: number, factor: bigint): bigint {
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid amount ${num}: not a finite number`);
  }

  // Separate integer and fractional parts to avoid floating-point issues
  const [integerPart, fractionalPart = ''] = String(num).split('.');
  const integer_part = BigInt(integerPart) * factor;

  // handle decimal part if present (up to 9 decimals)
  let fractional_part = 0n;
  if (fractionalPart.length > 0) {
    // take up to 9 decimal places for nanomina precision
    const fracStr = (fractionalPart + '000000000').slice(0, 9);
    fractional_part = BigInt(fracStr);
  }

  return integer_part + fractional_part;
}

const CurrencyUtils = {
  toMINA: (amount: number | bigint): bigint => {
    return BigInt(amount) / BigInt(1e9);
  },
  fromMINA: (amount: bigint | number): bigint => {
    if (typeof amount === 'bigint') {
      return amount * BigInt(1e9);
    }

    return safeNumberMultiplication(amount, BigInt(1e9));
  },
};

type MinaAmount = UInt64;
const MinaAmount = {
  fromMINA: (amount: bigint | number): MinaAmount => {
    return UInt64.from(CurrencyUtils.fromMINA(amount));
  },
  toMINA: (amount: MinaAmount): bigint => {
    return CurrencyUtils.toMINA(amount.toBigInt());
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
