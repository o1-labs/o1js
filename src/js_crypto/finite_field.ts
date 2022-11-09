// CONSTANTS

// the modulus. called `p` in most of our code.
let caml_pasta_p_bigint =
  0x40000000000000000000000000000000224698fc094cf91b992d30ed00000001n;
let caml_pasta_q_bigint =
  0x40000000000000000000000000000000224698fc0994a8dd8c46eb2100000001n;
// this is `t`, where p = 2^32 * t + 1
let caml_pasta_pm1_odd_factor =
  0x40000000000000000000000000000000224698fc094cf91b992d30edn;
let caml_pasta_qm1_odd_factor =
  0x40000000000000000000000000000000224698fc0994a8dd8c46eb21n;

// primitive roots of unity, computed as (5^t mod p). this works because 5 generates the multiplicative group mod p
let caml_twoadic_root_fp =
  0x2bce74deac30ebda362120830561f81aea322bf2b7bb7584bdad6fabd87ea32fn;
let caml_twoadic_root_fq =
  0x2de6a9b8746d3f589e5c4dfd492ae26e9bb97ea3c106f049a70e2c1102b6d05fn;

// GENERAL FINITE FIELD ALGORITHMS

function caml_bigint_modulo(x, p) {
  x = x % p;
  if (x < 0) return x + p;
  return x;
}

// modular exponentiation, a^n % p
function caml_finite_field_power(a, n, p) {
  a = caml_bigint_modulo(a, p);
  // this assumes that p is prime, so that a^(p-1) % p = 1
  n = caml_bigint_modulo(n, p - 1n);
  let x = 1n;
  for (; n > 0n; n >>= 1n) {
    if (n & 1n) x = caml_bigint_modulo(x * a, p);
    a = caml_bigint_modulo(a * a, p);
  }
  return x;
}

