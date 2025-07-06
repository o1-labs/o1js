"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeGlvData = exports.computeEndoConstants = exports.decompose = exports.Endomorphism = void 0;
const errors_js_1 = require("../../lib/util/errors.js");
const bigint_helpers_js_1 = require("./bigint-helpers.js");
const elliptic_curve_js_1 = require("./elliptic-curve.js");
const finite_field_js_1 = require("./finite-field.js");
/**
 * Define methods leveraging a curve endomorphism
 */
function Endomorphism(Field, Scalar, generator, a, endoScalar, endoBase) {
    if (endoScalar === undefined || endoBase === undefined) {
        try {
            ({ endoScalar, endoBase } = computeEndoConstants(Field, Scalar, generator, a));
        }
        catch (e) {
            return undefined;
        }
    }
    let endoBase_ = endoBase;
    let glvData = computeGlvData(Scalar.modulus, endoScalar);
    return {
        scalar: endoScalar,
        base: endoBase,
        decomposeMaxBits: glvData.maxBits,
        decompose(s) {
            return decompose(s, glvData);
        },
        endomorphism(P) {
            return endomorphism(P, endoBase_, Field.modulus);
        },
        scaleProjective(g, s) {
            return glvScaleProjective(g, s, Field.modulus, a, endoBase_, glvData);
        },
        scale(g, s) {
            let gProj = (0, elliptic_curve_js_1.projectiveFromAffine)(g);
            let sGProj = glvScaleProjective(gProj, s, Field.modulus, a, endoBase_, glvData);
            return (0, elliptic_curve_js_1.projectiveToAffine)(sGProj, Field.modulus);
        },
    };
}
exports.Endomorphism = Endomorphism;
/**
 * GLV decomposition, named after the authors Gallant, Lambert and Vanstone who introduced it:
 * https://iacr.org/archive/crypto2001/21390189.pdf
 *
 * decompose scalar as s = s0 + s1 * lambda where |s0|, |s1| are small
 *
 * this relies on scalars v00, v01, v10, v11 which satisfy
 * - v00 + v10 * lambda = 0 (mod q)
 * - v01 + v11 * lambda = 0 (mod q)
 * - |vij| ~ sqrt(q), i.e. each vij has only about half the bits of the max scalar size
 *
 * the vij are computed in {@link egcdStopEarly}.
 *
 * for a scalar s, we pick x0, x1 (see below) and define
 * s0 = x0 v00 + x1 v01 + s
 * s1 = x0 v10 + x1 v11
 *
 * this yields a valid decomposition for _any_ choice of x0, x1, because
 * s0 + s1 * lambda = x0 (v00 + v10 * lambda) + x1 (v01 + v11 * lambda) + s = s (mod q)
 *
 * to ensure s0, s1 are small, x0, x1 are chosen as integer approximations to the rational solutions x0*, x1* of
 * x0* v00 + x1* v01 = -s
 * x0* v10 + x1* v11 = 0
 *
 * picking the integer xi that's closest to xi* gives us |xi - xi*| <= 0.5
 *
 * now, |vij| being small ensures that s0, s1 are small:
 *
 * |s0| = |(x0 - x0*) v00 + (x1 - x1*) v01| <= 0.5 * (|v00| + |v01|)
 * |s1| = |(x0 - x0*) v10 + (x1 - x1*) v11| <= 0.5 * (|v10| + |v11|)
 *
 * given |vij| ~ sqrt(q), we also get |s0|, |s1| ~ sqrt(q).
 */
function decompose(s, data) {
    let { v00, v01, v10, v11, det } = data;
    let x0 = divideAndRound(-v11 * s, det);
    let x1 = divideAndRound(v10 * s, det);
    let s0 = v00 * x0 + v01 * x1 + s;
    let s1 = v10 * x0 + v11 * x1;
    return [
        { value: s0, isNegative: s0 < 0n, abs: (0, bigint_helpers_js_1.abs)(s0) },
        { value: s1, isNegative: s1 < 0n, abs: (0, bigint_helpers_js_1.abs)(s1) },
    ];
}
exports.decompose = decompose;
/**
 * Cheaply compute endomorphism((x,y)) = endoScalar * (x,y) = (endoBase * x, y)
 */
