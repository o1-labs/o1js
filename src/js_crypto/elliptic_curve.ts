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

// projective repr: { x: bigint, y: bigint, z: bigint }
let GroupProjective = (function () {
  let GroupProjective = function (obj) {
    this.x = obj.x;
    this.y = obj.y;
    this.z = obj.z;
    // this.ptr = obj;
  };
  GroupProjective.prototype.free = function () {};
  return GroupProjective;
})();

// affine repr: { x: bigint, y: bigint, infinity: boolean }
let GroupAffine = (function () {
  let GroupAffine = function (obj) {
    this.x = obj.x;
    this.y = obj.y;
    this.infinity = obj.infinity;
    // this.ptr = obj;
  };
  GroupAffine.prototype.free = function () {};
  return GroupAffine;
})();

function projectiveZero() {
  return new GroupProjective({ x: 1n, y: 1n, z: 0n });
}

function projectiveNeg(g, p) {
  return new GroupProjective({ x: g.x, y: p - g.y, z: g.z });
}

function projectiveAdd(g, h, p) {
  if (g.z === 0n) return new GroupProjective(h);
  if (h.z === 0n) return new GroupProjective(g);
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
  let H = U2 - U1;
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
  return new GroupProjective({ x: X3, y: Y3, z: Z3 });
}

function projectiveDouble(g, p) {
  if (g.z === 0n) return new GroupProjective(g);
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
  return new GroupProjective({ x: X3, y: Y3, z: Z3 });
}

function projectiveSub(g, h, p) {
  return projectiveAdd(g, projectiveNeg(h, p), p);
}

function projectiveScale(g, x, p) {
  let h = projectiveZero();
  while (x > 0n) {
    if (x & 1n) h = projectiveAdd(h, g, p);
    g = projectiveDouble(g, p);
    x >>= 1n;
  }
  return h;
}

function projectiveToAffine(g, p) {
  let z = g.z;
  if (z === 0n) {
    // infinity
    return new GroupAffine({ x: 1n, y: 1n, infinity: true });
  } else if (z === 1n) {
    // already normalized affine form
    return new GroupAffine({ x: g.x, y: g.y, infinity: false });
  } else {
    let zinv = inverse(z, p);
    let zinv_squared = mod(zinv * zinv, p);
    // x/z^2
    let x = mod(g.x * zinv_squared, p);
    // y/z^3
    let y = mod(g.y * zinv * zinv_squared, p);
    return new GroupAffine({ x: x, y: y, infinity: false });
  }
}

function caml_pallas_one() {
  return new GroupProjective(pallasGeneratorProjective);
}
function caml_vesta_one() {
  return new GroupProjective(vestaGeneratorProjective);
}

function caml_pallas_add(g, h) {
  return projectiveAdd(g, h, p);
}
function caml_vesta_add(g, h) {
  return projectiveAdd(g, h, q);
}

function caml_pallas_negate(g) {
  return projectiveNeg(g, p);
}
function caml_vesta_negate(g) {
  return projectiveNeg(g, q);
}

function caml_pallas_sub(x, y) {
  return projectiveSub(x, y, p);
}
function caml_vesta_sub(x, y) {
  return projectiveSub(x, y, q);
}

function caml_pallas_scale(g, x) {
  return projectiveScale(g, x[0], p);
}
function caml_vesta_scale(g, x) {
  return projectiveScale(g, x[0], q);
}

function caml_pallas_endo_base() {
  return [caml_bigint_of_bytes(pallasEndoBase)];
}
function caml_vesta_endo_base() {
  return [caml_bigint_of_bytes(vestaEndoBase)];
}

function caml_pallas_endo_scalar() {
  return [caml_bigint_of_bytes(pallasEndoScalar)];
}
function caml_vesta_endo_scalar() {
  return [caml_bigint_of_bytes(vestaEndoScalar)];
}

function caml_pallas_to_affine(g) {
  let ga = projectiveToAffine(g, p);
  return caml_affine_of_js_affine(ga);
}
function caml_vesta_to_affine(g) {
  let ga = projectiveToAffine(g, q);
  return caml_affine_of_js_affine(ga);
}

function caml_pallas_of_affine_coordinates(x, y) {
  return new GroupProjective({ x: x[0], y: y[0], z: 1n });
}
function caml_vesta_of_affine_coordinates(x, y) {
  return new GroupProjective({ x: x[0], y: y[0], z: 1n });
}

// TODO check if these really should be hardcoded, otherwise compute them
const vestaEndoBase = new Uint8Array([
  79, 14, 170, 80, 224, 210, 169, 42, 175, 51, 192, 71, 125, 70, 237, 15, 90,
  15, 247, 28, 216, 180, 29, 81, 142, 82, 62, 40, 88, 154, 129, 6,
]);
const pallasEndoBase = new Uint8Array([
  71, 181, 1, 2, 47, 210, 127, 123, 210, 199, 159, 209, 41, 13, 39, 5, 80, 78,
  85, 168, 35, 42, 85, 211, 142, 69, 50, 181, 124, 53, 51, 45,
]);
const vestaEndoScalar = new Uint8Array([
  185, 74, 254, 253, 189, 94, 173, 29, 73, 49, 173, 55, 210, 139, 31, 29, 176,
  177, 170, 87, 220, 213, 170, 44, 113, 186, 205, 74, 131, 202, 204, 18,
]);
const pallasEndoScalar = new Uint8Array([
  177, 241, 85, 175, 64, 24, 157, 97, 46, 117, 212, 193, 126, 82, 89, 18, 166,
  240, 8, 227, 39, 75, 226, 174, 113, 173, 193, 215, 167, 101, 126, 57,
]);