// inverting with EGCD, 1/a in Z_p
function caml_finite_field_inverse(a, p) {
  a = caml_bigint_modulo(a, p);
  if (a === 0n) return undefined;
  let b = p;
  let x = 0n;
  let y = 1n;
  let u = 1n;
  let v = 0n;
  while (a !== 0n) {
    let q = b / a;
    let r = caml_bigint_modulo(b, a);
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
  return caml_bigint_modulo(x, p);
}

let caml_finite_field_sqrt = (function () {
  let precomputed_c = {};
  return function caml_finite_field_sqrt(n, p, Q, z) {
    // https://en.wikipedia.org/wiki/Tonelli-Shanks_algorithm#The_algorithm
    // variable naming is the same as in that link ^
    // Q is what we call `t` elsewhere - the odd factor in p - 1
    // z is a known non-square mod p. we pass in the primitive root of unity
    let M = 32n;
    let c =
      precomputed_c[p.toString()] ||
      (precomputed_c[p.toString()] = caml_finite_field_power(z, Q, p)); // z^Q
    // TODO: can we save work by sharing computation between t and R?
    let t = caml_finite_field_power(n, Q, p); // n^Q
    let R = caml_finite_field_power(n, (Q + 1n) / 2n, p); // n^((Q + 1)/2)
    while (true) {
      if (t === 0n) return 0n;
      if (t === 1n) return R;
      // use repeated squaring to find the least i, 0 < i < M, such that t^(2^i) = 1
      let i = 0n;
      let s = t;
      while (s !== 1n) {
        s = caml_bigint_modulo(s * s, p);
        i = i + 1n;
      }
      if (i === M) return undefined; // no solution
      let b = caml_finite_field_power(c, 1n << (M - i - 1n), p); // c^(2^(M-i-1))
      M = i;
      c = caml_bigint_modulo(b * b, p);
      t = caml_bigint_modulo(t * c, p);
      R = caml_bigint_modulo(R * b, p);
    }
  };
})();

function caml_finite_field_is_square(x, p) {
  if (x === 0n) return 1;
  let sqrt_1 = caml_finite_field_power(x, (p - 1n) / 2n, p);
  return Number(sqrt_1 === 1n);
}

let caml_random_bytes = (function () {
  // have to use platform-dependent secure randomness
  let crypto = joo_global_object.crypto;
  if (crypto !== undefined && crypto.getRandomValues !== undefined) {
    // browser / deno
    return function randomBytes(n) {
      return crypto.getRandomValues(new Uint8Array(n));
    };
  } else if (typeof require !== 'undefined') {
    // node (common JS)
    crypto = require('crypto');
    return function randomBytes(n) {
      return new Uint8Array(crypto.randomBytes(n));
    };
  } else {
    throw Error(
      "don't know how to find random number generator for this platform without breaking other platforms"
    );
  }
})();

function caml_finite_field_random(p) {
  // strategy: find random 255-bit bigints and use the first that's smaller than p
  while (true) {
    let bytes = caml_random_bytes(32);
    bytes[31] &= 0x7f; // zero highest bit, so we get 255 random bits
    let x = caml_bigint_of_bytes(bytes);
    if (x < p) return x;
  }
}

function caml_finite_field_domain_generator(i, p, primitive_root_of_unity) {
  // this takes an integer i and returns the 2^ith root of unity, i.e. a number `w` with
  // w^(2^i) = 1, w^(2^(i-1)) = -1
  // computed by taking the 2^32th root and squaring 32-i times
  if (i > 32 || i < 0)
    throw Error('log2 size of evaluation domain must be in [0, 32], got ' + i);
  if (i === 0) return 1n;
  let generator = primitive_root_of_unity;
  for (let j = 32; j > i; j--) {
    generator = caml_bigint_modulo(generator * generator, p);
  }
  return generator;
}

// SPECIALIZATIONS TO FP, FQ
// these get exported to ocaml, and should be mostly trivial

function caml_pasta_fp_add(x, y) {
  return [caml_bigint_modulo(x[0] + y[0], caml_pasta_p_bigint)];
}

function caml_pasta_fq_add(x, y) {
  return [caml_bigint_modulo(x[0] + y[0], caml_pasta_q_bigint)];
}

function caml_pasta_fp_negate(x) {
  if (!x[0]) return [x[0]];
  return [caml_pasta_p_bigint - x[0]];
}
function caml_pasta_fq_negate(x) {
  if (!x[0]) return [x[0]];
  return [caml_pasta_q_bigint - x[0]];
}

function caml_pasta_fp_sub(x, y) {
  return [caml_bigint_modulo(x[0] - y[0], caml_pasta_p_bigint)];
}
function caml_pasta_fq_sub(x, y) {
  return [caml_bigint_modulo(x[0] - y[0], caml_pasta_q_bigint)];
}

function caml_pasta_fp_mul(x, y) {
  return [caml_bigint_modulo(x[0] * y[0], caml_pasta_p_bigint)];
}
function caml_pasta_fq_mul(x, y) {
  return [caml_bigint_modulo(x[0] * y[0], caml_pasta_q_bigint)];
}

function caml_pasta_option(x) {
  if (x === undefined || x[0] === undefined) return 0; // None
  return [0, x]; // Some(x)
}

let caml_pasta_fp_option = caml_pasta_option;
let caml_pasta_fq_option = caml_pasta_option;

function caml_pasta_fp_inv(x) {
  let xinv = [caml_finite_field_inverse(x[0], caml_pasta_p_bigint)];
  return caml_pasta_fp_option(xinv);
}
function caml_pasta_fq_inv(x) {
  let xinv = [caml_finite_field_inverse(x[0], caml_pasta_q_bigint)];
  return caml_pasta_fq_option(xinv);
}

function caml_pasta_fp_div(x, y) {
  return [
    caml_bigint_modulo(
      x[0] * caml_finite_field_inverse(y[0], caml_pasta_p_bigint),
      caml_pasta_p_bigint
    ),
  ];
}
function caml_pasta_fq_div(x, y) {
  return [
    caml_bigint_modulo(
      x[0] * caml_finite_field_inverse(y[0], caml_pasta_q_bigint),
      caml_pasta_q_bigint
    ),
  ];
}

function caml_pasta_fp_square(x) {
  return caml_pasta_fp_mul(x, x);
}
function caml_pasta_fq_square(x) {
  return caml_pasta_fq_mul(x, x);
}

function caml_pasta_fp_is_square(x) {
  let is_square = caml_finite_field_is_square(x[0], caml_pasta_p_bigint);
  return caml_js_to_bool(is_square);
}
function caml_pasta_fq_is_square(x) {
  let is_square = caml_finite_field_is_square(x[0], caml_pasta_q_bigint);
  return caml_js_to_bool(is_square);
}

function caml_pasta_fp_sqrt(x) {
  let sqrt = [
    caml_finite_field_sqrt(
      x[0],
      caml_pasta_p_bigint,
      caml_pasta_pm1_odd_factor,
      caml_twoadic_root_fp
    ),
  ];
  return caml_pasta_fp_option(sqrt);
}
function caml_pasta_fq_sqrt(x) {
  let sqrt = [
    caml_finite_field_sqrt(
      x[0],
      caml_pasta_q_bigint,
      caml_pasta_qm1_odd_factor,
      caml_twoadic_root_fq
    ),
  ];
  return caml_pasta_fq_option(sqrt);
}

function caml_pasta_fp_equal(x, y) {
  return Number(x[0] === y[0]);
}
function caml_pasta_fq_equal(x, y) {
  return Number(x[0] === y[0]);
}

function caml_pasta_fp_random() {
  return [caml_finite_field_random(caml_pasta_p_bigint)];
}
function caml_pasta_fq_random() {
  return [caml_finite_field_random(caml_pasta_q_bigint)];
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
  return [caml_pasta_p_bigint];
}
function caml_pasta_fq_size() {
  return [caml_pasta_q_bigint];
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

function caml_pasta_fp_domain_generator(i) {
  return [
    caml_finite_field_domain_generator(
      i,
      caml_pasta_p_bigint,
      caml_twoadic_root_fp
    ),
  ];
}
function caml_pasta_fq_domain_generator(i) {
  return [
    caml_finite_field_domain_generator(
      i,
      caml_pasta_q_bigint,
      caml_twoadic_root_fq
    ),
  ];
}

// TESTS (activate by setting caml_bindings_debug = true)

// Provides: caml_bindings_debug
let caml_bindings_debug = false;

// Provides: _test_finite_field
// Requires: caml_bindings_debug, caml_pasta_p_bigint, caml_pasta_q_bigint, caml_pasta_pm1_odd_factor, caml_pasta_qm1_odd_factor, BigInt, caml_twoadic_root_fp, caml_twoadic_root_fq, caml_finite_field_power, caml_pasta_fp_is_square, caml_pasta_fq_is_square, caml_finite_field_domain_generator
let _test_finite_field =
  caml_bindings_debug &&
  (function test() {
    let console = joo_global_object.console;
    // t is computed correctly from p = 2^32 * t + 1
    console.assert(
      caml_pasta_pm1_odd_factor * (1n << 32n) + 1n === caml_pasta_p_bigint
    );
    console.assert(
      caml_pasta_qm1_odd_factor * (1n << 32n) + 1n === caml_pasta_q_bigint
    );

    // the primitive root of unity is computed correctly as 5^t
    let generator = 5n;
    let root_fp = caml_finite_field_power(
      generator,
      caml_pasta_pm1_odd_factor,
      caml_pasta_p_bigint
    );
    console.assert(root_fp === caml_twoadic_root_fp);
    let root_fq = caml_finite_field_power(
      generator,
      caml_pasta_qm1_odd_factor,
      caml_pasta_q_bigint
    );
    console.assert(root_fq === caml_twoadic_root_fq);

    // the primitive roots of unity `r` actually satisfy the equations defining them:
    // r^(2^32) = 1, r^(2^31) != 1
    let should_be_1 = caml_finite_field_power(
      caml_twoadic_root_fp,
      1n << 32n,
      caml_pasta_p_bigint
    );
    let should_be_minus_1 = caml_finite_field_power(
      caml_twoadic_root_fp,
      1n << 31n,
      caml_pasta_p_bigint
    );
    console.assert(should_be_1 === 1n);
    console.assert(should_be_minus_1 + 1n === caml_pasta_p_bigint);

    should_be_1 = caml_finite_field_power(
      caml_twoadic_root_fq,
      1n << 32n,
      caml_pasta_q_bigint
    );
    should_be_minus_1 = caml_finite_field_power(
      caml_twoadic_root_fq,
      1n << 31n,
      caml_pasta_q_bigint
    );
    console.assert(should_be_1 === 1n);
    console.assert(should_be_minus_1 + 1n === caml_pasta_q_bigint);

    // the primitive roots of unity are non-squares
    // -> verifies that the two-adicity is 32, and that they can be used as non-squares in the sqrt algorithm
    console.assert(caml_pasta_fp_is_square([caml_twoadic_root_fp]) === 0);
    console.assert(caml_pasta_fq_is_square([caml_twoadic_root_fq]) === 0);

    // the domain generator for log2_size=i satisfies the equations we expect:
    // generator^(2^i) = 1, generator^(2^(i-1)) = -1
    let i = 10;
    let domain_gen = caml_finite_field_domain_generator(
      i,
      caml_pasta_p_bigint,
      caml_twoadic_root_fp
    );
    should_be_1 = caml_finite_field_power(
      domain_gen,
      1n << BigInt(i),
      caml_pasta_p_bigint
    );
    should_be_minus_1 = caml_finite_field_power(
      domain_gen,
      1n << BigInt(i - 1),
      caml_pasta_p_bigint
    );
    console.assert(should_be_1 === 1n);
    console.assert(should_be_minus_1 + 1n === caml_pasta_p_bigint);
  })();
