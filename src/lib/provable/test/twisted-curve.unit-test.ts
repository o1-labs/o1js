import { TwistedCurveParams } from '../../../bindings/crypto/elliptic-curve-examples.js';
import { createCurveTwisted } from '../../../bindings/crypto/elliptic-curve.js';
import {
  array,
  equivalentProvable,
  map,
  onlyIf,
  spec,
  unit,
} from '../../testing/equivalent.js';
import { Random } from '../../testing/random.js';
import { assert } from '../gadgets/common.js';
import {
  Point,
  CurveTwisted,
  simpleMapToCurve,
} from '../gadgets/twisted-curve.js';
import { foreignField, throwError } from './test-utils.js';

// provable equivalence tests
const Edwards25519 = createCurveTwisted(TwistedCurveParams.Edwards25519);
let curves = [Edwards25519];

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

  // two random points that are not equal, so are a valid input to twisted curve addition
  let unequalPair = onlyIf(array(point, 2), ([p, q]) => !Curve.equal(p, q));

  // test twisted curve gadgets witness generation

  equivalentProvable({ from: [point], to: unit, verbose: true })(
    (p) => Curve.isOnCurve(p) || throwError('expect on curve'),
    (p) => CurveTwisted.assertOnCurve(p, Curve),
    `${Curve.name} on curve`
  );

  equivalentProvable({ from: [unequalPair], to: point, verbose: true })(
    ([p, q]) => Curve.add(p, q),
    ([p, q]) => CurveTwisted.add(p, q, Curve),
    `${Curve.name} add`
  );

  equivalentProvable({ from: [point], to: point, verbose: true })(
    (p) => Curve.double(p),
    (p) => CurveTwisted.double(p, Curve),
    `${Curve.name} double`
  );

  equivalentProvable({ from: [point], to: point, verbose: true })(
    Curve.negate,
    (p) => CurveTwisted.negate(p, Curve),
    `${Curve.name} negate`
  );

  equivalentProvable({ from: [point, scalar], to: point, verbose: true })(
    (p, s) => {
      let sp = Curve.scale(p, s);
      return sp;
    },
    (p, s) => CurveTwisted.scale(s, p, Curve),
    `${Curve.name} scale`
  );
}
