/**
 * Implementation of twisted Edwards curves for Ed25529.
 *
 * https://en.wikipedia.org/wiki/Twisted_Edwards_curve
 * https://en.wikipedia.org/wiki/EdDSA#Ed25519
 */
import { Provable, Struct, createForeignField } from 'o1js';

const p = 2n ** 255n - 19n;
const FpUnreduced = createForeignField(p);
class Fp extends FpUnreduced.AlmostReduced {}

type Point = { x: Fp; y: Fp };
const Point = Struct({ x: Fp.provable, y: Fp.provable });

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

let cs = Provable.constraintSystem(() => {
  let p = Provable.witness(Point, Point.empty);
  let q = Provable.witness(Point, Point.empty);

  let r = add(p, q);
});
console.log(cs);
