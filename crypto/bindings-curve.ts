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

export { VestaBindings, PallasBindings };

const VestaBindings = createCurveBindings(Vesta, 'caml_vesta');
const PallasBindings = createCurveBindings(Pallas, 'caml_pallas');

function createCurveBindings<curve extends string>(
  Curve: ProjectiveCurve,
  curve: curve
) {
  let CurveBindings = {
    one(): GroupProjective {
      return Curve.one;
    },
    add: Curve.add,
    sub: Curve.sub,
    negate: Curve.negate,
    double: Curve.double,
    scale(g: GroupProjective, [s]: Field): GroupProjective {
      return Curve.scale(g, s);
    },
    random(): GroupProjective {
      throw Error('random not implemented');
    },
    rng(i: number): GroupProjective {
      throw Error('rng not implemented');
    },
    endo_base(): Field {
      return [Curve.endoBase];
    },
    endo_scalar(): Field {
      return [Curve.endoScalar];
    },
    to_affine(g: GroupProjective): OrInfinity {
      return toMlOrInfinity(Curve.toAffine(g));
    },
    of_affine(g: OrInfinity): GroupProjective {
      return Curve.fromAffine(fromMlOrInfinity(g));
    },
    of_affine_coordinates(x: Field, y: Field): GroupProjective {
      // TODO this matches Rust but doesn't handle (0, 0)
      return { x: x[0], y: y[0], z: 1n };
    },
    affine_deep_copy(g: GroupProjective): GroupProjective {
      return { ...g };
    },
  };

  type CurveBindings = typeof CurveBindings;

  return Object.fromEntries(
    Object.entries(CurveBindings).map(([k, v]) => {
      return [`${curve}_${k}`, v];
    })
  ) as {
    [k in keyof CurveBindings as `${curve}_${k}`]: CurveBindings[k];
  };
}

const affineZero = { x: 0n, y: 0n, infinity: true };

// Kimchi_types.or_infinity
type OrInfinity = MlOption<MlTuple<Field, Field>>;

function toMlOrInfinity(g: GroupAffine): OrInfinity {
  if (g.infinity) return 0;
  return [0, [0, [g.x], [g.y]]];
}

function fromMlOrInfinity(g: OrInfinity): GroupAffine {
  if (g === 0) return affineZero;
  return { x: g[1][1][0], y: g[1][2][0], infinity: false };
}
