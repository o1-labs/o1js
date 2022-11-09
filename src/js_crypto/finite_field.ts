export { p, q, mod, inverse };

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
  if (x === 0n) return 1;
  let sqrt_1 = power(x, (p - 1n) / 2n, p);
  return Number(sqrt_1 === 1n);
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
// these get exported to ocaml, and should be mostly trivial

function caml_pasta_fp_add(x, y) {
  return [mod(x[0] + y[0], p)];
}

function caml_pasta_fq_add(x, y) {
  return [mod(x[0] + y[0], q)];
}

function caml_pasta_fp_negate(x) {
  if (!x[0]) return [x[0]];
  return [p - x[0]];
}
function caml_pasta_fq_negate(x) {
  if (!x[0]) return [x[0]];
  return [q - x[0]];
}

function caml_pasta_fp_sub(x, y) {
  return [mod(x[0] - y[0], p)];
}
function caml_pasta_fq_sub(x, y) {
  return [mod(x[0] - y[0], q)];
}

function caml_pasta_fp_mul(x, y) {
  return [mod(x[0] * y[0], p)];
}
function caml_pasta_fq_mul(x, y) {
  return [mod(x[0] * y[0], q)];
}

function caml_pasta_option(x) {
  if (x === undefined || x[0] === undefined) return 0; // None
  return [0, x]; // Some(x)
}

let caml_pasta_fp_option = caml_pasta_option;
let caml_pasta_fq_option = caml_pasta_option;

function caml_pasta_fp_inv(x) {
  let xinv = [inverse(x[0], p)];
  return caml_pasta_fp_option(xinv);
}
function caml_pasta_fq_inv(x) {
  let xinv = [inverse(x[0], q)];
  return caml_pasta_fq_option(xinv);
}

function caml_pasta_fp_div(x, y) {
  return [mod(x[0] * inverse(y[0], p), p)];
}
function caml_pasta_fq_div(x, y) {
  return [mod(x[0] * inverse(y[0], q), q)];
}

function caml_pasta_fp_square(x) {
  return caml_pasta_fp_mul(x, x);
}
function caml_pasta_fq_square(x) {
  return caml_pasta_fq_mul(x, x);
}

function caml_pasta_fp_is_square(x) {
  let is_square = isSquare(x[0], p);
  return caml_js_to_bool(is_square);
}
function caml_pasta_fq_is_square(x) {
  let is_square = isSquare(x[0], q);
  return caml_js_to_bool(is_square);
}

function caml_pasta_fp_sqrt(x) {
  let sqrt = [sqrt(x[0], p, pMinusOneOddFactor, twoadicRootFp)];
  return caml_pasta_fp_option(sqrt);
}
function caml_pasta_fq_sqrt(x) {
  let sqrt = [sqrt(x[0], q, qMinusOneOddFactor, twoadicRootFq)];
  return caml_pasta_fq_option(sqrt);
}

function caml_pasta_fp_equal(x, y) {
  return Number(x[0] === y[0]);
}
function caml_pasta_fq_equal(x, y) {
  return Number(x[0] === y[0]);
}

function caml_pasta_fp_random() {
  return [randomField(p)];
}
function caml_pasta_fq_random() {
  return [randomField(q)];
}

function caml_pasta_fp_of_int(i) {
  return [BigInt(i)];
}
function caml_pasta_fq_of_int(i) {
  return [BigInt(i)];
}

function caml_pasta_fp_of_bigint(x) {
  return x;
}
function caml_pasta_fq_of_bigint(x) {
  return x;
}
function caml_pasta_fp_to_bigint(x) {
  return x;
}
function caml_pasta_fq_to_bigint(x) {
  return x;
}

function caml_pasta_fp_to_string(x) {
  return caml_string_of_jsstring(x[0].toString());
}
function caml_pasta_fq_to_string(x) {
  return caml_string_of_jsstring(x[0].toString());
}

function caml_pasta_fp_size() {
  return [p];
}
function caml_pasta_fq_size() {
  return [q];
}
function caml_pasta_fp_size_in_bits() {
  return 255;
}
function caml_pasta_fq_size_in_bits() {
  return 255;
}

function caml_pasta_fp_copy(x, y) {
  x[0] = y[0];
}
function caml_pasta_fq_copy(x, y) {
  x[0] = y[0];
}
function operation_to_mutation(op) {
  return function (x, y) {
    x[0] = op(x, y)[0];
  };
}
let caml_pasta_fp_mut_add = operation_to_mutation(caml_pasta_fp_add);
let caml_pasta_fq_mut_add = operation_to_mutation(caml_pasta_fq_add);
let caml_pasta_fp_mut_sub = operation_to_mutation(caml_pasta_fp_sub);
let caml_pasta_fq_mut_sub = operation_to_mutation(caml_pasta_fq_sub);
let caml_pasta_fp_mut_mul = operation_to_mutation(caml_pasta_fp_mul);
let caml_pasta_fq_mut_mul = operation_to_mutation(caml_pasta_fq_mul);
function caml_pasta_fp_mut_square(x) {
  caml_pasta_fp_copy(x, caml_pasta_fp_square(x));
}
function caml_pasta_fq_mut_square(x) {
  caml_pasta_fq_copy(x, caml_pasta_fq_square(x));
}

// TESTS (activate by setting caml_bindings_debug = true)

let caml_bindings_debug = false;

if (caml_bindings_debug) test();

function test() {
  // t is computed correctly from p = 2^32 * t + 1
  console.assert(pMinusOneOddFactor * (1n << 32n) + 1n === p);
  console.assert(qMinusOneOddFactor * (1n << 32n) + 1n === q);

  // the primitive root of unity is computed correctly as 5^t
  let generator = 5n;
  let root_fp = power(generator, pMinusOneOddFactor, p);
  console.assert(root_fp === twoadicRootFp);
  let root_fq = power(generator, qMinusOneOddFactor, q);
  console.assert(root_fq === twoadicRootFq);

  // the primitive roots of unity `r` actually satisfy the equations defining them:
  // r^(2^32) = 1, r^(2^31) != 1
  let should_be_1 = power(twoadicRootFp, 1n << 32n, p);
  let should_be_minus_1 = power(twoadicRootFp, 1n << 31n, p);
  console.assert(should_be_1 === 1n);
  console.assert(should_be_minus_1 + 1n === p);

  should_be_1 = power(twoadicRootFq, 1n << 32n, q);
  should_be_minus_1 = power(twoadicRootFq, 1n << 31n, q);
  console.assert(should_be_1 === 1n);
  console.assert(should_be_minus_1 + 1n === q);

  // the primitive roots of unity are non-squares
  // -> verifies that the two-adicity is 32, and that they can be used as non-squares in the sqrt algorithm
  console.assert(caml_pasta_fp_is_square([twoadicRootFp]) === 0);
  console.assert(caml_pasta_fq_is_square([twoadicRootFq]) === 0);
}
