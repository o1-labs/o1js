import { provableTuple } from '../types/struct.js';
import { Field } from '../wrapped.js';
import { assert } from '../../util/errors.js';
import { Provable } from '../provable.js';
import { rangeCheck32, rangeCheck64, rangeCheckN } from './range-check.js';

export { divMod32, addMod32, divMod64, addMod64 };

function divMod32(n: Field, nBits = 64) {
  assert(nBits >= 0 && nBits < 255, `nBits must be in the range [0, 255), got ${nBits}`);
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

  let [quotient, remainder] = Provable.witness(provableTuple([Field, Field]), () => {
    let nBigInt = n.toBigInt();
    let q = nBigInt >> 32n;
    let r = nBigInt - (q << 32n);
    // why do we have to do this?
    return [q, r] satisfies [bigint, bigint];
  });

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

function divMod64(n: Field, nBits = 128) {
  assert(nBits >= 0 && nBits < 255, `nBits must be in the range [0, 255), got ${nBits}`);

  // calculate the number of bits allowed for the quotient to avoid overflow
  const quotientBits = Math.max(0, nBits - 64);

  if (n.isConstant()) {
    assert(
      n.toBigInt() < 1n << BigInt(nBits),
      `n needs to fit into ${nBits} bits, but got ${n.toBigInt()}`
    );
    let nBigInt = n.toBigInt();
    let q = nBigInt >> 64n;
    let r = nBigInt - (q << 64n);
    return {
      remainder: new Field(r),
      quotient: new Field(q),
    };
  }

  let [quotient, remainder] = Provable.witness(provableTuple([Field, Field]), () => {
    let nBigInt = n.toBigInt();
    let q = nBigInt >> 64n;
    let r = nBigInt - (q << 64n);
    return [q, r] satisfies [bigint, bigint];
  });

  if (quotientBits === 1) {
    quotient.assertBool();
  } else if (quotientBits === 64) {
    rangeCheck64(quotient);
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
  return divMod64(x.add(y), 65).remainder;
}
