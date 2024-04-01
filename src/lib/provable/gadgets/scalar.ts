import type { Field } from '../field.js';
import type { Bool } from '../bool.js';
import { Fq } from '../../../bindings/crypto/finite-field.js';
import { PallasAffine } from '../../../bindings/crypto/elliptic-curve.js';
import { fieldToField3 } from './comparison.js';
import { Field3, ForeignField } from './foreign-field.js';
import { exists, existsOne } from '../core/exists.js';
import { bit, isConstant, packBits } from './common.js';
import { TupleN } from '../../util/types.js';
import { l } from './range-check.js';
import { createField } from '../core/field-constructor.js';
import { Snarky } from '../../../snarky.js';
import { Provable } from '../provable.js';
import { Group } from '../group.js';

export { scale, scaleShiftedSplit5 };

/**
 * Gadget to scale a point by a scalar, where the scalar is represented as a _native_ Field.
 */
function scale(P: { x: Field; y: Field }, s: Field): Group {
  // constant case
  let { x, y } = P;
  if (x.isConstant() && y.isConstant() && s.isConstant()) {
    let sP = PallasAffine.scale(
      PallasAffine.fromNonzero({ x: x.toBigInt(), y: y.toBigInt() }),
      s.toBigInt()
    );
    return new Group({ x: createField(sP.x), y: createField(sP.y) });
  }

  // compute t = s - 2^254 mod q using foreign field subtraction
  let sBig = fieldToField3(s);
  let twoTo254 = Field3.from(1n << 254n);
  let [t0, t1, t2] = ForeignField.sub(sBig, twoTo254, Fq.modulus);

  // split t into 250 high bits and 5 low bits
  // => split t0 into [5, 83]
  let tLo = exists(5, () => {
    let t = t0.toBigInt();
    return [bit(t, 0), bit(t, 1), bit(t, 2), bit(t, 3), bit(t, 4)];
  });
  let tLoBools = TupleN.map(tLo, (x) => x.assertBool());
  let tHi0 = existsOne(() => t0.toBigInt() >> 5n);

  // prove split
  // since we know that t0 < 2^88, this proves that t0High < 2^83
  packBits(tLo)
    .add(tHi0.mul(1n << 5n))
    .assertEquals(t0);

  // pack tHi
  let tHi = tHi0
    .add(t1.mul(1n << (l - 5n)))
    .add(t2.mul(1n << (2n * l - 5n)))
    .seal();

  // return (t + 2^254)*P = (s - 2^254 + 2^254)*P = s*P
  return scaleShiftedSplit5(P, tHi, tLoBools);
}

/**
 * Internal helper to compute `(t + 2^254)*P`.
 * `t` is expected to be split into 250 high bits (t >> 5) and 5 low bits (t & 0xf1).
 *
 * The gadget proves that `tHi` is in [0, 2^250) but assumes that `tLo` consists of bits.
 */
function scaleShiftedSplit5(
  { x, y }: { x: Field; y: Field },
  tHi: Field,
  tLo: TupleN<Bool, 5>
): Group {
  // constant case
  if (isConstant(x, y, tHi, ...tLo)) {
    let sP = PallasAffine.scale(
      PallasAffine.fromNonzero({ x: x.toBigInt(), y: y.toBigInt() }),
      Fq.add(packBits(tLo).toBigInt() + (tHi.toBigInt() << 5n), 1n << 254n)
    );
    return new Group({ x: createField(sP.x), y: createField(sP.y) });
  }

  // R = (2*(t >> 5) + 1 + 2^250)P
  let [, RMl] = Snarky.group.scaleFastUnpack(
    [0, x.value, y.value],
    [0, tHi.value],
    250
  );
  let P = new Group({ x, y });
  let R = new Group({ x: RMl[0], y: RMl[1] });
  let [t0, t1, t2, t3, t4] = tLo;

  // TODO: use faster group ops which don't allow zero inputs

  // R = t4 ? R : R - P = ((t >> 4) + 2^250)P
  R = Provable.if(t4, R, R.sub(P));

  // R = ((t >> 3) + 2^251)P
  R = R.add(R);
  R = Provable.if(t3, R.add(P), R);

  // R = ((t >> 2) + 2^252)P
  R = R.add(R);
  R = Provable.if(t2, R.add(P), R);

  // R = ((t >> 1) + 2^253)P
  R = R.add(R);
  R = Provable.if(t1, R.add(P), R);

  // R = (t + 2^254)P
  R = R.add(R);
  R = Provable.if(t0, R.add(P), R);

  return R;
}
