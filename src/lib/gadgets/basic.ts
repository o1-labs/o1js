import { Fp } from '../../bindings/crypto/finite_field.js';
import type { Field } from '../field.js';
import { existsOne, toVar } from './common.js';
import { Gates } from '../gates.js';
import { Snarky } from '../../snarky.js';

export { assertBoolean, arrayGet };

/**
 * Assert that x is either 0 or 1.
 */
function assertBoolean(x: Field) {
  Snarky.field.assertBoolean(x.value);
}

// TODO: create constant versions of these and expose on Gadgets

/**
 * Get value from array in O(n) rows.
 *
 * Assumes that index is in [0, n), returns an unconstrained result otherwise.
 *
 * Note: This saves 0.5*n constraints compared to equals() + switch()
 */
function arrayGet(array: Field[], index: Field) {
  index = toVar(index);

  // witness result
  let a = existsOne(() => array[Number(index.toBigInt())].toBigInt());

  // we prove a === array[j] + zj*(index - j) for some zj, for all j.
  // setting j = index, this implies a === array[index]
  // thanks to our assumption that the index is within bounds, we know that j = index for some j
  let n = array.length;
  for (let j = 0; j < n; j++) {
    let zj = existsOne(() => {
      let zj = Fp.div(
        Fp.sub(a.toBigInt(), array[j].toBigInt()),
        Fp.sub(index.toBigInt(), Fp.fromNumber(j))
      );
      return zj ?? 0n;
    });
    // prove that zj*(index - j) === a - array[j]
    // TODO abstract this logic into a general-purpose assertMul() gadget,
    // which is able to use the constant coefficient
    // (snarky's assert_r1cs somehow leads to much more constraints than this)
    if (array[j].isConstant()) {
      // -j*zj + zj*index - a + array[j] === 0
      Gates.generic(
        {
          left: -BigInt(j),
          right: 0n,
          out: -1n,
          mul: 1n,
          const: array[j].toBigInt(),
        },
        { left: zj, right: index, out: a }
      );
    } else {
      let aMinusAj = toVar(a.sub(array[j]));
      // -j*zj + zj*index - (a - array[j]) === 0
      Gates.generic(
        {
          left: -BigInt(j),
          right: 0n,
          out: -1n,
          mul: 1n,
          const: 0n,
        },
        { left: zj, right: index, out: aMinusAj }
      );
    }
  }

  return a;
}
