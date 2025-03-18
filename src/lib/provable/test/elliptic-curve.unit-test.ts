import { CurveParams } from '../../../bindings/crypto/elliptic-curve-examples.js';
import { createCurveAffine } from '../../../bindings/crypto/elliptic-curve.js';
import { array, equivalentProvable, map, onlyIf, spec, unit } from '../../testing/equivalent.js';
import { Random } from '../../testing/random.js';
import { assert } from '../gadgets/common.js';
import { EllipticCurve, Point, simpleMapToCurve } from '../gadgets/elliptic-curve.js';
import { foreignField, throwError } from './test-utils.js';

// provable equivalence tests
const Secp256k1 = createCurveAffine(CurveParams.Secp256k1);
const Secp256r1 = createCurveAffine(CurveParams.Secp256r1);
const Pallas = createCurveAffine(CurveParams.Pallas);
const Vesta = createCurveAffine(CurveParams.Vesta);
let curves = [Secp256k1, Secp256r1, Pallas, Vesta];

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
  let point = map({ from: field, to: badPoint }, (x) => simpleMapToCurve(x, Curve));

  // two random points that are not equal, so are a valid input to EC addition
  let unequalPair = onlyIf(array(point, 2), ([p, q]) => !Curve.equal(p, q));

  // test ec gadgets witness generation

  equivalentProvable({ from: [unequalPair], to: point, verbose: true })(
    ([p, q]) => Curve.add(p, q),
    ([p, q]) => EllipticCurve.add(p, q, Curve),
    `${Curve.name} add`
  );

  equivalentProvable({ from: [point], to: point, verbose: true })(
    Curve.double,
    (p) => EllipticCurve.double(p, Curve),
    `${Curve.name} double`
  );

  equivalentProvable({ from: [point], to: point, verbose: true })(
    Curve.negate,
    (p) => EllipticCurve.negate(p, Curve),
    `${Curve.name} negate`
  );

  equivalentProvable({ from: [point], to: unit, verbose: true })(
    (p) => Curve.isOnCurve(p) || throwError('expect on curve'),
    (p) => EllipticCurve.assertOnCurve(p, Curve),
    `${Curve.name} on curve`
  );

  equivalentProvable({ from: [point, scalar], to: point, verbose: true })(
    (p, s) => {
      let sp = Curve.scale(p, s);
      assert(!sp.infinity, 'expect nonzero');
      return sp;
    },
    (p, s) => EllipticCurve.scale(s, p, Curve),
    `${Curve.name} scale`
  );
}