function endomorphism(P, endoBase, p) {
    return { x: (0, finite_field_js_1.mod)(endoBase * P.x, p), y: P.y };
}
function endomorphismProjective(P, endoBase, p) {
    return { x: (0, finite_field_js_1.mod)(endoBase * P.x, p), y: P.y, z: P.z };
}
/**
 * Faster scalar multiplication leveraging the GLV decomposition (see {@link decompose}).
 *
 * This method to speed up plain, non-provable scalar multiplication was the original application of GLV
 *
 * Instead of scaling a single point, we apply the decomposition to scale two points, with two scalars of half the original length:
 *
 * `s*G = s0*G + s1*lambda*G = s0*G + s1*endo(G)`, where endo(G) is cheap to compute
 *
 * Because we can do doubling on both points at once, we save half the double()` operations,
 * while the number of `add()` operations stays the same.
 */
function glvScaleProjective(g, s, p, a, endoBase, data) {
    let endoG = endomorphismProjective(g, endoBase, p);
    let double = (0, elliptic_curve_js_1.getProjectiveDouble)(p, a);
    let [s0, s1] = decompose(s, data);
    let S0 = (0, bigint_helpers_js_1.bigIntToBits)(s0.abs);
    let S1 = (0, bigint_helpers_js_1.bigIntToBits)(s1.abs);
    if (s0.isNegative)
        g = (0, elliptic_curve_js_1.projectiveNeg)(g, p);
    if (s1.isNegative)
        endoG = (0, elliptic_curve_js_1.projectiveNeg)(endoG, p);
    let h = elliptic_curve_js_1.projectiveZero;
    for (let i = data.maxBits - 1; i >= 0; i--) {
        if (S0[i])
            h = (0, elliptic_curve_js_1.projectiveAdd)(h, g, p, a);
        if (S1[i])
            h = (0, elliptic_curve_js_1.projectiveAdd)(h, endoG, p, a);
        if (i === 0)
            break;
        h = double(h, p);
    }
    return h;
}
/**
 * Compute constants for curve endomorphism (cube roots of unity in base and scalar field)
 *
 * Throws if conditions for a cube root-based endomorphism are not met.
 */
function computeEndoConstants(Field, Scalar, G, a) {
    let p = Field.modulus;
    let q = Scalar.modulus;
    // if there is a cube root of unity, it generates a subgroup of order 3
    (0, errors_js_1.assert)(p % 3n === 1n, 'Base field has a cube root of unity');
    (0, errors_js_1.assert)(q % 3n === 1n, 'Scalar field has a cube root of unity');
    // find a cube root of unity in Fq (endo scalar)
    // we need lambda^3 = 1 and lambda != 1, which implies the quadratic equation
    // lambda^2 + lambda + 1 = 0
    // solving for lambda, we get lambda = (-1 +- sqrt(-3)) / 2
    let sqrtMinus3 = Scalar.sqrt(Scalar.negate(3n));
    (0, errors_js_1.assert)(sqrtMinus3 !== undefined, 'Scalar field has a square root of -3');
    let lambda = Scalar.div(Scalar.sub(sqrtMinus3, 1n), 2n);
    (0, errors_js_1.assert)(lambda !== undefined, 'Scalar field has a cube root of unity');
    // sanity check
    (0, errors_js_1.assert)(Scalar.power(lambda, 3n) === 1n, 'lambda is a cube root');
    (0, errors_js_1.assert)(lambda !== 1n, 'lambda is not 1');
    // compute beta such that lambda * (x, y) = (beta * x, y) (endo base)
    let lambdaG = (0, elliptic_curve_js_1.affineScale)(G, lambda, p, a);
    (0, errors_js_1.assert)(lambdaG.y === G.y, 'multiplication by lambda is a cheap endomorphism');
    let beta = Field.div(lambdaG.x, G.x);
    (0, errors_js_1.assert)(beta !== undefined, 'Gx is invertible');
    (0, errors_js_1.assert)(Field.power(beta, 3n) === 1n, 'beta is a cube root');
    (0, errors_js_1.assert)(beta !== 1n, 'beta is not 1');
    // confirm endomorphism at random point
    // TODO would be nice to have some theory instead of this heuristic
    let R = (0, elliptic_curve_js_1.affineScale)(G, Scalar.random(), p, a);
    let lambdaR = (0, elliptic_curve_js_1.affineScale)(R, lambda, p, a);
    (0, errors_js_1.assert)(lambdaR.x === Field.mul(beta, R.x), 'confirm endomorphism');
    (0, errors_js_1.assert)(lambdaR.y === R.y, 'confirm endomorphism');
    return { endoScalar: lambda, endoBase: beta };
}
exports.computeEndoConstants = computeEndoConstants;
/**
 * compute constants for GLV decomposition and upper bounds on s0, s1
 *
 * see {@link decompose}
 */
