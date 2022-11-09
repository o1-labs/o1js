export { Fp, Fq, p, q, mod, inverse };

// CONSTANTS

// the modulus. called `p` in most of our code.
const p = 0x40000000000000000000000000000000224698fc094cf91b992d30ed00000001n;
const q = 0x40000000000000000000000000000000224698fc0994a8dd8c46eb2100000001n;

// this is `t`, where p = 2^32 * t + 1
const pMinusOneOddFactor =
  0x40000000000000000000000000000000224698fc094cf91b992d30edn;
const qMinusOneOddFactor =
  0x40000000000000000000000000000000224698fc0994a8dd8c46eb21n;

// primitive roots of unity, computed as (5^t mod p). this works because 5 generates the multiplicative group mod p
const twoadicRootFp =
  0x2bce74deac30ebda362120830561f81aea322bf2b7bb7584bdad6fabd87ea32fn;
const twoadicRootFq =
  0x2de6a9b8746d3f589e5c4dfd492ae26e9bb97ea3c106f049a70e2c1102b6d05fn;

// GENERAL FINITE FIELD ALGORITHMS

function mod(x: bigint, p: bigint) {
  x = x % p;
  if (x < 0) return x + p;
  return x;
}

// modular exponentiation, a^n % p
function power(a: bigint, n: bigint, p: bigint) {
  a = mod(a, p);
  // this assumes that p is prime, so that a^(p-1) % p = 1
  n = mod(n, p - 1n);
  let x = 1n;
  for (; n > 0n; n >>= 1n) {
    if (n & 1n) x = mod(x * a, p);
    a = mod(a * a, p);
  }
  return x;
}

// inverting with EGCD, 1/a in Z_p
function inverse(a: bigint, p: bigint) {
  a = mod(a, p);
  if (a === 0n) return undefined;
  let b = p;
  let x = 0n;
  let y = 1n;
  let u = 1n;
  let v = 0n;
  while (a !== 0n) {
    let q = b / a;
    let r = mod(b, a);
    let m = x - u * q;
    let n = y - v * q;
    b = a;
    a = r;
    x = u;
    y = v;
    u = m;
    v = n;
  }
  if (b !== 1n) return undefined;
  return mod(x, p);
}

let precomputed_c: Record<string, bigint> = {};

function sqrt(n: bigint, p: bigint, Q: bigint, z: bigint) {
  // https://en.wikipedia.org/wiki/Tonelli-Shanks_algorithm#The_algorithm
  // variable naming is the same as in that link ^
  // Q is what we call `t` elsewhere - the odd factor in p - 1
  // z is a known non-square mod p. we pass in the primitive root of unity
  let M = 32n;
  let c =
    precomputed_c[p.toString()] ||
    (precomputed_c[p.toString()] = power(z, Q, p)); // z^Q
  // TODO: can we save work by sharing computation between t and R?
  let t = power(n, Q, p); // n^Q
  let R = power(n, (Q + 1n) / 2n, p); // n^((Q + 1)/2)
  while (true) {
    if (t === 0n) return 0n;
    if (t === 1n) return R;
    // use repeated squaring to find the least i, 0 < i < M, such that t^(2^i) = 1
    let i = 0n;
    let s = t;
    while (s !== 1n) {
      s = mod(s * s, p);
      i = i + 1n;
    }
    if (i === M) return undefined; // no solution
    let b = power(c, 1n << (M - i - 1n), p); // c^(2^(M-i-1))
    M = i;
    c = mod(b * b, p);
    t = mod(t * c, p);
    R = mod(R * b, p);
  }
}

function isSquare(x: bigint, p: bigint) {
  if (x === 0n) return true;
  let sqrt1 = power(x, (p - 1n) / 2n, p);
  return sqrt1 === 1n;
}

let randomBytes = (function () {
  // have to use platform-dependent secure randomness
  let crypto = globalThis.crypto;
  if (crypto !== undefined && crypto.getRandomValues !== undefined) {
    // browser / deno
    return function randomBytes(n: number) {
      return crypto.getRandomValues(new Uint8Array(n));
    };
  } else if (typeof require !== 'undefined') {
    // node (common JS)
    let nodeCrypto = require('crypto');
    return function randomBytes(n: number) {
      return new Uint8Array(nodeCrypto.randomBytes(n));
    };
  } else {
    throw Error(
      "don't know how to find random number generator for this platform without breaking other platforms"
    );
  }
})();

function randomField(p: bigint) {
  // strategy: find random 255-bit bigints and use the first that's smaller than p
  while (true) {
    let bytes = randomBytes(32);
    bytes[31] &= 0x7f; // zero highest bit, so we get 255 random bits
    let x = bytesToBigInt(bytes);
    if (x < p) return x;
  }
}
function bytesToBigInt(bytes: Uint8Array) {
  let x = 0n;
  let bitPosition = 0n;
  for (let byte of bytes) {
    x += BigInt(byte) << bitPosition;
    bitPosition += 8n;
  }
  return x;
}

// SPECIALIZATIONS TO FP, FQ
// these should be mostly trivial

const Fp = createField(p, pMinusOneOddFactor, twoadicRootFp);
const Fq = createField(q, qMinusOneOddFactor, twoadicRootFq);

function createField(
  p: bigint,
  pMinusOneOddFactor: bigint,
  twoadicRootFp: bigint
) {
  return {
    modulus: p,
    sizeInBits: 255,

    add(x: bigint, y: bigint) {
      return mod(x + y, p);
    },
    negate(x: bigint) {
      return x === 0n ? 0n : p - x;
    },
    sub(x: bigint, y: bigint) {
      return mod(x - y, p);
    },
    mul(x: bigint, y: bigint) {
      return mod(x * y, p);
    },
    inverse(x: bigint) {
      return inverse(x, p);
    },
    div(x: bigint, y: bigint) {
      let yinv = inverse(y, p);
      if (yinv === undefined) return;
      return mod(x * yinv, p);
    },
    square(x: bigint) {
      return mod(x * x, p);
    },
    isSquare(x: bigint) {
      return isSquare(x, p);
    },
    sqrt(x: bigint) {
      return sqrt(x, p, pMinusOneOddFactor, twoadicRootFp);
    },
    equal(x: bigint, y: bigint) {
      return mod(x - y, p) === 0n;
    },
    random() {
      return randomField(p);
    },
    fromNumber(x: number) {
      return mod(BigInt(x), p);
    },
    fromBigint(x: bigint) {
      return mod(x, p);
    },
  };
}

// TESTS (activate by setting caml_bindings_debug = true)

let caml_bindings_debug = false;

if (caml_bindings_debug) test();

function test() {
  // t is computed correctly from p = 2^32 * t + 1
  console.assert(pMinusOneOddFactor * (1n << 32n) + 1n === p);

  // the primitive root of unity is computed correctly as 5^t
  let generator = 5n;
  let rootFp = power(generator, pMinusOneOddFactor, p);
  console.assert(rootFp === twoadicRootFp);

  // the primitive roots of unity `r` actually satisfy the equations defining them:
  // r^(2^32) = 1, r^(2^31) != 1
  let shouldBe1 = power(twoadicRootFp, 1n << 32n, p);
  let shouldBeMinus1 = power(twoadicRootFp, 1n << 31n, p);
  console.assert(shouldBe1 === 1n);
  console.assert(shouldBeMinus1 + 1n === p);

  // the primitive roots of unity are non-squares
  // -> verifies that the two-adicity is 32, and that they can be used as non-squares in the sqrt algorithm
  console.assert(!Fp.isSquare(twoadicRootFp));
}
