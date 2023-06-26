import { FiniteField, Fp, inverse, mod, p, q } from './finite_field.js';
export { Pallas, Vesta, GroupAffine, GroupProjective, GroupMapPallas };

// TODO: constants, like generator points and cube roots for endomorphisms, should be drawn from
// a common source, i.e. generated from the Rust code
const pallasGeneratorProjective = {
  x: 1n,
  y: 12418654782883325593414442427049395787963493412651469444558597405572177144507n,
  z: 1n,
};
const vestaGeneratorProjective = {
  x: 1n,
  y: 11426906929455361843568202299992114520848200991084027513389447476559454104162n,
  z: 1n,
};
const vestaEndoBase =
  2942865608506852014473558576493638302197734138389222805617480874486368177743n;
const pallasEndoBase =
  20444556541222657078399132219657928148671392403212669005631716460534733845831n;
const vestaEndoScalar =
  8503465768106391777493614032514048814691664078728891710322960303815233784505n;
const pallasEndoScalar =
  26005156700822196841419187675678338661165322343552424574062261873906994770353n;

// the b and a in y^2 = x^3 + ax + b
const b = 5n;
const a = 0n;

const projectiveZero = { x: 1n, y: 1n, z: 0n };

type GroupProjective = { x: bigint; y: bigint; z: bigint };
type GroupAffine = { x: bigint; y: bigint; infinity: boolean };

type GroupMapParams = {
  u: bigint;
  u_over_2: bigint;
  conic_c: bigint;
  projection_point: {
    z: bigint;
    y: bigint;
  };
  spec: { a: bigint; b: bigint };
};

type Conic = { z: bigint; y: bigint };

type STuple = { u: bigint; v: bigint; y: bigint };

// reference implementation https://github.com/o1-labs/snarky/blob/78e0d952518f75b5382f6d735adb24eef7a0fa90/group_map/group_map.ml
const GroupMap = {
  create: (F: FiniteField, params: GroupMapParams) => {
    const { a, b } = params.spec;
    function tryDecode(x: bigint): { x: bigint; y: bigint } | undefined {
      // a * a * a = a^3
      const pow3 = F.power(x, 3n);
      // a * x - since a = 0, ax will be 0 as well
      // const ax = F.mul(a, x);

      // a^3 + ax + b, but since ax = 0 we can write a^3 + b
      const y = F.add(pow3, b);

      if (!F.isSquare(y)) return undefined;
      return { x, y: F.sqrt(y)! };
    }

    function sToVTruncated(s: STuple): [bigint, bigint, bigint] {
      const { u, v, y } = s;
      return [v, F.negate(F.add(u, v)), F.add(u, F.square(y))];
    }

    function conic_to_s(c: Conic): STuple {
      const d = F.div(c.z, c.y);
      if (d === undefined) throw Error(`Division undefined! ${c.z}/${c.y}`);
      const v = F.sub(d, params.u_over_2);

      return { u: params.u, v, y: c.y };
    }

    function field_to_conic(t: bigint): Conic {
      const { z: z0, y: y0 } = params.projection_point;

      const ct = F.mul(params.conic_c, t);

      const d1 = F.add(F.mul(ct, y0), z0);
      const d2 = F.add(F.mul(ct, t), 1n);

      const d = F.div(d1, d2);

      if (d === undefined) throw Error(`Division undefined! ${d1}/${d2}`);

      const s = F.mul(2n, d);

      return {
        z: F.sub(z0, s),
        y: F.sub(y0, F.mul(s, t)),
      };
    }

    return {
      potentialXs: (t: bigint) => sToVTruncated(conic_to_s(field_to_conic(t))),
      tryDecode,
    };
  },
};

// https://github.com/MinaProtocol/mina/blob/af7bc89270b66c06e2cc8d1bb093ba31d6a7b372/src/lib/crypto_params/gen/gen.ml#L8-L11
const GroupMapParamsFp = {
  u: 2n,
  u_over_2: 1n,
  conic_c: 3n,
  projection_point: {
    z: 12196889842669319921865617096620076994180062626450149327690483414064673774441n,
    y: 1n,
  },
  spec: {
    a: 0n,
    b: 5n,
  },
};

