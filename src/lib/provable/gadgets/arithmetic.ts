import { provableTuple } from '../types/struct.js';
import { Field } from '../wrapped.js';
import { assert } from '../../util/errors.js';
import { Provable } from '../provable.js';
import { rangeCheck32, rangeCheckN } from './range-check.js';

export { divMod32, addMod32 };

function divMod32(n: Field, nBits = 64) {
  assert(
    nBits >= 0 && nBits < 255,
    `nBits must be in the range [0, 255), got ${nBits}`
  );
  const quotientBits = Math.max(0, nBits - 32);
  if (n.isConstant()) {
    assert(
      n.toBigInt() < 1n << BigInt(nBits),
      `n needs to fit into ${nBits} bits, but got ${n.toBigInt()}`
    );

    let nBigInt = n.toBigInt();
    let q = nBigInt >> 32n;
    let r = nBigInt - (q << 32n);
    return {
      remainder: new Field(r),
      quotient: new Field(q),
    };
  }

  let [quotient, remainder] = Provable.witness(
    provableTuple([Field, Field]),
    () => {
      let nBigInt = n.toBigInt();
      let q = nBigInt >> 32n;
      let r = nBigInt - (q << 32n);
      // why do we have to do this?
      return [q, r] satisfies [bigint, bigint];
    }
  );

  if (quotientBits === 1) {
    quotient.assertBool();
  } else {
    rangeCheckN(quotientBits, quotient);
  }
  rangeCheck32(remainder);

  n.assertEquals(quotient.mul(1n << 32n).add(remainder));

  return {
    remainder,
    quotient,
  };
}

function addMod32(x: Field, y: Field) {
  return divMod32(x.add(y), 33).remainder;
}
