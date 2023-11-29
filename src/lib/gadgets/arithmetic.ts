import { provableTuple } from '../circuit_value.js';
import { Field } from '../core.js';
import { assert } from '../errors.js';
import { Provable } from '../provable.js';
import { rangeCheck32 } from './range-check.js';

export { divMod32, addMod32 };

function divMod32(n: Field) {
  if (n.isConstant()) {
    assert(
      n.toBigInt() < 1n << 64n,
      `n needs to fit into 64 bit, but got ${n.toBigInt()}`
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
      return [new Field(q), new Field(r)];
    }
  );

  rangeCheck32(quotient);
  rangeCheck32(remainder);

  n.assertEquals(quotient.mul(1n << 32n).add(remainder));

  return {
    remainder,
    quotient,
  };
}

function addMod32(x: Field, y: Field) {
  return divMod32(x.add(y)).remainder;
}