function computeGlvData(q, lambda) {
    let [[v00, v01], [v10, v11]] = egcdStopEarly(lambda, q);
    let det = v00 * v11 - v10 * v01;
    // upper bounds for
    // |s0| <= 0.5 * (|v00| + |v01|)
    // |s1| <= 0.5 * (|v10| + |v11|)
    let maxS0 = (((0, bigint_helpers_js_1.abs)(v00) + (0, bigint_helpers_js_1.abs)(v01)) >> 1n) + 1n;
    let maxS1 = (((0, bigint_helpers_js_1.abs)(v10) + (0, bigint_helpers_js_1.abs)(v11)) >> 1n) + 1n;
    let maxBits = (0, bigint_helpers_js_1.log2)((0, bigint_helpers_js_1.max)(maxS0, maxS1));
    return { v00, v01, v10, v11, det, maxS0, maxS1, maxBits };
}
exports.computeGlvData = computeGlvData;
/**
 * Extended Euclidean algorithm which stops when r1 < sqrt(p)
 *
 * Input: positive integers l, p
 *
 * Output: matrix V = [[v00,v01],[v10,v11]] of field elements satisfying
 * (1, l)^T V = v0j + l*v1j = 0 (mod p)
 *
 * For random / "typical" l, we will have |vij| ~ sqrt(p) for all vij
 */
function egcdStopEarly(l, p) {
    if (l > p)
        throw Error('a > p');
    let [r0, r1] = [p, l];
    let [s0, s1] = [1n, 0n];
    let [t0, t1] = [0n, 1n];
    while (r1 * r1 > p) {
        let quotient = r0 / r1; // bigint division, cuts off remainder
        [r0, r1] = [r1, r0 - quotient * r1];
        [s0, s1] = [s1, s0 - quotient * s1];
        [t0, t1] = [t1, t0 - quotient * t1];
    }
    // compute r2, t2
    let quotient = r0 / r1;
    let r2 = r0 - quotient * r1;
    let t2 = t0 - quotient * t1;
    let [v00, v10] = [r1, -t1];
    let [v01, v11] = (0, bigint_helpers_js_1.max)(r0, (0, bigint_helpers_js_1.abs)(t0)) <= (0, bigint_helpers_js_1.max)(r2, (0, bigint_helpers_js_1.abs)(t2)) ? [r0, -t0] : [r2, -t2];
    // we always have si * p + ti * l = ri
    // => ri + (-ti)*l === 0 (mod p)
    // => we can use ri as the first row of V and -ti as the second
    return [
        [v00, v01],
        [v10, v11],
    ];
}
// round(x / y)
function divideAndRound(x, y) {
    let signz = (0, bigint_helpers_js_1.sign)(x) * (0, bigint_helpers_js_1.sign)(y);
    x = (0, bigint_helpers_js_1.abs)(x);
    y = (0, bigint_helpers_js_1.abs)(y);
    let z = x / y;
    // z is rounded down. round up if it brings z*y closer to x
    // (z+1)*y - x <= x - z*y
    if (2n * (x - z * y) >= y)
        z++;
    return signz * z;
}
