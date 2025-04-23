export {
  changeBase,
  bytesToBigInt,
  bigIntToBytes,
  bigIntToBits,
  parseHexString32,
  log2,
  max,
  abs,
  sign,
  bytesToBigint32,
  bigintToBytes32,
};

function bytesToBigint32(bytes: Uint8Array) {
  let words = new BigUint64Array(bytes.buffer, bytes.byteOffset, 4);
  return words[0] | (words[1] << 64n) | (words[2] << 128n) | (words[3] << 192n);
}

const mask64 = (1n << 64n) - 1n;

function bigintToBytes32(x: bigint, bytes: Uint8Array): Uint8Array {
  let words = new BigUint64Array(bytes.buffer, bytes.byteOffset, 4);
  words[0] = x & mask64;
  words[1] = (x >> 64n) & mask64;
  words[2] = (x >> 128n) & mask64;
  words[3] = x >> 192n;
  return bytes;
}

function bytesToBigInt(bytes: Uint8Array | number[]) {
  let x = 0n;
  let bitPosition = 0n;
  for (let byte of bytes) {
    x += BigInt(byte) << bitPosition;
    bitPosition += 8n;
  }
  return x;
}

let hexToNum: { [hexCharCode: number]: number } = {};
for (let i = 0; i < 16; i++) hexToNum[i.toString(16).charCodeAt(0)] = i;
let encoder = new TextEncoder();

const tmpBytes = new Uint8Array(64);

function parseHexString32(input: string) {
  // Parse the bytes explicitly, Bigint endianness is wrong
  encoder.encodeInto(input, tmpBytes);
  for (let j = 0; j < 32; j++) {
    let n1 = hexToNum[tmpBytes[2 * j]];
    let n0 = hexToNum[tmpBytes[2 * j + 1]];
    tmpBytes[j] = (n1 << 4) | n0;
  }
  return bytesToBigint32(tmpBytes);
}

/**
 * Transforms bigint to little-endian array of bytes (numbers between 0 and 255) of a given length.
 * Throws an error if the bigint doesn't fit in the given number of bytes.
 */
function bigIntToBytes(x: bigint, length?: number) {
  if (x < 0n) {
    throw Error(`bigIntToBytes: negative numbers are not supported, got ${x}`);
  }
  if (length === undefined) return bigintToBytesFlexible(x);
  let bytes: number[] = Array(length);
  for (let i = 0; i < length; i++, x >>= 8n) {
    bytes[i] = Number(x & 0xffn);
  }
  if (x > 0n) {
    throw Error(`bigIntToBytes: input does not fit in ${length} bytes`);
  }
  return bytes;
}

function bigintToBytesFlexible(x: bigint) {
  let bytes: number[] = [];
  for (; x > 0n; x >>= 8n) {
    bytes.push(Number(x & 0xffn));
  }
  return bytes;
}

/**
 * Transforms bigint to little-endian array of bits (booleans).
 * The length of the bit array is determined as needed.
 */
function bigIntToBits(x: bigint) {
  if (x < 0n) {
    throw Error(`bigIntToBits: negative numbers are not supported, got ${x}`);
  }
  let bits: boolean[] = [];
  for (; x > 0n; x >>= 1n) {
    let bit = !!(x & 1n);
    bits.push(bit);
  }
  return bits;
}

function changeBase(digits: bigint[], base: bigint, newBase: bigint) {
  // 1. accumulate digits into one gigantic bigint `x`
  let x = fromBase(digits, base);
  // 2. compute new digits from `x`
  let newDigits = toBase(x, newBase);
  return newDigits;
}

/**
 * the algorithm for toBase / fromBase is more complicated than it naively has to be,
 * but that is for performance reasons.
 *
 * we'll explain it for `fromBase`. this function is about taking an array of digits
 * `[x0, ..., xn]`
 * and returning the integer (bigint) that has those digits in the given `base`:
 * ```
 * let x = x0 + x1*base + x2*base**2 + ... + xn*base**n
 * ```
 *
 * naively, we could just accumulate digits from left to right:
 * ```
 * let x = 0n;
 * let p = 1n;
 * for (let i=0; i<n; i++) {
 *   x += X[i] * p;
 *   p *= base;
 * }
 * ```
 *
 * in the ith step, `p = base**i` which is multiplied with `xi` and added to the sum.
 * however, note that this algorithm is `O(n^2)`: let `l = log2(base)`. the base power `p` is a bigint of bit length `i*l`,
 * which is multiplied by a "small" number `xi` (length l), which takes `O(i)` time in every step.
 * since this is done for `i = 0,...,n`, we end up with an `O(n^2)` algorithm.
 *
 * HOWEVER, it turns out that there are fast multiplication algorithms, and JS bigints have them built in!
 * the Schönhage-Strassen algorithm (implemented in the V8 engine, see https://github.com/v8/v8/blob/main/src/bigint/mul-fft.cc)
 * can multiply two n-bit numbers in time `O(n log(n) loglog(n))`, when n is large.
 *
 * to take advantage of asymptotically fast multiplication, we need to re-structure our algorithm such that it multiplies roughly equal-sized
 * numbers with each other (there is no asymptotic boost for multiplying a small with a large number). so, what we do is to go from the
 * original digit array to arrays of successively larger digits:
 * ```
 * step 0:                  step 1:                              step 2:
 * [x0, x1, x2, x3, ...] -> [x0 + base*x1, x2 + base*x3, ...] -> [x0 + base*x1 + base^2*(x2 + base*x3), ...] -> ...
 * ```
 *
 * ...until after a log(n) number of steps we end up with a single "digit" which is equal to the entire sum.
 *
 * in the ith step, we multiply `n/2^i` pairs of numbers of bit length `2^i*l`. each of these multiplications takes
 * time `O(2^i log(2^i) loglog(2^i))`. if we bound that with `O(2^i log(n) loglog(n))`, we get a runtime bounded by
 * ```
 * O(n/2^i * 2^i log(n) loglog(n)) = O(n log(n) loglog(n))
 * ```
 * in each step. Since we have `log(n)` steps, the result is `O(n log(n)^2 loglog(n))`.
 *
 * empirically, this method is a huge improvement over the naive `O(n^2)` algorithm and scales much better with n (the number of digits).
 *
 * similar conclusions hold for `toBase`.
 */
function fromBase(digits: bigint[], base: bigint) {
  if (base <= 0n) throw Error('fromBase: base must be positive');
  // compute powers base, base^2, base^4, ..., base^(2^k)
  // with largest k s.t. n = 2^k < digits.length
  let basePowers = [];
  for (let power = base, n = 1; n < digits.length; power **= 2n, n *= 2) {
    basePowers.push(power);
  }
  let k = basePowers.length;
  // pad digits array with zeros s.t. digits.length === 2^k
  digits = digits.concat(Array(2 ** k - digits.length).fill(0n));
  // accumulate [x0, x1, x2, x3, ...] -> [x0 + base*x1, x2 + base*x3, ...] -> [x0 + base*x1 + base^2*(x2 + base*x3), ...] -> ...
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
  if (base <= 0n) throw Error('toBase: base must be positive');
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

/**
 * ceil(log2(n))
 * = smallest k such that n <= 2^k
 */
function log2(n: number | bigint) {
  if (typeof n === 'number') n = BigInt(n);
  if (n === 1n) return 0;
  return (n - 1n).toString(2).length;
}

function max(a: bigint, b: bigint) {
  return a > b ? a : b;
}

function abs(x: bigint) {
  return x < 0n ? -x : x;
}

function sign(x: bigint): 1n | -1n {
  return x >= 0 ? 1n : -1n;
}
