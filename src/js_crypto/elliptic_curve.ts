import { bytesToBigInt } from './bigint-helpers.js';
import { inverse, mod, p, q } from './finite_field.js';
export { Pallas, Vesta, GroupAffine, GroupProjective };

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

const projectiveZero = { x: 1n, y: 1n, z: 0n };

type GroupProjective = { x: bigint; y: bigint; z: bigint };
type GroupAffine = { x: bigint; y: bigint; infinity: boolean };

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
  // multiply out with z^2, z^3
  let gz2 = mod(g.z * g.z, p);
  let gz3 = mod(gz2 * g.z, p);
  let hz2 = mod(h.z * h.z, p);
  let hz3 = mod(hz2 * h.z, p);
  let gx = mod(g.x * hz2, p);
  let hx = mod(h.x * gz2, p);
  return (
    gx === hx &&
    mod(g.y * hz3, p) === mod(h.y * gz3, p) &&
    ((gx !== 0n && hx !== 0n) || (g.z === 0n && h.z === 0n))
  );
}

function createCurveProjective(
  p: bigint,
  generator: GroupProjective,
  endoBase: bigint,
  endoScalar: bigint
) {
  return {
    zero: projectiveZero,
    one: generator,
    endoBase,
    endoScalar,

    equal(g: GroupProjective, h: GroupProjective) {
      return projectiveEqual(g, h, p);
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
    toAffine(g: GroupProjective) {
      return projectiveToAffine(g, p);
    },
    ofAffine({ x, y }: GroupAffine) {
      return { x, y, z: 1n };
    },
  };
}

// TODO check if these really should be hardcoded, otherwise compute them
const vestaEndoBase = bytesToBigInt(
  new Uint8Array([
    79, 14, 170, 80, 224, 210, 169, 42, 175, 51, 192, 71, 125, 70, 237, 15, 90,
    15, 247, 28, 216, 180, 29, 81, 142, 82, 62, 40, 88, 154, 129, 6,
  ])
);
const pallasEndoBase = bytesToBigInt(
  new Uint8Array([
    71, 181, 1, 2, 47, 210, 127, 123, 210, 199, 159, 209, 41, 13, 39, 5, 80, 78,
    85, 168, 35, 42, 85, 211, 142, 69, 50, 181, 124, 53, 51, 45,
  ])
);
const vestaEndoScalar = bytesToBigInt(
  new Uint8Array([
    185, 74, 254, 253, 189, 94, 173, 29, 73, 49, 173, 55, 210, 139, 31, 29, 176,
    177, 170, 87, 220, 213, 170, 44, 113, 186, 205, 74, 131, 202, 204, 18,
  ])
);
const pallasEndoScalar = bytesToBigInt(
  new Uint8Array([
    177, 241, 85, 175, 64, 24, 157, 97, 46, 117, 212, 193, 126, 82, 89, 18, 166,
    240, 8, 227, 39, 75, 226, 174, 113, 173, 193, 215, 167, 101, 126, 57,
  ])
);

const Pallas = createCurveProjective(
  p,
  pallasGeneratorProjective,
  pallasEndoBase,
  pallasEndoScalar
);
const Vesta = createCurveProjective(
  q,
  vestaGeneratorProjective,
  vestaEndoBase,
  vestaEndoScalar
);
