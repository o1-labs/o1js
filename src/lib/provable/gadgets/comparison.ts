import type { Field } from '../field.js';
import { createBool, createField } from '../core/field-constructor.js';
import { Fp } from '../../../bindings/crypto/finite-field.js';
import { assert } from '../../../lib/util/assert.js';
import { exists } from '../core/exists.js';
import { assertMul } from './compatible.js';

export { compareCompatible };

/**
 * Compare x and y assuming both have at most `n` bits.
 */
function compareCompatible(x: Field, y: Field, n = Fp.sizeInBits - 2) {
  // compatible with snarky's `compare`

  let maxLength = Fp.sizeInBits - 2;
  assert(n <= maxLength, `bitLength must be at most ${maxLength}`);

  // 2^n + x - y
  let z = createField(1n << BigInt(n))
    .add(y)
    .sub(x);

  let zBits = unpack(z, n + 1);

  // n-th bit tells us if x <= y
  let lessOrEqual = zBits[n];

  // other bits tell us if x = y
  let prefix = zBits.slice(0, n);
  let notAllZeros = prefix.reduce((a, b) => a.or(b));
  let less = lessOrEqual.and(notAllZeros);

  return { lessOrEqual, less };
}

// custom version of toBits to be compatible

function unpack(x: Field, length: number) {
  let bits = exists(length, () => {
    let x0 = x.toBigInt();
    return Array.from({ length }, (_, k) => (x0 >> BigInt(k)) & 1n);
  });
  bits.forEach((b) => b.assertBool());
  let lc = bits.reduce(
    (acc, b, i) => acc.add(b.mul(1n << BigInt(i))),
    createField(0)
  );
  assertMul(lc, createField(1), x);
  return bits.map((b) => createBool(b.value));
}
