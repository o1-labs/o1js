import { TwistedCurveParams } from '../../../bindings/crypto/elliptic-curve-examples.js';
import {
  createAffineTwistedCurve,
  affineTwistedZero,
} from '../../../bindings/crypto/elliptic-curve.js';
import { array, equivalentProvable, onlyIf, spec, unit } from '../../testing/equivalent.js';
import { Random } from '../../testing/random.js';
import { Point, TwistedCurve, simpleMapToCurve } from '../gadgets/twisted-curve.js';
import { foreignField, throwError } from './test-utils.js';
import { Field3 } from '../gadgets/foreign-field.js';

// provable equivalence tests
const Edwards25519 = createAffineTwistedCurve(TwistedCurveParams.Edwards25519);
let curves = [Edwards25519];

for (let Curve of curves) {
  // prepare test inputs
  let field = foreignField(Curve.Field);
  let scalar = foreignField(Curve.Scalar);

  // valid random point
  let point = spec({
    rng: Random.map(field.rng, (x) => simpleMapToCurve(x, Curve)),
    there: Point.from,
    back: Point.toBigint,
    provable: Point.provable,
  });

  // two random points that are not equal, so are a valid input to twisted curve addition
  let unequalPair = onlyIf(array(point, 2), ([p, q]) => !Curve.equal(p, q));

  let unequalTriple = onlyIf(
    array(point, 3),
    ([p, q, r]) => !Curve.equal(p, q) && !Curve.equal(p, r) && !Curve.equal(q, r)
  );

  // test twisted curve gadgets witness generation

  equivalentProvable({ from: [point], to: unit, verbose: true })(
    (p) => Curve.isOnCurve(p) || throwError('expect on curve'),
    (p) => TwistedCurve.assertOnCurve(p, Curve),
    `${Curve.name} on curve`
  );

  equivalentProvable({ from: [unequalPair], to: point, verbose: true })(
    ([p, q]) => Curve.add(p, q),
    ([p, q]) => TwistedCurve.add(p, q, Curve),
    `${Curve.name} add`
  );

  equivalentProvable({ from: [point], to: point, verbose: true })(
    (p) => Curve.double(p),
    (p) => TwistedCurve.double(p, Curve),
    `${Curve.name} double`
  );

  equivalentProvable({ from: [point], to: point, verbose: true })(
    Curve.negate,
    (p) => TwistedCurve.negate(p, Curve),
    `${Curve.name} negate`
  );

  equivalentProvable({ from: [point, scalar], to: point, verbose: true })(
    (p, s) => {
      let sp = Curve.scale(p, s);
      return sp;
    },
    (p, s) => TwistedCurve.scale(s, p, Curve),
    `${Curve.name} scale`
  );

  // test adding same point equals doubling
  equivalentProvable({ from: [point], to: point, verbose: true })(
    (p) => Curve.add(p, p),
    (p) => TwistedCurve.double(p, Curve),
    `${Curve.name} adding same point equals doubling`
  );

  equivalentProvable({ from: [point], to: point, verbose: true })(
    (p) => Curve.double(p),
    (p) => TwistedCurve.add(p, p, Curve),
    `${Curve.name} doubling equals adding same point`
  );

  // scaling by order gives identity
  equivalentProvable({ from: [point], to: point, verbose: true })(
    () => affineTwistedZero,
    (p) => TwistedCurve.scale(Field3.from(Curve.order), p, Curve),
    `${Curve.name} scaling by order gives identity`
  );

  // adding identity gives same point
  equivalentProvable({ from: [point], to: point, verbose: true })(
    (p) => p,
    (p) => TwistedCurve.add(p, Point.from(affineTwistedZero), Curve),
    `${Curve.name} adding identity gives same point`
  );

  // negating identity gives identity
  equivalentProvable({ from: [point], to: point, verbose: true })(
    () => affineTwistedZero,
    () => TwistedCurve.negate(Point.from(affineTwistedZero), Curve),
    `${Curve.name} negating identity gives identity`
  );

  // negating twice gives same point
  equivalentProvable({ from: [point], to: point, verbose: true })(
    (p) => p,
    (p) => TwistedCurve.negate(TwistedCurve.negate(p, Curve), Curve),
    `${Curve.name} negating twice gives same point`
  );

  // commutativity of addition
  equivalentProvable({ from: [unequalPair], to: point, verbose: true })(
    ([p, q]) => Curve.add(p, q),
    ([p, q]) => TwistedCurve.add(q, p, Curve),
    `${Curve.name} commutativity of addition`
  );

  // associativity of addition
  equivalentProvable({ from: [unequalTriple], to: point, verbose: true })(
    ([p, q, r]) => Curve.add(p, Curve.add(q, r)),
    ([p, q, r]) => TwistedCurve.add(TwistedCurve.add(p, q, Curve), r, Curve),
    `${Curve.name} associativity of addition`
  );

  // distributive property of scaling
  equivalentProvable({ from: [unequalPair, scalar], to: point, verbose: true })(
    ([p, q], s) => Curve.scale(Curve.add(p, q), s),
    ([p, q], s) => {
      let sp = TwistedCurve.scale(s, p, Curve);
      let sq = TwistedCurve.scale(s, q, Curve);
      return TwistedCurve.add(sp, sq, Curve);
    },
    `${Curve.name} distributive property of scaling`
  );
}
