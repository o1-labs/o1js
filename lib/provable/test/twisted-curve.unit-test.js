import { TwistedCurveParams } from "../../../bindings/crypto/elliptic-curve-examples.js";
import { createCurveTwisted } from "../../../bindings/crypto/elliptic-curve.js";
import { array, equivalentProvable, map, onlyIf, spec, unit } from "../../testing/equivalent.js";
import { Random } from "../../testing/random.js";
import { assert } from "../gadgets/common.js";
import { Point, CurveTwisted, simpleMapToCurve } from "../gadgets/twisted-curve.js";
import { foreignField, throwError } from "./test-utils.js";
const Ed25519 = createCurveTwisted(TwistedCurveParams.Ed25519);
let curves = [Ed25519];
for (let Curve of curves) {
  let field = foreignField(Curve.Field);
  let scalar = foreignField(Curve.Scalar);
  let badPoint = spec({
    rng: Random.record({
      x: field.rng,
      y: field.rng,
      infinity: Random.constant(false)
    }),
    there: Point.from,
    back: Point.toBigint,
    provable: Point.provable
  });
  let point = map({ from: field, to: badPoint }, (x) => simpleMapToCurve(x, Curve));
  let unequalPair = onlyIf(array(point, 2), ([p, q]) => !Curve.equal(p, q));
  equivalentProvable({ from: [point], to: unit, verbose: true })((p) => Curve.isOnCurve(p) || throwError("expect on curve"), (p) => CurveTwisted.assertOnCurve(p, Curve), `${Curve.name} on curve`);
  equivalentProvable({ from: [unequalPair], to: point, verbose: true })(([p, q]) => Curve.add(p, q), ([p, q]) => CurveTwisted.add(p, q, Curve), `${Curve.name} add`);
  equivalentProvable({ from: [point], to: point, verbose: true })((p) => Curve.double(p), (p) => CurveTwisted.double(p, Curve), `${Curve.name} double`);
  equivalentProvable({ from: [point], to: point, verbose: true })(Curve.negate, (p) => CurveTwisted.negate(p, Curve), `${Curve.name} negate`);
  equivalentProvable({ from: [point, scalar], to: point, verbose: true })((p, s) => {
    let sp = Curve.scale(p, s);
    assert(!sp.infinity, "expect nonzero");
    return sp;
  }, (p, s) => CurveTwisted.scale(s, p, Curve), `${Curve.name} scale`);
}
