export { isPrime, modularExponentiation, randomBigintInRange };

function modularExponentiation(base: bigint, exponent: bigint, modulus: bigint): bigint {
    let result = 1n;
    base = base % modulus;
  
    while (exponent > 0n) {
      if (exponent % 2n === 1n) {
        result = (result * base) % modulus;
      }
      exponent = exponent >> 1n;
      base = (base * base) % modulus;
    }
  
    return result;
  }
  
  /**
   * Miller-Rabin primality test
   * @param n The number to test for primality
   * @param k Number of iterations (higher = more accurate)
   * @returns true if n is probably prime, false if n is definitely composite
   */
  function isPrime(n: bigint, k: number = 10): boolean {
    if (n === 2n || n === 3n) return true;
    if (n < 2n) return false;
    if (n % 2n === 0n) return false;
  
    // write n - 1 = 2^r * d, d is odd
    let d = n - 1n;
    let r = 0n;
    for (; d % 2n === 0n; d /= 2n, r++);
  
    WitnessLoop: for (let i = 0; i < k; i++) {
      let a = randomBigintInRange(2n, n - 2n);
      let x = modularExponentiation(a, d, n);
      if (x === 1n || x === n - 1n) continue;
      for (let j = 0; j + 1 < r; j++) {
        x = (x * x) % n;
        if (x === 1n) return false;
        if (x === n - 1n) continue WitnessLoop;
      }
      return false;
    }
    return true;
  }
  
  /**
   * Generates a random bigint in the range [min, max)
   * @param min The minimum value (inclusive)
   * @param max The maximum value (exclusive)
   * @returns A random bigint in the range [min, max)
   */
  function randomBigintInRange(min: bigint, max: bigint): bigint {
    const range = max - min;
    const length = Math.ceil(range.toString(2).length / 8);
  
    while (true) {
      // Generate random bytes
      const bytes = new Uint8Array(length);
      crypto.getRandomValues(bytes);
  
      // Convert bytes to bigint
      let x = BigInt(0);
      for (const byte of bytes) {
        x = (x << 8n) + BigInt(byte);
      }
  
      // Check if x is within the range
      if (x < range) {
        return min + x;
      }
    }
  }