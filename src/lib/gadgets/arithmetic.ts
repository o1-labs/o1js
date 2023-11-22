import { Field } from '../core.js';
import { Provable } from '../provable.js';
import { rangeCheck32 } from './range-check.js';

export { divMod32, addMod32 };

function divMod32(n: Field) {
  if (n.isConstant()) {
    let nBigInt = n.toBigInt();
    let q = nBigInt / (1n << 32n);
    let r = nBigInt - q * (1n << 32n);
    return {
      remainder: new Field(r),
      quotient: new Field(q),
    };
  }

  let qr = Provable.witness(Provable.Array(Field, 2), () => {
    let nBigInt = n.toBigInt();
    let q = nBigInt / (1n << 32n);
    let r = nBigInt - q * (1n << 32n);
    return [new Field(q), new Field(r)];
  });
  let [quotient, remainder] = qr;

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
