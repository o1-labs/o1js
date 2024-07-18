import { provableTuple } from '../types/struct.js';
import { Field } from '../wrapped.js';
import { assert } from '../../util/errors.js';
import { Provable } from '../provable.js';
import { rangeCheck32, rangeCheck64, rangeCheckN } from './range-check.js';

export { divMod32, addMod32, divMod64, addMod64 };

function divMod32(n: Field, quotientBits = 32) {
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
  return divMod32(x.add(y), 1).remainder;
}


function divMod64(n: Field, quotientBits = 64) {
  if (n.isConstant()) {
    /*
    assert(
      n.toBigInt() < 1n << 64n,
      `n needs to fit into 64 bit, but got ${n.toBigInt()}`
    ); */

    let nBigInt = n.toBigInt();
    let q = nBigInt >> 64n;
    let r = nBigInt - (q << 64n);
    return {
      remainder: new Field(r),
      quotient: new Field(q),
    };
  }

  let [quotient, remainder] = Provable.witness(
    provableTuple([Field, Field]),
    () => {
      let nBigInt = n.toBigInt();
      let q = nBigInt >> 64n;
      let r = nBigInt - (q << 64n);
      // why do we have to do this?
      return [q, r] satisfies [bigint, bigint];
    }
  );

  if (quotientBits === 1) {
    quotient.assertBool();
  } else {
    rangeCheckN(quotientBits, quotient);
  }
  rangeCheck64(remainder);

  n.assertEquals(quotient.mul(1n << 64n).add(remainder));

  return {
    remainder,
    quotient,
  };
}

function addMod64(x: Field, y: Field) {
  return divMod64(x.add(y), 1).remainder;
}