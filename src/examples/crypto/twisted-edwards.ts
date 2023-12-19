/**
 * Implementation of twisted Edwards curves for Ed25529.
 *
 * https://en.wikipedia.org/wiki/Twisted_Edwards_curve
 * https://en.wikipedia.org/wiki/EdDSA#Ed25519
 */
import { Provable, Struct, createForeignField, Gadgets } from 'o1js';

const p = 2n ** 255n - 19n;
const FpUnreduced = createForeignField(p);
class Fp extends FpUnreduced.AlmostReduced {}

type Point = { x: Fp; y: Fp };
const Point = Struct({ x: Fp.provable, y: Fp.provable });

const { ForeignField } = Gadgets;

/** Curve equation:
 *
 * -x^2 + y^2 = 1 + d * x^2 * y^2
 */
const d = Fp.from(-121665n).div(121666n);

function add(p: Point, q: Point): Point {
  let { x: x1, y: y1 } = p;
  let { x: x2, y: y2 } = q;

  // x3 = (x1 * y2 + y1 * x2) / (1 + d * x1 * x2 * y1 * y2)
  // y3 = (y1 * y2 + x1 * x2) / (1 - d * x1 * x2 * y1 * y2)
  let x1x2 = x1.mul(x2);
  let y1y2 = y1.mul(y2);
  let x1y2 = x1.mul(y2);
  let y1x2 = y1.mul(x2);
  let x3Num = x1y2.add(y1x2);
  let y3Num = y1y2.add(x1x2);

  let [x1x2r, y1y2r, x3Numr] = Fp.assertAlmostReduced(x1x2, y1y2, x3Num);
  let x1x2y1y2 = x1x2r.mul(y1y2r);

  let [y3Numr, x1x2y1y2r] = Fp.assertAlmostReduced(y3Num, x1x2y1y2);
  let dx1x2y1y2 = d.mul(x1x2y1y2r);
  let x3Denom = Fp.from(1n).add(dx1x2y1y2);
  let y3Denom = Fp.from(1n).sub(dx1x2y1y2);

  let [x3Denomr, y3Denomr] = Fp.assertAlmostReduced(x3Denom, y3Denom);

  let x3 = x3Numr.div(x3Denomr);
  let y3 = y3Numr.div(y3Denomr);

  let [x3r, y3r] = Fp.assertAlmostReduced(x3, y3);

  return { x: x3r, y: y3r };
}

function double(p: Point): Point {
  let { x: x1, y: y1 } = p;

  // x3 = 2*x1*y1 / (y1^2 - x1^2)
  // y3 = (y1^2 + x1^2) / (2 - (y1^2 - x1^2))
  let x1x1 = x1.mul(x1);
  let y1y1 = y1.mul(y1);
  let x1y1 = x1.mul(y1);

  // witness x3, y3
  let { x: x3, y: y3 } = Provable.witness(Point, () => {
    let d = y1y1.sub(x1x1).assertAlmostReduced();
    let x3 = x1y1.add(x1x1).assertAlmostReduced().div(d);
    let y3 = y1y1
      .add(x1x1)
      .assertAlmostReduced()
      .div(Fp.from(2n).sub(d).assertAlmostReduced());
    return { x: x3, y: y3 };
  });

  // TODO expose assertMul and Sum on the ForeignField class to make this nicer

  // x3*(y1^2 - x1^2) = x1*y1 + x1*y1
  ForeignField.assertMul(
    x3.value,
    ForeignField.Sum(y1y1.value).sub(x1x1.value),
    ForeignField.Sum(x1y1.value).add(x1y1.value),
    Fp.modulus
  );

  // y3*(2 - (y1^2 - x1^2)) = y1^2 + x1^2
  ForeignField.assertMul(
    y3.value,
    ForeignField.Sum(Fp.from(2n).value).sub(y1y1.value).add(x1x1.value),
    ForeignField.Sum(y1y1.value).add(x1x1.value),
    Fp.modulus
  );

  return { x: x3, y: y3 };
}

Provable.constraintSystem(() => add(dummy(), dummy())).print();
Provable.constraintSystem(() => double(dummy())).print();

function dummy() {
  return Provable.witness(Point, Point.empty);
}
