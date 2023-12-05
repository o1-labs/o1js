import { CurveParams } from '../../bindings/crypto/elliptic-curve-examples.js';
import { createCurveAffine } from '../../bindings/crypto/elliptic_curve.js';
import {
  array,
  equivalentProvable,
  map,
  onlyIf,
  spec,
} from '../testing/equivalent.js';
import { Random } from '../testing/random.js';
import { assert } from './common.js';
import { Point, simpleMapToCurve } from './elliptic-curve.js';
import { Gadgets } from './gadgets.js';
import { foreignField } from './test-utils.js';

// provable equivalence tests
const Secp256k1 = createCurveAffine(CurveParams.Secp256k1);
const Pallas = createCurveAffine(CurveParams.Pallas);
const Vesta = createCurveAffine(CurveParams.Vesta);
let curves = [Secp256k1, Pallas, Vesta];

for (let Curve of curves) {
  // prepare test inputs
  let field = foreignField(Curve.Field);
  let scalar = foreignField(Curve.Scalar);

  // point shape, but with independently random components, which will never form a valid point
  let badPoint = spec({
    rng: Random.record({
      x: field.rng,
      y: field.rng,
      infinity: Random.constant(false),
    }),
    there: Point.from,
    back: Point.toBigint,
    provable: Point.provable,
  });

  // valid random point
  let point = map({ from: field, to: badPoint }, (x) =>
    simpleMapToCurve(x, Curve)
  );

  // two random points that are not equal, so are a valid input to EC addition
  let unequalPair = onlyIf(array(point, 2), ([p, q]) => !Curve.equal(p, q));

  // gadgets

  // add
  equivalentProvable({ from: [unequalPair], to: point, verbose: true })(
    ([p, q]) => Curve.add(p, q),
    ([p, q]) => Gadgets.EllipticCurve.add(p, q, Curve),
    'add'
  );

  // double
  equivalentProvable({ from: [point], to: point, verbose: true })(
    Curve.double,
    (p) => Gadgets.EllipticCurve.double(p, Curve),
    'double'
  );

  // negate
  equivalentProvable({ from: [point], to: point, verbose: true })(
    Curve.negate,
    (p) => Gadgets.EllipticCurve.negate(p, Curve),
    'negate'
  );

  // scale
  equivalentProvable({ from: [point, scalar], to: point, verbose: true })(
    (p, s) => {
      let sp = Curve.scale(p, s);
      assert(!sp.infinity, 'expect nonzero');
      return sp;
    },
    (p, s) => Gadgets.EllipticCurve.scale(s, p, Curve),
    'scale'
  );
}
