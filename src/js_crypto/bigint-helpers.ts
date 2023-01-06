export { changeBase, bytesToBigInt, bigIntToBytes };

function bytesToBigInt(bytes: Uint8Array | number[]) {
  let x = 0n;
  let bitPosition = 0n;
  for (let byte of bytes) {
    x += BigInt(byte) << bitPosition;
    bitPosition += 8n;
  }
  return x;
}

/**
 * Transforms bigint to little-endian array of bytes (numbers between 0 and 255) of a given length.
 * Throws an error if the bigint doesn't fit in the given number of bytes.
 */
function bigIntToBytes(x: bigint, length: number) {
  if (x < 0n) {
    throw Error(`bigIntToBytes: negative numbers are not supported, got ${x}`);
  }
  let bytes: number[] = Array(length);
  for (let i = 0; i < length; i++, x >>= 8n) {
    bytes[i] = Number(x & 0xffn);
  }
  if (x > 0n) {
    throw Error(`bigIntToBytes: input does not fit in ${length} bytes`);
  }
  return bytes;
}

function changeBase(digits: bigint[], base: bigint, newBase: bigint) {
  // 1. accumulate digits into one gigantic bigint `x`
  let x = fromBase(digits, base);
  // 2. compute new digits from `x`
  let newDigits = toBase(x, newBase);
  return newDigits;
}

// NOTE: toBase / fromBase are so complicated for performance reasons

function fromBase(digits: bigint[], base: bigint) {
  // compute powers base, base^2, base^4, ..., base^(2^k)
  // with largest k s.t. n = 2^k < digits.length
  let basePowers = [];
  for (let power = base, n = 1; n < digits.length; power **= 2n, n *= 2) {
    basePowers.push(power);
  }
  let k = basePowers.length;
  // pad digits array with zeros s.t. digits.length === 2^k
  digits = digits.concat(Array(2 ** k - digits.length).fill(0n));
  // accumulate [x0, x1, x2, x3, ...] -> [x0 + base*x1, x2 + base*x3, ...] -> [x0 + base*x1 + base^2*(x2 + base*x3=, ...] -> ...
  // until we end up with a single element
  for (let i = 0; i < k; i++) {
    let newDigits = Array(digits.length >> 1);
    let basePower = basePowers[i];
    for (let j = 0; j < newDigits.length; j++) {
      newDigits[j] = digits[2 * j] + basePower * digits[2 * j + 1];
    }
    digits = newDigits;
  }
  console.assert(digits.length === 1);
  let [digit] = digits;
  return digit;
}

function toBase(x: bigint, base: bigint) {
  // compute powers base, base^2, base^4, ..., base^(2^k)
  // with largest k s.t. base^(2^k) < x
  let basePowers = [];
  for (let power = base; power < x; power **= 2n) {
    basePowers.push(power);
  }
  let digits = [x]; // single digit w.r.t base^(2^(k+1))
  // successively split digits w.r.t. base^(2^j) into digits w.r.t. base^(2^(j-1))
  // until we arrive at digits w.r.t. base
  let k = basePowers.length;
  for (let i = 0; i < k; i++) {
    let newDigits = Array(2 * digits.length);
    let basePower = basePowers[k - 1 - i];
    for (let j = 0; j < digits.length; j++) {
      let x = digits[j];
      let high = x / basePower;
      newDigits[2 * j + 1] = high;
      newDigits[2 * j] = x - high * basePower;
    }
    digits = newDigits;
  }
  // pop "leading" zero digits
  while (digits[digits.length - 1] === 0n) {
    digits.pop();
  }
  return digits;
}