const GroupMapPallas = GroupMap.create(Fp, GroupMapParamsFp);

function projectiveNeg({ x, y, z }: GroupProjective, p: bigint) {
  return { x, y: y === 0n ? 0n : p - y, z };
}

function projectiveAdd(g: GroupProjective, h: GroupProjective, p: bigint) {
  if (g.z === 0n) return h;
  if (h.z === 0n) return g;
  let X1 = g.x,
    Y1 = g.y,
    Z1 = g.z,
    X2 = h.x,
    Y2 = h.y,
    Z2 = h.z;
  // http://www.hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#addition-add-2007-bl
  // Z1Z1 = Z1^2
  let Z1Z1 = mod(Z1 * Z1, p);
  // Z2Z2 = Z2^2
  let Z2Z2 = mod(Z2 * Z2, p);
  // U1 = X1*Z2Z2
  let U1 = mod(X1 * Z2Z2, p);
  // U2 = X2*Z1Z1
  let U2 = mod(X2 * Z1Z1, p);
  // S1 = Y1*Z2*Z2Z2
  let S1 = mod(Y1 * Z2 * Z2Z2, p);
  // S2 = Y2*Z1*Z1Z1
  let S2 = mod(Y2 * Z1 * Z1Z1, p);
  // H = U2-U1
  let H = mod(U2 - U1, p);
  // H = 0 <==> x1 = X1/Z1^2 = X2/Z2^2 = x2 <==> degenerate case (Z3 would become 0)
  if (H === 0n) {
    // if S1 = S2 <==> y1 = y2, the points are equal, so we double instead
    if (S1 === S2) return projectiveDouble(g, p);
    // if S1 = -S2, the points are inverse, so return zero
    if (mod(S1 + S2, p) === 0n) return projectiveZero;
    throw Error('projectiveAdd: invalid point');
  }
  // I = (2*H)^2
  let I = mod((H * H) << 2n, p);
  // J = H*I
  let J = mod(H * I, p);
  // r = 2*(S2-S1)
  let r = 2n * (S2 - S1);
  // V = U1*I
  let V = mod(U1 * I, p);
  // X3 = r^2-J-2*V
  let X3 = mod(r * r - J - 2n * V, p);
  // Y3 = r*(V-X3)-2*S1*J
  let Y3 = mod(r * (V - X3) - 2n * S1 * J, p);
  // Z3 = ((Z1+Z2)^2-Z1Z1-Z2Z2)*H
  let Z3 = mod(((Z1 + Z2) * (Z1 + Z2) - Z1Z1 - Z2Z2) * H, p);
  return { x: X3, y: Y3, z: Z3 };
}

function projectiveDouble(g: GroupProjective, p: bigint) {
  if (g.z === 0n) return g;
  let X1 = g.x,
    Y1 = g.y,
    Z1 = g.z;
  // http://www.hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#doubling-dbl-2009-l
  // !!! formula depends on a === 0 in the curve equation y^2 = x^3 + ax + b !!!
  // A = X1^2
  let A = mod(X1 * X1, p);
  // B = Y1^2
  let B = mod(Y1 * Y1, p);
  // C = B^2
  let C = mod(B * B, p);
  // D = 2*((X1+B)^2-A-C)
  let D = mod(2n * ((X1 + B) * (X1 + B) - A - C), p);
  // E = 3*A
  let E = 3n * A;
  // F = E^2
  let F = mod(E * E, p);
  // X3 = F-2*D
  let X3 = mod(F - 2n * D, p);
  // Y3 = E*(D-X3)-8*C
  let Y3 = mod(E * (D - X3) - 8n * C, p);
  // Z3 = 2*Y1*Z1
  let Z3 = mod(2n * Y1 * Z1, p);
  return { x: X3, y: Y3, z: Z3 };
}

function projectiveSub(g: GroupProjective, h: GroupProjective, p: bigint) {
  return projectiveAdd(g, projectiveNeg(h, p), p);
}

