/**
 * TS implementation of Pasta_bindings.{Pallas, Vesta}
 */
import { MlOption, MlTuple } from 'src/lib/ml/base.js';
import { Field } from './bindings-field.js';
import {
  Pallas,
  Vesta,
  ProjectiveCurve,
  GroupProjective,
  GroupAffine,
} from './elliptic_curve.js';
import { withPrefix } from './bindings-util.js';

export { VestaBindings, PallasBindings };

const VestaBindings = withPrefix('caml_vesta', createCurveBindings(Vesta));
const PallasBindings = withPrefix('caml_pallas', createCurveBindings(Pallas));

function createCurveBindings(Curve: ProjectiveCurve) {
  return {
    one(): GroupProjective {
      return Curve.one;
    },
    add: Curve.add,
    sub: Curve.sub,
    negate: Curve.negate,
    double: Curve.double,
    scale(g: GroupProjective, [, s]: Field): GroupProjective {
      return Curve.scale(g, s);
    },
    random(): GroupProjective {
      throw Error('random not implemented');
    },
    rng(i: number): GroupProjective {
      throw Error('rng not implemented');
    },
    endo_base(): Field {
      return [0, Curve.endoBase];
    },
    endo_scalar(): Field {
      return [0, Curve.endoScalar];
    },
    to_affine(g: GroupProjective): OrInfinity {
      return toMlOrInfinity(Curve.toAffine(g));
    },
    of_affine(g: OrInfinity): GroupProjective {
      return Curve.fromAffine(fromMlOrInfinity(g));
    },
    of_affine_coordinates(x: Field, y: Field): GroupProjective {
      // TODO this matches Rust but doesn't handle (0, 0)
      return { x: x[1], y: y[1], z: 1n };
    },
    affine_deep_copy(g: GroupProjective): GroupProjective {
      return { ...g };
    },
  };
}

const affineZero = { x: 0n, y: 0n, infinity: true };

// Kimchi_types.or_infinity
type OrInfinity = MlOption<MlTuple<Field, Field>>;

function toMlOrInfinity(g: GroupAffine): OrInfinity {
  if (g.infinity) return 0;
  return [0, [0, [0, g.x], [0, g.y]]];
}

function fromMlOrInfinity(g: OrInfinity): GroupAffine {
  if (g === 0) return affineZero;
  return { x: g[1][1][1], y: g[1][2][1], infinity: false };
}
