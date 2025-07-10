/**
 * TS implementation of Pasta_bindings.{Pallas, Vesta}
 */
import { MlPair } from '../../../lib/ml/base.js';
import { GroupAffine, GroupProjective, Pallas, ProjectiveCurve, Vesta } from '../elliptic-curve.js';

import { Field } from './field.js';
import { withPrefix } from './util.js';

export {
  VestaBindings,
  PallasBindings,
  InfinityPoint as Infinity,
  OrInfinity,
  OrInfinityJson,
  toMlOrInfinity,
  fromMlOrInfinity,
};

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
    rng(_i: number): GroupProjective {
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
      // allows to create in points not on the curve - matches Rust impl
      return { x: x[1], y: y[1], z: 1n };
    },
    affine_deep_copy(g: OrInfinity): OrInfinity {
      return toMlOrInfinity(fromMlOrInfinity(g));
    },
  };
}

const affineZero = { x: 0n, y: 0n, infinity: true };

// Kimchi_types.or_infinity
type InfinityType = 0;
const InfinityPoint = 0;
type Finite<T> = [0, T];
type OrInfinity = InfinityType | Finite<MlPair<Field, Field>>;

function toMlOrInfinity(g: GroupAffine): OrInfinity {
  if (g.infinity) return InfinityPoint;
  return [0, [0, [0, g.x], [0, g.y]]];
}

function fromMlOrInfinity(g: OrInfinity): GroupAffine {
  if (g === InfinityPoint) return affineZero;
  return { x: g[1][1][1], y: g[1][2][1], infinity: false };
}

type OrInfinityJson = 'Infinity' | { x: string; y: string };

const OrInfinity = {
  toJSON(g: OrInfinity): OrInfinityJson {
    if (g === InfinityPoint) return 'Infinity';
    return { x: g[1][1][1].toString(), y: g[1][2][1].toString() };
  },
  fromJSON(g: OrInfinityJson): OrInfinity {
    if (g === 'Infinity') return InfinityPoint;
    return [0, [0, [0, BigInt(g.x)], [0, BigInt(g.y)]]];
  },
};
