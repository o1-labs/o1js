"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectiveNeg = exports.getProjectiveDouble = exports.projectiveAdd = exports.projectiveZero = exports.projectiveToAffine = exports.projectiveFromAffine = exports.affineScale = exports.affineDouble = exports.affineAdd = exports.createCurveAffine = exports.createCurveProjective = exports.GroupMapPallas = exports.Vesta = exports.PallasAffine = exports.Pallas = void 0;
const bigint_helpers_js_1 = require("./bigint-helpers.js");
const finite_field_js_1 = require("./finite-field.js");
const elliptic_curve_endomorphism_js_1 = require("./elliptic-curve-endomorphism.js");
// TODO: constants, like generator points and cube roots for endomorphisms, should be drawn from
// a common source, i.e. generated from the Rust code
const pallasGeneratorProjective = {
    x: 1n,
    y: 12418654782883325593414442427049395787963493412651469444558597405572177144507n,
};
const vestaGeneratorProjective = {
    x: 1n,
    y: 11426906929455361843568202299992114520848200991084027513389447476559454104162n,
};
const vestaEndoBase = 2942865608506852014473558576493638302197734138389222805617480874486368177743n;
const pallasEndoBase = 20444556541222657078399132219657928148671392403212669005631716460534733845831n;
const vestaEndoScalar = 8503465768106391777493614032514048814691664078728891710322960303815233784505n;
const pallasEndoScalar = 26005156700822196841419187675678338661165322343552424574062261873906994770353n;
// the b and a in y^2 = x^3 + ax + b
const b = 5n;
const a = 0n;
const projectiveZero = { x: 1n, y: 1n, z: 0n };
exports.projectiveZero = projectiveZero;
// reference implementation https://github.com/o1-labs/snarky/blob/78e0d952518f75b5382f6d735adb24eef7a0fa90/group_map/group_map.ml
const GroupMap = {
    create: (F, params) => {
        const { a, b } = params.spec;
        if (a !== 0n)
            throw Error('GroupMap only supports a = 0');
        function tryDecode(x) {
            // x^3
            const pow3 = F.power(x, 3n);
            // a * x - since a = 0, ax will be 0 as well
            // const ax = F.mul(a, x);
            // x^3 + ax + b, but since ax = 0 we can write x^3 + b
            const y = F.add(pow3, b);
            if (!F.isSquare(y))
                return undefined;
            return { x, y: F.sqrt(y) };
        }
        function sToVTruncated(s) {
            const { u, v, y } = s;
            return [v, F.negate(F.add(u, v)), F.add(u, F.square(y))];
        }
        function conic_to_s(c) {
            const d = F.div(c.z, c.y);
            if (d === undefined)
                throw Error(`Division undefined! ${c.z}/${c.y}`);
            const v = F.sub(d, params.u_over_2);
            return { u: params.u, v, y: c.y };
        }
        function field_to_conic(t) {
            const { z: z0, y: y0 } = params.projection_point;
            const ct = F.mul(params.conic_c, t);
            const d1 = F.add(F.mul(ct, y0), z0);
            const d2 = F.add(F.mul(ct, t), 1n);
            const d = F.div(d1, d2);
            if (d === undefined)
                throw Error(`Division undefined! ${d1}/${d2}`);
            const s = F.mul(2n, d);
            return {
                z: F.sub(z0, s),
                y: F.sub(y0, F.mul(s, t)),
            };
        }
        return {
            potentialXs: (t) => sToVTruncated(conic_to_s(field_to_conic(t))),
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
const GroupMapPallas = GroupMap.create(finite_field_js_1.Fp, GroupMapParamsFp);
exports.GroupMapPallas = GroupMapPallas;
function projectiveNeg({ x, y, z }, p) {
    return { x, y: y === 0n ? 0n : p - y, z };
}
exports.projectiveNeg = projectiveNeg;
function projectiveAdd(g, h, p, a) {
    if (g.z === 0n)
        return h;
    if (h.z === 0n)
        return g;
    let X1 = g.x, Y1 = g.y, Z1 = g.z, X2 = h.x, Y2 = h.y, Z2 = h.z;
    // http://www.hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#addition-add-2007-bl
    // Z1Z1 = Z1^2
    let Z1Z1 = (0, finite_field_js_1.mod)(Z1 * Z1, p);
    // Z2Z2 = Z2^2
    let Z2Z2 = (0, finite_field_js_1.mod)(Z2 * Z2, p);
    // U1 = X1*Z2Z2
    let U1 = (0, finite_field_js_1.mod)(X1 * Z2Z2, p);
    // U2 = X2*Z1Z1
    let U2 = (0, finite_field_js_1.mod)(X2 * Z1Z1, p);
    // S1 = Y1*Z2*Z2Z2
    let S1 = (0, finite_field_js_1.mod)(Y1 * Z2 * Z2Z2, p);
    // S2 = Y2*Z1*Z1Z1
    let S2 = (0, finite_field_js_1.mod)(Y2 * Z1 * Z1Z1, p);
    // H = U2-U1
    let H = (0, finite_field_js_1.mod)(U2 - U1, p);
    // H = 0 <==> x1 = X1/Z1^2 = X2/Z2^2 = x2 <==> degenerate case (Z3 would become 0)
    if (H === 0n) {
        // if S1 = S2 <==> y1 = y2, the points are equal, so we double instead
        if (S1 === S2)
            return projectiveDouble(g, p, a);
        // if S1 = -S2, the points are inverse, so return zero
        if ((0, finite_field_js_1.mod)(S1 + S2, p) === 0n)
            return projectiveZero;
        throw Error('projectiveAdd: invalid point');
    }
    // I = (2*H)^2
    let I = (0, finite_field_js_1.mod)((H * H) << 2n, p);
    // J = H*I
    let J = (0, finite_field_js_1.mod)(H * I, p);
    // r = 2*(S2-S1)
    let r = 2n * (S2 - S1);
    // V = U1*I
    let V = (0, finite_field_js_1.mod)(U1 * I, p);
    // X3 = r^2-J-2*V
    let X3 = (0, finite_field_js_1.mod)(r * r - J - 2n * V, p);
    // Y3 = r*(V-X3)-2*S1*J
    let Y3 = (0, finite_field_js_1.mod)(r * (V - X3) - 2n * S1 * J, p);
    // Z3 = ((Z1+Z2)^2-Z1Z1-Z2Z2)*H
    let Z3 = (0, finite_field_js_1.mod)(((Z1 + Z2) * (Z1 + Z2) - Z1Z1 - Z2Z2) * H, p);
    return { x: X3, y: Y3, z: Z3 };
}
exports.projectiveAdd = projectiveAdd;
/**
 * Projective doubling in Jacobian coordinates, specialized to a=0
 *
 * Cost: 2M + 5S
 */
function projectiveDoubleA0(g, p) {
    if (g.z === 0n)
        return g;
    let X1 = g.x, Y1 = g.y, Z1 = g.z;
    if (Y1 === 0n)
        throw Error('projectiveDouble: unhandled case');
    // http://www.hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#doubling-dbl-2009-l
    // A = X1^2
    let A = (0, finite_field_js_1.mod)(X1 * X1, p);
    // B = Y1^2
    let B = (0, finite_field_js_1.mod)(Y1 * Y1, p);
    // C = B^2
    let C = (0, finite_field_js_1.mod)(B * B, p);
    // D = 2*((X1+B)^2-A-C)
    let D = (0, finite_field_js_1.mod)(2n * ((X1 + B) * (X1 + B) - A - C), p);
    // E = 3*A
    let E = 3n * A;
    // F = E^2
    let F = (0, finite_field_js_1.mod)(E * E, p);
    // X3 = F-2*D
    let X3 = (0, finite_field_js_1.mod)(F - 2n * D, p);
    // Y3 = E*(D-X3)-8*C
    let Y3 = (0, finite_field_js_1.mod)(E * (D - X3) - 8n * C, p);
    // Z3 = 2*Y1*Z1
    let Z3 = (0, finite_field_js_1.mod)(2n * Y1 * Z1, p);
    return { x: X3, y: Y3, z: Z3 };
}
/**
 * Projective doubling in Jacobian coordinates, specialized to a=-3
 *
 * Cost: 3M + 5S
 */
function projectiveDoubleAminus3(g, p) {
    if (g.z === 0n)
        return g;
    let X1 = g.x, Y1 = g.y, Z1 = g.z;
    if (Y1 === 0n)
        throw Error('projectiveDouble: unhandled case');
    // http://www.hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html#doubling-dbl-2001-b
    // delta = Z1^2
    let delta = (0, finite_field_js_1.mod)(Z1 * Z1, p);
    // gamma = Y1^2
    let gamma = (0, finite_field_js_1.mod)(Y1 * Y1, p);
    // beta = X1*gamma
    let beta = (0, finite_field_js_1.mod)(X1 * gamma, p);
    // alpha = 3*(X1-delta)*(X1+delta)
    let alpha = (0, finite_field_js_1.mod)((X1 - delta) * (X1 + delta), p);
    alpha = alpha + alpha + alpha;
    // X3 = alpha^2-8*beta
    let X3 = (0, finite_field_js_1.mod)(alpha * alpha - 8n * beta, p);
    // Z3 = (Y1+Z1)^2-gamma-delta
    let Z3 = (0, finite_field_js_1.mod)((Y1 + Z1) * (Y1 + Z1) - gamma - delta, p);
    // Y3 = alpha*(4*beta-X3)-8*gamma^2
    let Y3 = (0, finite_field_js_1.mod)(alpha * (4n * beta - X3) - 8n * gamma * gamma, p);
    return { x: X3, y: Y3, z: Z3 };
}
function projectiveDouble(g, p, a) {
    if (a === 0n)
        return projectiveDoubleA0(g, p);
    if (a + 3n === p)
        return projectiveDoubleAminus3(g, p);
    throw Error('Projective doubling is not implemented for general curve parameter a, only a = 0 and a = -3');
}
function getProjectiveDouble(p, a) {
    if (a === 0n)
        return projectiveDoubleA0;
    if (a + 3n === p)
        return projectiveDoubleAminus3;
    throw Error('Projective doubling is not implemented for general curve parameter a, only a = 0 and a = -3');
}
exports.getProjectiveDouble = getProjectiveDouble;
function projectiveSub(g, h, p, a) {
    return projectiveAdd(g, projectiveNeg(h, p), p, a);
}
function projectiveScale(g, x, p, a) {
    let double = getProjectiveDouble(p, a);
    let bits = typeof x === 'bigint' ? (0, bigint_helpers_js_1.bigIntToBits)(x) : x;
    let h = projectiveZero;
    for (let bit of bits) {
        if (bit)
            h = projectiveAdd(h, g, p, a);
        g = double(g, p);
    }
    return h;
}
function projectiveFromAffine({ x, y, infinity }) {
    if (infinity)
        return projectiveZero;
    return { x, y, z: 1n };
}
exports.projectiveFromAffine = projectiveFromAffine;
function projectiveToAffine(g, p) {
    let z = g.z;
    if (z === 0n) {
        // infinity
        return { x: 0n, y: 0n, infinity: true };
    }
    else if (z === 1n) {
        // already normalized affine form
        return { x: g.x, y: g.y, infinity: false };
    }
    else {
        let zinv = (0, finite_field_js_1.inverse)(z, p); // we checked for z === 0, so inverse exists
        let zinv_squared = (0, finite_field_js_1.mod)(zinv * zinv, p);
        // x/z^2
        let x = (0, finite_field_js_1.mod)(g.x * zinv_squared, p);
        // y/z^3
        let y = (0, finite_field_js_1.mod)(g.y * zinv * zinv_squared, p);
        return { x: x, y: y, infinity: false };
    }
}
exports.projectiveToAffine = projectiveToAffine;
function projectiveEqual(g, h, p) {
    // special case: z=0 can only be equal to another z=0; protects against (0,0,0) being equal to any point
    if ((g.z === 0n || h.z === 0n) && g.z !== h.z)
        return false;
    // multiply out with z^2, z^3
    let gz2 = (0, finite_field_js_1.mod)(g.z * g.z, p);
    let hz2 = (0, finite_field_js_1.mod)(h.z * h.z, p);
    // early return if gx !== hx
    if ((0, finite_field_js_1.mod)(g.x * hz2 - h.x * gz2, p) !== 0n)
        return false;
    let gz3 = (0, finite_field_js_1.mod)(gz2 * g.z, p);
    let hz3 = (0, finite_field_js_1.mod)(hz2 * h.z, p);
    return (0, finite_field_js_1.mod)(g.y * hz3, p) === (0, finite_field_js_1.mod)(h.y * gz3, p);
}
function projectiveOnCurve({ x, y, z }, p, b, a) {
    // substitution x -> x/z^2 and y -> y/z^3 gives
    // the equation y^2 = x^3 + a*x*z^4 + b*z^6
    // (note: we allow a restricted set of x,y for z==0; this seems fine)
    let x3 = (0, finite_field_js_1.mod)((0, finite_field_js_1.mod)(x * x, p) * x, p);
    let y2 = (0, finite_field_js_1.mod)(y * y, p);
    let z2 = (0, finite_field_js_1.mod)(z * z, p);
    let z4 = (0, finite_field_js_1.mod)(z2 * z2, p);
    let z6 = (0, finite_field_js_1.mod)(z4 * z2, p);
    return (0, finite_field_js_1.mod)(y2 - x3 - a * x * z4 - b * z6, p) === 0n;
}
// checks whether the elliptic curve point g is in the subgroup defined by [order]g = 0
function projectiveInSubgroup(g, p, order, a) {
    let orderTimesG = projectiveScale(g, order, p, a);
    return projectiveEqual(orderTimesG, projectiveZero, p);
}
/**
 * Projective curve arithmetic in Jacobian coordinates
 */
function createCurveProjective({ name, modulus: p, order, cofactor, generator, b, a, endoBase, endoScalar, }) {
    let double = getProjectiveDouble(p, a);
    cofactor ??= 1n;
    let hasCofactor = cofactor !== 1n;
    return {
        name,
        modulus: p,
        order,
        cofactor,
        zero: projectiveZero,
        one: { ...generator, z: 1n },
        hasEndomorphism: endoBase !== undefined && endoScalar !== undefined,
        get endoBase() {
            if (endoBase === undefined)
                throw Error('`endoBase` for this curve was not provided.');
            return endoBase;
        },
        get endoScalar() {
            if (endoScalar === undefined)
                throw Error('`endoScalar` for this curve was not provided.');
            return endoScalar;
        },
        a,
        b,
        hasCofactor,
        equal(g, h) {
            return projectiveEqual(g, h, p);
        },
        isOnCurve(g) {
            return projectiveOnCurve(g, p, b, a);
        },
        isInSubgroup(g) {
            return projectiveInSubgroup(g, p, order, a);
        },
        add(g, h) {
            return projectiveAdd(g, h, p, a);
        },
        double(g) {
            return double(g, p);
        },
        negate(g) {
            return projectiveNeg(g, p);
        },
        sub(g, h) {
            return projectiveSub(g, h, p, a);
        },
        scale(g, s) {
            return projectiveScale(g, s, p, a);
        },
        endomorphism({ x, y, z }) {
            if (endoBase === undefined)
                throw Error('endomorphism needs `endoBase` parameter.');
            return { x: (0, finite_field_js_1.mod)(endoBase * x, p), y, z };
        },
        toAffine(g) {
            return projectiveToAffine(g, p);
        },
        fromAffine(a) {
            return projectiveFromAffine(a);
        },
    };
}
exports.createCurveProjective = createCurveProjective;
const Pallas = createCurveProjective({
    name: 'Pallas',
    modulus: finite_field_js_1.p,
    order: finite_field_js_1.q,
    generator: pallasGeneratorProjective,
    b,
    a,
    endoBase: pallasEndoBase,
    endoScalar: pallasEndoScalar,
});
exports.Pallas = Pallas;
const Vesta = createCurveProjective({
    name: 'Vesta',
    modulus: finite_field_js_1.q,
    order: finite_field_js_1.p,
    generator: vestaGeneratorProjective,
    b,
    a,
    endoBase: vestaEndoBase,
    endoScalar: vestaEndoScalar,
});
exports.Vesta = Vesta;
const affineZero = { x: 0n, y: 0n, infinity: true };
function affineOnCurve({ x, y, infinity }, p, a, b) {
    if (infinity)
        return true;
    // y^2 = x^3 + ax + b
    let x2 = (0, finite_field_js_1.mod)(x * x, p);
    return (0, finite_field_js_1.mod)(y * y - x * x2 - a * x - b, p) === 0n;
}
function affineAdd(g, h, p, a) {
    if (g.infinity)
        return h;
    if (h.infinity)
        return g;
    let { x: x1, y: y1 } = g;
    let { x: x2, y: y2 } = h;
    if (x1 === x2) {
        // g + g --> we double
        if (y1 === y2)
            return affineDouble(g, p, a);
        // g - g --> return zero
        return affineZero;
    }
    // m = (y2 - y1)/(x2 - x1)
    let d = (0, finite_field_js_1.inverse)(x2 - x1, p);
    if (d === undefined)
        throw Error('impossible');
    let m = (0, finite_field_js_1.mod)((y2 - y1) * d, p);
    // x3 = m^2 - x1 - x2
    let x3 = (0, finite_field_js_1.mod)(m * m - x1 - x2, p);
    // y3 = m*(x1 - x3) - y1
    let y3 = (0, finite_field_js_1.mod)(m * (x1 - x3) - y1, p);
    return { x: x3, y: y3, infinity: false };
}
exports.affineAdd = affineAdd;
function affineDouble({ x, y, infinity }, p, a) {
    if (infinity)
        return affineZero;
    // m = (3*x^2 + a) / 2y
    let d = (0, finite_field_js_1.inverse)(2n * y, p);
    if (d === undefined)
        throw Error('impossible');
    let m = (0, finite_field_js_1.mod)((3n * x * x + a) * d, p);
    // x2 = m^2 - 2x
    let x2 = (0, finite_field_js_1.mod)(m * m - 2n * x, p);
    // y2 = m*(x - x2) - y
    let y2 = (0, finite_field_js_1.mod)(m * (x - x2) - y, p);
    return { x: x2, y: y2, infinity: false };
}
exports.affineDouble = affineDouble;
function affineNegate({ x, y, infinity }, p) {
    if (infinity)
        return affineZero;
    return { x, y: y === 0n ? 0n : p - y, infinity };
}
function affineScale(g, s, p, a) {
    let gProj = projectiveFromAffine(g);
    let sgProj = projectiveScale(gProj, s, p, a);
    return projectiveToAffine(sgProj, p);
}
exports.affineScale = affineScale;
const PallasAffine = createCurveAffine({
    name: 'Pallas',
    modulus: finite_field_js_1.p,
    order: finite_field_js_1.q,
    generator: pallasGeneratorProjective,
    b,
    a,
    endoBase: pallasEndoBase,
    endoScalar: pallasEndoScalar,
});
exports.PallasAffine = PallasAffine;
function createCurveAffine({ name, modulus: p, order, cofactor, generator, a, b, endoScalar, endoBase, }) {
    let hasCofactor = cofactor !== undefined && cofactor !== 1n;
    const Field = (0, finite_field_js_1.createField)(p);
    const Scalar = (0, finite_field_js_1.createField)(order);
    const one = { ...generator, infinity: false };
    const Endo = (0, elliptic_curve_endomorphism_js_1.Endomorphism)(Field, Scalar, one, a, endoScalar, endoBase);
    return {
        name,
        /**
         * Arithmetic over the base field
         */
        Field,
        /**
         * Arithmetic over the scalar field
         */
        Scalar,
        modulus: p,
        order,
        a,
        b,
        cofactor,
        hasCofactor,
        zero: affineZero,
        one,
        hasEndomorphism: Endo !== undefined,
        get Endo() {
            if (Endo === undefined)
                throw Error(`no endomorphism defined on ${name}`);
            return Endo;
        },
        from(g) {
            if (g.x === 0n && g.y === 0n)
                return affineZero;
            return { ...g, infinity: false };
        },
        fromNonzero(g) {
            if (g.x === 0n && g.y === 0n) {
                throw Error('fromNonzero: got (0, 0), which is reserved for the zero point');
            }
            return { ...g, infinity: false };
        },
        equal(g, h) {
            if (g.infinity && h.infinity) {
                return true;
            }
            else if (g.infinity || h.infinity) {
                return false;
            }
            else {
                return (0, finite_field_js_1.mod)(g.x - h.x, p) === 0n && (0, finite_field_js_1.mod)(g.y - h.y, p) === 0n;
            }
        },
        isOnCurve(g) {
            return affineOnCurve(g, p, a, b);
        },
        isInSubgroup(g) {
            return projectiveInSubgroup(projectiveFromAffine(g), p, order, a);
        },
        add(g, h) {
            return affineAdd(g, h, p, a);
        },
        double(g) {
            return affineDouble(g, p, a);
        },
        negate(g) {
            return affineNegate(g, p);
        },
        sub(g, h) {
            return affineAdd(g, affineNegate(h, p), p, a);
        },
        scale(g, s) {
            return affineScale(g, s, p, a);
        },
    };
}
exports.createCurveAffine = createCurveAffine;
