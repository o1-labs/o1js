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
  let [q, r] = qr;

  rangeCheck32(q);
  rangeCheck32(r);

  n.assertEquals(q.mul(1n << 32n).add(r));

  return {
    remainder: r,
    quotient: q,
  };
}

function addMod32(x: Field, y: Field) {
  return divMod32(x.add(y)).remainder;
}