function projectiveScale(g: GroupProjective, x: bigint, p: bigint) {
  let h = projectiveZero;
  while (x > 0n) {
    if (x & 1n) h = projectiveAdd(h, g, p);
    g = projectiveDouble(g, p);
    x >>= 1n;
  }
  return h;
}

function projectiveToAffine(g: GroupProjective, p: bigint): GroupAffine {
  let z = g.z;
  if (z === 0n) {
    // infinity
    return { x: 1n, y: 1n, infinity: true };
  } else if (z === 1n) {
    // already normalized affine form
    return { x: g.x, y: g.y, infinity: false };
  } else {
    let zinv = inverse(z, p)!; // we checked for z === 0, so inverse exists
    let zinv_squared = mod(zinv * zinv, p);
    // x/z^2
    let x = mod(g.x * zinv_squared, p);
    // y/z^3
    let y = mod(g.y * zinv * zinv_squared, p);
    return { x: x, y: y, infinity: false };
  }
}

function projectiveEqual(g: GroupProjective, h: GroupProjective, p: bigint) {
  // special case: z=0 can only be equal to another z=0; protects against (0,0,0) being equal to any point
  if ((g.z === 0n || h.z === 0n) && !(g.z === 0n && h.z === 0n)) return false;
  // multiply out with z^2, z^3
  let gz2 = mod(g.z * g.z, p);
  let hz2 = mod(h.z * h.z, p);
  // early return if gx !== hx
  if (mod(g.x * hz2, p) !== mod(h.x * gz2, p)) return false;
  let gz3 = mod(gz2 * g.z, p);
  let hz3 = mod(hz2 * h.z, p);
  return mod(g.y * hz3, p) === mod(h.y * gz3, p);
}

function projectiveOnCurve({ x, y, z }: GroupProjective, p: bigint, b: bigint) {
  // substitution x -> x/z^2 and y -> y/z^3 gives
  // the equation y^2 = x^3 + b*z^6
  // (note: we allow a restricted set of x,y for z==0; this seems fine)
  let x3 = mod(mod(x * x, p) * x, p);
  let y2 = mod(y * y, p);
  let z3 = mod(mod(z * z, p) * z, p);
  let z6 = mod(z3 * z3, p);
  return mod(y2 - x3 - b * z6, p) === 0n;
}

function createCurveProjective(
  p: bigint,
  generator: GroupProjective,
  endoBase: bigint,
  endoScalar: bigint,
  b: bigint,
  a: bigint
) {
  return {
    zero: projectiveZero,
    one: generator,
    endoBase,
    endoScalar,
    b,
    a,

    equal(g: GroupProjective, h: GroupProjective) {
      return projectiveEqual(g, h, p);
    },
    isOnCurve(g: GroupProjective) {
      return projectiveOnCurve(g, p, b);
    },
    add(g: GroupProjective, h: GroupProjective) {
      return projectiveAdd(g, h, p);
    },
    double(g: GroupProjective) {
      return projectiveDouble(g, p);
    },
    negate(g: GroupProjective) {
      return projectiveNeg(g, p);
    },
    sub(g: GroupProjective, h: GroupProjective) {
      return projectiveSub(g, h, p);
    },
    scale(g: GroupProjective, s: bigint) {
      return projectiveScale(g, s, p);
    },
    endomorphism({ x, y, z }: GroupProjective) {
      return { x: mod(endoBase * x, p), y, z };
    },
    toAffine(g: GroupProjective) {
      return projectiveToAffine(g, p);
    },
    fromAffine({ x, y, infinity }: GroupAffine) {
      if (infinity) return projectiveZero;
      return { x, y, z: 1n };
    },
  };
}

const Pallas = createCurveProjective(
  p,
  pallasGeneratorProjective,
  pallasEndoBase,
  pallasEndoScalar,
  b,
  a
);
const Vesta = createCurveProjective(
  q,
  vestaGeneratorProjective,
  vestaEndoBase,
  vestaEndoScalar,
  b,
  a
);
