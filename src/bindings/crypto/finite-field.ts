import { assert } from '../../lib/util/assert.js';
import { bytesToBigInt, log2 } from './bigint-helpers.js';
import { randomBytes } from './random.js';

export { createField, Fp, Fq, FiniteField, p, q, mod, inverse };

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

// faster inversion algorithm based on
// Thomas Pornin, "Optimized Binary GCD for Modular Inversion", https://eprint.iacr.org/2020/972.pdf
// about 3x faster than `inverse()`
function fastInverse(
  x: bigint,
  p: bigint,
  n: number,
  kmax: bigint,
  twoToMinusKmax: bigint
) {
  x = mod(x, p);
  if (x === 0n) return undefined;

  // fixed constants
  const w = 31;
  const hiBits = 31;
  const wn = BigInt(w);
  const wMask = (1n << wn) - 1n;

  let u = p;
  let v = x;
  let r = 0n;
  let s = 1n;

  let i = 0;

  for (; i < 2 * n; i++) {
    let f0 = 1;
    let g0 = 0;
    let f1 = 0;
    let g1 = 1;

    let ulo = Number(u & wMask);
    let vlo = Number(v & wMask);

    let len = Math.max(log2(u), log2(v));
    let shift = BigInt(Math.max(len - hiBits, 0));

    let uhi = Number(u >> shift);
    let vhi = Number(v >> shift);

    for (let j = 0; j < w; j++) {
      if ((ulo & 1) === 0) {
        uhi >>= 1;
        ulo >>= 1;
        f1 <<= 1;
        g1 <<= 1;
      } else if ((vlo & 1) === 0) {
        vhi >>= 1;
        vlo >>= 1;
        f0 <<= 1;
        g0 <<= 1;
      } else {
        if (vhi <= uhi) {
          uhi = (uhi - vhi) >> 1;
          ulo = (ulo - vlo) >> 1;
          f0 = f0 + f1;
          g0 = g0 + g1;
          f1 <<= 1;
          g1 <<= 1;
        } else {
          vhi = (vhi - uhi) >> 1;
          vlo = (vlo - ulo) >> 1;
          f1 = f0 + f1;
          g1 = g0 + g1;
          f0 <<= 1;
          g0 <<= 1;
        }
      }
    }

    let f0n = BigInt(f0);
    let g0n = BigInt(g0);
    let f1n = BigInt(f1);
    let g1n = BigInt(g1);

    let unew = u * f0n - v * g0n;
    let vnew = v * g1n - u * f1n;
    u = unew >> wn;
    v = vnew >> wn;

    if (u < 0) (u = -u), (f0n = -f0n), (g0n = -g0n);
    if (v < 0) (v = -v), (f1n = -f1n), (g1n = -g1n);

    let rnew = r * f0n + s * g0n;
    let snew = s * g1n + r * f1n;
    r = rnew;
    s = snew;

    // these assertions are all true, enable when debugging:
    // let lin = v * r + u * s;
    // assert(lin === p || lin === -p, 'linear combination');
    // let k = BigInt((i + 1) * w);
    // assert(mod(x * r + u * 2n ** k, p) === 0n, 'mod p, r');
    // assert(mod(x * s - v * 2n ** k, p) === 0n, 'mod p, s');

    if (u === 0n) break;

    // empirically this never happens, but there might be unlucky edge cases where it does, due to sign flips
    if (v === 0n) {
      assert(u === 1n, 'u = 1');
      s = mod(-r, p);
      break;
    }
  }
  let k = BigInt((i + 1) * w);

  // now s = 2^k/x mod p
  // correction step to go from 2^k/x to 1/x
  s = mod(s * twoToMinusKmax, p); // s <- s * 2^(-kmax) = 2^(k - kmax)/x
  s = mod(s << (kmax - k), p); // s <- s * 2^(kmax - k) = 1/x

  // yes this has a slight cost and the assert is never triggered,
  // but it's worth having for the sake of assurance
  assert(mod(x * s - 1n, p) === 0n, 'mod p');
  return s;
}

