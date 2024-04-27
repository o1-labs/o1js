import { createHash } from 'node:crypto';
import bigInt from 'big-integer';

export {
  generateDigestBigint,
  toBigInt,
  generateRandomPrime,
  generateRsaParams,
  rsaSign,
};

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
function generateDigestBigint(message: string) {
  const digest = createHash('sha256').update(message, 'utf8').digest('hex');
  return BigInt('0x' + digest);
}

/**
 * Converts a big-integer object to a native bigint.
 * @param x - The big-integer object to be converted.
 * @returns The big-integer value converted to a native bigint.
 */
function toBigInt(x: bigInt.BigInteger): bigint {
  return BigInt('0x' + x.toString(16));
}

/**
 * Generates RSA parameters including prime numbers, public exponent, and private exponent.
 * @param primeSize - The bit size of the prime numbers used for generating the RSA parameters.
 * @returns An object containing the RSA parameters:
 *                    - p (prime),
 *                    - q (prime),
 *                    - n (modulus),
 *                    - phiN (Euler's totient function),
 *                    - e (public exponent),
 *                    - d (private exponent).
 */
function generateRsaParams(primeSize: number) {
  // Generate two random prime numbers
  const p = generateRandomPrime(primeSize / 2);
  const q = generateRandomPrime(primeSize / 2);

  // Public exponent
  const e = 65537n;

  // Euler's totient function
  const phiN = (p - 1n) * (q - 1n);

  // Private exponent
  const d = inverse(e, phiN);

  return { p, q, n: p * q, phiN, e, d };
}

/**
 * Generates a random prime number with the specified bit length.
 * @param bitLength - The desired bit length of the prime number. Default is 1024.
 * @returns A random prime number with the specified bit length.
 */
function generateRandomPrime(bitLength: number): bigint {
  let primeCandidate;
  do {
    // Generate a random number with the desired bit length
    primeCandidate = bigInt.randBetween(
      bigInt(2).pow(bitLength - 1), // Lower bound
      bigInt(2).pow(bitLength).minus(1) // Upper bound
    );

    // Ensure the number is odd
    if (!primeCandidate.isOdd()) {
      primeCandidate = primeCandidate.add(1);
    }
  } while (!primeCandidate.isPrime());

  return toBigInt(primeCandidate);
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
function inverse(a_: bigint, p: bigint) {
  let a = mod(a_, p);
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
  // TODO remove
  if (mod(x * a_, p) !== 1n) throw Error('modular inverse failed');
  return mod(x, p);
}

function mod(x: bigint, p: bigint) {
  x = x % p;
  if (x < 0) return x + p;
  return x;
}
