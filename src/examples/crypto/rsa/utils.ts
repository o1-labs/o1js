export { sha256Bigint, generateRsaParams, rsaSign, randomPrime };

/**
 * Generates an RSA signature for the given message using the private key and modulus.
 * @param message - The message to be signed.
 * @param privateKey - The private exponent used for signing.
 * @param modulus - The modulus used for signing.
 * @returns The RSA signature of the message.
 */
function rsaSign(message: bigint, privateKey: bigint, modulus: bigint): bigint {
  // Calculate the signature using modular exponentiation
  return power(message, privateKey, modulus);
}

/**
 * Generates a SHA-256 digest of the input message and returns the hash as a native bigint.
 * @param  message - The input message to be hashed.
 * @returns The SHA-256 hash of the input message as a native bigint.
 */
async function sha256Bigint(message: string) {
  let messageBytes = new TextEncoder().encode(message);
  let digestBytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', messageBytes)
  );
  return bytesToBigint(digestBytes);
}

/**
 * Generates RSA parameters including prime numbers, public exponent, and private exponent.
 * @param bitSize - The bit size of the prime numbers used for generating the RSA parameters.
 * @returns An object containing the RSA parameters:
 * `n` (modulus), `e` (public exponent), `d` (private exponent).
 */
function generateRsaParams(bitSize: number) {
  // Generate two random prime numbers
  const p = randomPrime(bitSize / 2);
  const q = randomPrime(bitSize / 2);

  // Public exponent
  const e = 65537n;

  // Euler's totient function
  const phiN = (p - 1n) * (q - 1n);

  // Private exponent
  const d = inverse(e, phiN);

  return { n: p * q, e, d };
}

// random primes

/**
 * returns a random prime of a given bit length (which is a multiple of 8)
 */
function randomPrime(bitLength: number) {
  if (bitLength < 1) throw Error('bitLength must be at least 1');
  if (bitLength % 8 !== 0) throw Error('bitLength must be a multiple of 8');
  let byteLength = bitLength / 8;

  while (true) {
    let p = randomBigintLength(byteLength);

    // enforce p has the full length
    p |= 1n << BigInt(bitLength - 1);

    if (millerRabinTest(p) === 'probably prime') return p;
  }
}

// primality test
// after https://en.wikipedia.org/wiki/Miller%E2%80%93Rabin_primality_test#Miller%E2%80%93Rabin_test

function millerRabinTest(n: bigint): 'composite' | 'probably prime' {
  const k = 10;
  if (n === 2n || n === 3n) return 'probably prime';
  if (n < 2n) return 'composite';

  // check if divisible by one of first few primes
  for (let p of knownPrimes) {
    if (n % p === 0n && n > p) return 'composite';
  }

  // write n - 1 = 2^r * d, d odd
  let d = n - 1n;
  let r = 0n;
  for (; d % 2n !== 0n; d /= 2n, r++);

  WitnessLoop: for (let i = 0; i < k; i++) {
    let a = randomBigintRange(2n, n - 2n);
    let x = power(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let i = 0; i + 1 < r; i++) {
      x = (x * x) % n;
      if (x === n - 1n) continue WitnessLoop;
    }
    return 'composite';
  }
  return 'probably prime';
}

// bigint helpers

// random bigint in [min, max]
function randomBigintRange(min: bigint, max: bigint) {
  let length = byteLength(max - min);
  while (true) {
    let n = randomBigintLength(length);
    if (n <= max - min) return min + n;
  }
}

// random bigint in [0, 2^(8*byteLength))
function randomBigintLength(byteLength: number) {
  let bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return bytesToBigint(bytes);
}

function bytesToBigint(bytes: Uint8Array | number[]) {
  let x = 0n;
  let bitPosition = 0n;
  for (let byte of bytes) {
    x += BigInt(byte) << bitPosition;
    bitPosition += 8n;
  }
  return x;
}

function byteLength(x: bigint) {
  return Math.ceil(x.toString(16).length / 2);
}

// finite field helpers (copied here from src/bindings/crypto/finite-field.ts)

// modular exponentiation, a^n % p
function power(a: bigint, n: bigint, p: bigint) {
  a = mod(a, p);
  let x = 1n;
  for (; n > 0n; n >>= 1n) {
    if (n & 1n) x = mod(x * a, p);
    a = mod(a * a, p);
  }
  return x;
}

// modular inverse, 1/a in Z_p
function inverse(a: bigint, p: bigint) {
  a = mod(a, p);
  if (a === 0n) throw Error('modular inverse: division by 0');
  let b = p;
  let [x, y, u, v] = [0n, 1n, 1n, 0n];
  while (a !== 0n) {
    let q = b / a;
    [b, a] = [a, b - a * q];
    [x, u] = [u, x - u * q];
    [y, v] = [v, y - v * q];
  }
  if (b !== 1n) throw Error('modular inverse failed (b != 1)');
  return mod(x, p);
}

function mod(x: bigint, p: bigint) {
  x = x % p;
  if (x < 0) return x + p;
  return x;
}

// primes up to 1000, to speed up miller-rabin
// prettier-ignore
let knownPrimes = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
  73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151,
  157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233,
  239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317,
  331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419,
  421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503,
  509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607,
  613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701,
  709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811,
  821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911,
  919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997
].map(BigInt);
