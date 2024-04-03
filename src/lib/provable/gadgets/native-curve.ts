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
import { createField, getBool, getField } from '../core/field-constructor.js';
import { Snarky } from '../../../snarky.js';
import { Provable } from '../provable.js';
import { Group } from '../group.js';
import { MlPair } from '../../ml/base.js';

export { scale, scaleShiftedSplit5, add };

type Point = { x: Field; y: Field };

/**
 * Gadget to scale a point by a scalar, where the scalar is represented as a _native_ Field.
 */
function scale(P: Point, s: Field): Group {
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
 * `t` is expected to be split into 250 high bits (t >> 5) and 5 low bits (t & 0x1f).
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
  let R = new Group({ x: RMl[1], y: RMl[2] });
  let [t0, t1, t2, t3, t4] = tLo;

  // R = t4 ? R : R - P = ((t >> 4) + 2^250)P
  R = Provable.if(t4, R, R.addNonZero(P.neg()));

  // R = ((t >> 3) + 2^251)P
  // R = ((t >> 2) + 2^252)P
  // R = ((t >> 1) + 2^253)P
  for (let t of [t3, t2, t1]) {
    R = R.addNonZero(R);
    R = Provable.if(t, R.addNonZero(P), R);
  }

  // R = (t + 2^254)P
  // in the final step, we allow a zero output to make it work for the 0 scalar
  R = R.addNonZero(R);
  R = Provable.if(t0, R.addNonZero(P, true), R);

  return R;
}

/**
 * Wraps the `EC_add` gate to perform complete addition of two non-zero curve points.
 */
function add(g: Point, h: Point) {
  const { x: x1, y: y1 } = g;
  const { x: x2, y: y2 } = h;

  let zero = createField(0);
  const Field = getField();
  const Bool = getBool();

  let same_x = Provable.witness(Field, () => x1.equals(x2).toField());

  let inf = Provable.witness(Bool, () =>
    x1.equals(x2).and(y1.equals(y2).not())
  );

  let inf_z = Provable.witness(Field, () => {
    if (y1.equals(y2).toBoolean()) return zero;
    else if (x1.equals(x2).toBoolean()) return y2.sub(y1).inv();
    else return zero;
  });

  let x21_inv = Provable.witness(Field, () => {
    if (x1.equals(x2).toBoolean()) return zero;
    else return x2.sub(x1).inv();
  });

  let s = Provable.witness(Field, () => {
    if (x1.equals(x2).toBoolean()) {
      let x1_squared = x1.square();
      return x1_squared.add(x1_squared).add(x1_squared).div(y1.add(y1));
    } else return y2.sub(y1).div(x2.sub(x1));
  });

  let x3 = Provable.witness(Field, () => {
    return s.square().sub(x1.add(x2));
  });

  let y3 = Provable.witness(Field, () => {
    return s.mul(x1.sub(x3)).sub(y1);
  });

  Snarky.gates.ecAdd(
    MlPair(x1.seal().value, y1.seal().value),
    MlPair(x2.seal().value, y2.seal().value),
    MlPair(x3.value, y3.value),
    inf.toField().value,
    same_x.value,
    s.value,
    inf_z.value,
    x21_inv.value
  );

  return { result: { x: x3, y: y3 }, isInfinity: inf };
}