function sqrt(n_: bigint, p: bigint, Q: bigint, c: bigint, M: bigint) {
  // https://en.wikipedia.org/wiki/Tonelli-Shanks_algorithm#The_algorithm
  // variable naming is the same as in that link ^
  // Q is what we call `t` elsewhere - the odd factor in p - 1
  // c is a known primitive root of unity
  // M is the twoadicity = exponent of 2 in factorization of p - 1
  let n = mod(n_, p);
  if (n === 0n) return 0n;
  let t = power(n, (Q - 1n) >> 1n, p); // n^(Q - 1)/2
  let R = mod(t * n, p); // n^((Q - 1)/2 + 1) = n^((Q + 1)/2)
  t = mod(t * R, p); // n^((Q - 1)/2 + (Q + 1)/2) = n^Q
  while (true) {
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

function isSquare(x_: bigint, p: bigint) {
  let x = mod(x_, p);
  if (x === 0n) return true;
  let sqrt1 = power(x, (p - 1n) / 2n, p);
  return sqrt1 === 1n;
}

function randomField(p: bigint, sizeInBytes: number, hiBitMask: number) {
  // strategy: find random 255-bit bigints and use the first that's smaller than p
  while (true) {
    let bytes = randomBytes(sizeInBytes);
    bytes[sizeInBytes - 1] &= hiBitMask; // zero highest bit, so we get 255 random bits
    let x = bytesToBigInt(bytes);
    if (x < p) return x;
  }
}

// SPECIALIZATIONS TO FP, FQ
// these should be mostly trivial

const Fp = createField(p, {
  oddFactor: pMinusOneOddFactor,
  twoadicRoot: twoadicRootFp,
  twoadicity: 32n,
});
const Fq = createField(q, {
  oddFactor: qMinusOneOddFactor,
  twoadicRoot: twoadicRootFq,
  twoadicity: 32n,
});
type FiniteField = ReturnType<typeof createField>;

function createField(
  p: bigint,
  constants?: { oddFactor: bigint; twoadicRoot: bigint; twoadicity: bigint }
) {
  let { oddFactor, twoadicRoot, twoadicity } =
    constants ?? computeFieldConstants(p);
  let sizeInBits = log2(p);
  let sizeInBytes = Math.ceil(sizeInBits / 8);
  let sizeHighestByte = sizeInBits - 8 * (sizeInBytes - 1);
  let hiBitMask = (1 << sizeHighestByte) - 1;

  // parameters for fast inverse
  const w = 31;
  const n = Math.ceil(sizeInBits / w);
  const kmax = BigInt(2 * n * w);

  // constant for correcting 2^k/x -> 1/x, by multiplying with 2^-kmax * 2^(kmax - k)
  const twoToMinusKmax = inverse(1n << kmax, p);
  const exportedInverse =
    twoToMinusKmax !== undefined
      ? (x: bigint) => fastInverse(x, p, n, kmax, twoToMinusKmax)
      : (x: bigint) => inverse(x, p);

  return {
    modulus: p,
    sizeInBits,
    t: oddFactor,
    M: twoadicity,
    twoadicRoot,
    mod(x: bigint) {
      return mod(x, p);
    },
    add(x: bigint, y: bigint) {
      return mod(x + y, p);
    },
    not(x: bigint, bits: number) {
      return mod(2n ** BigInt(bits) - (x + 1n), p);
    },
    negate(x: bigint) {
      return x === 0n ? 0n : mod(-x, p);
    },
    sub(x: bigint, y: bigint) {
      return mod(x - y, p);
    },
    mul(x: bigint, y: bigint) {
      return mod(x * y, p);
    },
    inverse: exportedInverse,
    div(x: bigint, y: bigint) {
      let yinv = exportedInverse(y);
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
      return sqrt(x, p, oddFactor, twoadicRoot, twoadicity);
    },
    power(x: bigint, n: bigint) {
      return power(x, n, p);
    },
    dot(x: bigint[], y: bigint[]) {
      let z = 0n;
      let n = x.length;
      for (let i = 0; i < n; i++) {
        z += x[i] * y[i];
      }
      return mod(z, p);
    },
    equal(x: bigint, y: bigint) {
      // We check if x and y are both in the range [0, p). If they are, can do a simple comparison. Otherwise, we need to reduce them to the proper canonical field range.
      let x_ = x >= 0n && x < p ? x : mod(x, p);
      let y_ = y >= 0n && y < p ? y : mod(y, p);
      return x_ === y_;
    },
    isEven(x: bigint) {
      return !(mod(x, p) & 1n);
    },
    random() {
      return randomField(p, sizeInBytes, hiBitMask);
    },
    fromNumber(x: number) {
      return mod(BigInt(x), p);
    },
    fromBigint(x: bigint) {
      return mod(x, p);
    },
    rot(
      x: bigint,
      bits: bigint,
      direction: 'left' | 'right' = 'left',
      maxBits = 64n
    ) {
      if (direction === 'right') bits = maxBits - bits;
      let full = x << bits;
      let excess = full >> maxBits;
      let shifted = full & ((1n << maxBits) - 1n);
      return shifted | excess;
    },
    leftShift(x: bigint, bits: number, maxBitSize: number = 64) {
      let shifted = x << BigInt(bits);
      return shifted & ((1n << BigInt(maxBitSize)) - 1n);
    },
    rightShift(x: bigint, bits: number) {
      return x >> BigInt(bits);
    },
  };
}

/**
 * Compute constants to instantiate a finite field just from the modulus
 */
function computeFieldConstants(p: bigint) {
  // figure out the factorization p - 1 = 2^M * t
  let oddFactor = p - 1n;
  let twoadicity = 0n;
  while ((oddFactor & 1n) === 0n) {
    oddFactor >>= 1n;
    twoadicity++;
  }

  // find z = non-square
  // start with 2 and increment until we find one
  let z = 2n;
  while (isSquare(z, p)) z++;

  // primitive root of unity is z^t
  let twoadicRoot = power(z, oddFactor, p);

  return { oddFactor, twoadicRoot, twoadicity };
}
