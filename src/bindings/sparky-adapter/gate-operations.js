/**
 * Gate Operations Module
 *
 * This module implements high-level constraint gates that generate multiple related
 * constraints. Gates encapsulate complex mathematical operations like elliptic curve
 * arithmetic, cryptographic hash functions, and range checks.
 */
import { getSparkyInstance } from './module-loader.js';
import { MlArray as MlArrayUtils } from '../../lib/ml/base.js';
import { ensureFieldVar, fieldVarToCvar, mlArrayToJsArray } from './format-converter.js';
import { fieldOperations } from './field-operations.js';
/**
 * Get the gates module from Sparky instance
 */
function getGatesModule() {
    return getSparkyInstance().gates;
}
/**
 * Get the field module from Sparky instance
 */
function getFieldModule() {
    return getSparkyInstance().field;
}
/**
 * Helper to create witness variable
 */
function createWitnessVar() {
    const cvar = getFieldModule().exists(null);
    return ensureFieldVar(cvar);
}
/**
 * Extract value from MlArray format
 */
function extractValue(mlArray) {
    return Array.isArray(mlArray) ? mlArray[1] : mlArray;
}
/**
 * Gate operations interface
 */
export const gateOperations = {
    /**
     * Zero gate - constrains variables to zero
     */
    zero(in1, in2, out) {
        getGatesModule().zero(in1, in2, out);
    },
    /**
     * Generic gate - the fundamental building block of zkSNARK constraints
     *
     * Constraint equation: sl*l + sr*r + so*o + sm*(l*r) + sc = 0
     * Where:
     *   l, r, o = left, right, output field variables
     *   sl, sr, so, sm, sc = scalar coefficients
     *
     * Can represent many operations:
     *   - Addition: sl=1, sr=1, so=-1, sm=0, sc=0  → l + r = o
     *   - Multiplication: sl=0, sr=0, so=-1, sm=1, sc=0 → l * r = o
     *   - Constants: sl=1, sr=0, so=0, sm=0, sc=-c → l = c
     */
    generic(sl, l, sr, r, so, o, sm, sc) {
        // Variable array: the three field variables involved in the constraint
        const values = [l, r, o];
        // Coefficient extraction: preserve BigInt precision for field arithmetic
        const coefficients = [
            extractValue(sl), // Coefficient for left variable
            extractValue(sr), // Coefficient for right variable
            extractValue(so), // Coefficient for output variable
            extractValue(sm), // Coefficient for multiplication term
            extractValue(sc) // Constant term
        ];
        // Raw gate interface: bypasses intermediate conversions to preserve precision
        const GENERIC_GATE_TYPE = 1; // KimchiGateType::Generic
        try {
            getSparkyInstance().gatesRaw(GENERIC_GATE_TYPE, values, coefficients);
        }
        catch (error) {
            throw error;
        }
    },
    /**
     * Raw gate interface - direct access to constraint generation
     *
     * Note: Sparky expects exactly 3 variables for Zero and Generic gates, while Snarky
     * expects 15 (with padding). We need to handle this difference here.
     */
    raw(kind, values, coeffs) {
        // KimchiGateType values:
        const ZERO_GATE = 0;
        const GENERIC_GATE = 1;
        // Convert MLArray to regular JavaScript array if needed
        if (Array.isArray(values) && values[0] === 0) {
            values = MlArrayUtils.from(values);
        }
        // Convert coeffs MLArray to regular JavaScript array if needed
        if (Array.isArray(coeffs) && coeffs[0] === 0) {
            coeffs = MlArrayUtils.from(coeffs);
        }
        // For Zero and Generic gates, Sparky expects exactly 3 variables
        // while Snarky expects 15. We need to take only the first 3 non-padding values.
        if ((kind === ZERO_GATE || kind === GENERIC_GATE) && values.length > 3) {
            // The raw function in gates.js pads the array to 15 elements by calling exists()
            // which creates new variables. We only want the first 3 values.
            values = values.slice(0, 3);
        }
        // Convert coefficients to strings
        let stringCoeffs = coeffs.map(c => typeof c === 'string' ? c : c.toString());
        // For Zero and Generic gates, Sparky expects exactly 5 coefficients
        // [sl, sr, so, sm, sc] for the equation: sl*l + sr*r + so*o + sm*l*r + sc = 0
        if ((kind === ZERO_GATE || kind === GENERIC_GATE) && stringCoeffs.length < 5) {
            // Pad with zeros to get 5 coefficients
            while (stringCoeffs.length < 5) {
                stringCoeffs.push('0');
            }
        }
        getSparkyInstance().gatesRaw(kind, values, stringCoeffs);
    },
    /**
     * Poseidon hash gate
     */
    poseidon(state) {
        const gates = getGatesModule();
        if (gates.poseidon) {
            return gates.poseidon(state);
        }
        throw new Error('Poseidon gate not available in current backend');
    },
    /**
     * Elliptic curve point addition
     *
     * Implements complete addition on the Pallas elliptic curve: y² = x³ + 5
     * Handles all edge cases: point at infinity, point doubling, generic addition
     *
     * Constraint count: ~15-20 constraints per addition
     */
    ecAdd(p1, p2, p3, inf, same_x, slope, inf_z, x21_inv) {
        try {
            // Input validation
            if (!p1 || !p2 || !p3) {
                throw new Error('ecAdd: Points must be defined');
            }
            // Constraint generation: delegate to Sparky's optimized EC implementation
            const gates = getGatesModule();
            if (gates.ecAdd) {
                gates.ecAdd(p1, // First input point
                p2, // Second input point
                p3, // Result point (P1 + P2)
                inf, // Point at infinity flag
                same_x, // Same x-coordinate detection
                slope, // Addition line slope
                inf_z, // Infinity z-coordinate
                x21_inv // Modular inverse (x₂ - x₁)⁻¹
                );
            }
            else {
                throw new Error('ecAdd gate not available in current backend');
            }
        }
        catch (error) {
            throw new Error(`ecAdd implementation failed: ${error.message}`);
        }
    },
    /**
     * Elliptic curve scalar multiplication
     * Variable-base scalar multiplication using windowed method
     */
    ecScale(state) {
        // Expected state structure: [0, accs, bits, ss, base, nPrev, nNext]
        if (!Array.isArray(state) || state.length < 7) {
            throw new Error('ecScale: Invalid state structure');
        }
        const [_, accs, bits, ss, base, nPrev, nNext] = state;
        // Validate input arrays
        if (!Array.isArray(accs) || !Array.isArray(bits) || !Array.isArray(ss)) {
            throw new Error('ecScale: Expected arrays for accs, bits, and ss');
        }
        // Extract base point coordinates
        if (!Array.isArray(base) || base.length < 2) {
            throw new Error('ecScale: Invalid base point structure');
        }
        const [baseX, baseY] = base;
        try {
            // Implement windowed scalar multiplication
            for (let i = 0; i < accs.length && i < bits.length; i++) {
                const acc = accs[i];
                const bit = bits[i];
                const slope = (i < ss.length) ? ss[i] : null;
                // Validate accumulator point structure [x, y]
                if (!Array.isArray(acc) || acc.length < 2) {
                    continue; // Skip invalid accumulators
                }
                // Ensure bit is boolean (0 or 1)
                getFieldModule().assertBoolean(bit);
                // Create witness variables for EC addition result
                const addResult = {
                    x: createWitnessVar(),
                    y: createWitnessVar()
                };
                // Create witness variables for auxiliary constraints
                const inf = createWitnessVar();
                const same_x = createWitnessVar();
                const inf_z = createWitnessVar();
                const x21_inv = createWitnessVar();
                // Use proper elliptic curve addition: addResult = acc + base
                let slopeVar = slope || createWitnessVar();
                this.ecAdd({ x: acc[0], y: acc[1] }, // First point (accumulator)
                { x: baseX, y: baseY }, // Second point (base)
                addResult, // Result point
                inf, // Infinity flag
                same_x, // Same x flag
                slopeVar, // Slope
                inf_z, // Infinity z
                x21_inv // Inverse
                );
                // Conditional selection based on bit:
                // if bit == 1: result = addResult (acc + base)
                // if bit == 0: result = acc (unchanged)
                const one = fieldOperations.constant('1');
                const invBit = fieldOperations.sub(one, bit);
                const addX_scaled = fieldOperations.mul(bit, addResult.x);
                const accX_scaled = fieldOperations.mul(invBit, acc[0]);
                const resultX = fieldOperations.add(addX_scaled, accX_scaled);
                const addY_scaled = fieldOperations.mul(bit, addResult.y);
                const accY_scaled = fieldOperations.mul(invBit, acc[1]);
                const resultY = fieldOperations.add(addY_scaled, accY_scaled);
                // Update accumulator for next iteration
                if (i + 1 < accs.length) {
                    getFieldModule().assertEqual(fieldVarToCvar(accs[i + 1][0]), fieldVarToCvar(resultX));
                    getFieldModule().assertEqual(fieldVarToCvar(accs[i + 1][1]), fieldVarToCvar(resultY));
                }
            }
            // Process counter progression: nNext = nPrev + 1
            if (nPrev !== undefined && nNext !== undefined) {
                const prevField = fieldOperations.constant(nPrev.toString());
                const nextField = fieldOperations.constant(nNext.toString());
                const oneField = fieldOperations.constant('1');
                const expected = fieldOperations.add(prevField, oneField);
                getFieldModule().assertEqual(fieldVarToCvar(nextField), fieldVarToCvar(expected));
            }
        }
        catch (error) {
            throw new Error(`ecScale implementation failed: ${error.message}`);
        }
    },
    /**
     * Elliptic curve endomorphism-accelerated scalar multiplication
     * Computes k₁*P + k₂*λ(P) where k = k₁ + k₂*λ (GLV decomposition)
     */
    ecEndoscale(state) {
        // Expected state structure: [0, xt, yt, xp, yp, nAcc, xr, yr, s1, s3, b1, b2, b3, b4]
        if (!Array.isArray(state) || state.length < 14) {
            throw new Error('ecEndoscale: Invalid state structure, expected 14 elements');
        }
        const [_, xt, yt, xp, yp, nAccState, xr, yr, s1, s3, b1, b2, b3, b4] = state;
        try {
            // λ (lambda) for Pallas curve endomorphism - cube root of unity
            const lambda = fieldOperations.constant('0x2D33357CB532458ED3552A23A8554E5005270D29D19FC7D27B7FD22F0201B547');
            // Validate boolean constraints for decomposed scalar bits
            getFieldModule().assertBoolean(b1);
            getFieldModule().assertBoolean(b2);
            getFieldModule().assertBoolean(b3);
            getFieldModule().assertBoolean(b4);
            // Apply endomorphism: λ(P) = (λ*xp, yp)
            const endoXp = fieldOperations.mul(lambda, xp);
            const endoPoint = { x: endoXp, y: yp };
            // Create intermediate witness points
            const k1Point = { x: createWitnessVar(), y: createWitnessVar() };
            const k2Point = { x: createWitnessVar(), y: createWitnessVar() };
            // Scalar multiply P by k₁ (using bits b1, b2)
            // Compute 2*P (point doubling)
            const doubleP = { x: createWitnessVar(), y: createWitnessVar() };
            let s1Var = s1 || createWitnessVar();
            this.ecAdd({ x: xp, y: yp }, { x: xp, y: yp }, doubleP, createWitnessVar(), // inf
            createWitnessVar(), // same_x
            s1Var, // slope
            createWitnessVar(), // inf_z
            createWitnessVar() // x21_inv
            );
            // Similarly for k₂*λ(P)
            const doubleEndoP = { x: createWitnessVar(), y: createWitnessVar() };
            this.ecAdd(endoPoint, endoPoint, doubleEndoP, createWitnessVar(), createWitnessVar(), createWitnessVar(), createWitnessVar(), createWitnessVar());
            // Final addition: result = k₁*P + k₂*λ(P)
            let s3Var = s3 || createWitnessVar();
            this.ecAdd(k1Point, k2Point, { x: xr, y: yr }, createWitnessVar(), createWitnessVar(), s3Var, createWitnessVar(), createWitnessVar());
        }
        catch (error) {
            throw new Error(`ecEndoscale implementation failed: ${error.message}`);
        }
    },
    /**
     * Scale round gate for multi-scalar multiplication
     */
    scaleRound(accs, bits, ss, base, nPrev, nNext) {
        // TODO: Implement scale round gate
        throw new Error('scaleRound not yet implemented');
    },
    /**
     * Lookup table constraint gate
     */
    lookup(w0, w1, w2, w3, w4, w5, w6) {
        getGatesModule().lookup(w0, w1, w2, w3, w4, w5, w6);
    },
    /**
     * Add fixed lookup table
     */
    addFixedLookupTable(id, data) {
        getGatesModule().addFixedLookupTable(id, data);
    },
    /**
     * Add runtime table configuration
     */
    addRuntimeTableConfig(id, firstColumn) {
        getGatesModule().addRuntimeTableConfig(id, firstColumn);
    },
    /**
     * XOR gate for bitwise operations
     */
    xor(in1, in2, out, in1Bits, in2Bits, outBits) {
        // Extract bit arrays from MlArray format if needed
        const in1_0 = in1Bits[0];
        const in1_1 = in1Bits[1];
        const in1_2 = in1Bits[2];
        const in1_3 = in1Bits[3];
        const in2_0 = in2Bits[0];
        const in2_1 = in2Bits[1];
        const in2_2 = in2Bits[2];
        const in2_3 = in2Bits[3];
        const out_0 = outBits[0];
        const out_1 = outBits[1];
        const out_2 = outBits[2];
        const out_3 = outBits[3];
        getGatesModule().xor(in1, in2, out, in1_0, in1_1, in1_2, in1_3, in2_0, in2_1, in2_2, in2_3, out_0, out_1, out_2, out_3);
    },
    /**
     * Range check gate (64-bit)
     */
    rangeCheck0(x, xLimbs12, xLimbs2, isCompact) {
        // Convert MLArrays to JavaScript arrays for Rust WASM
        const jsLimbs12 = mlArrayToJsArray(xLimbs12);
        const jsLimbs2 = mlArrayToJsArray(xLimbs2);
        // Convert FieldConst to boolean
        const jsIsCompact = Array.isArray(isCompact) && isCompact.length === 2 ?
            isCompact[1] !== 0n : Boolean(isCompact);
        getSparkyInstance().gates.rangeCheck0(x, jsLimbs12, jsLimbs2, jsIsCompact);
    },
    /**
     * Range check gate (multi-limb) - used in combination with rangeCheck0 for 3x88-bit range check
     */
    rangeCheck1(v2, v12, vCurr, vNext) {
        // Convert MLArrays to JavaScript arrays for Rust WASM
        const jsVCurr = mlArrayToJsArray(vCurr);
        const jsVNext = mlArrayToJsArray(vNext);
        // Cast to any to bypass TypeScript type checking for new methods
        getSparkyInstance().gates.rangeCheck1(v2, v12, jsVCurr, jsVNext);
    },
    /**
     * Foreign field addition gate
     *
     * Performs addition in a foreign prime field with overflow handling.
     * This is called from singleAdd operations during foreign field arithmetic.
     *
     * The constraint enforces:
     * left + sign * right = (computed result) + overflow * foreignFieldModulus
     *
     * Note: The result is computed separately by witness generation in singleAdd.
     * This gate only adds the constraint relationship.
     */
    foreignFieldAdd(left, right, fieldOverflow, carry, foreignFieldModulus, sign) {
        try {
            const gates = getGatesModule();
            // Cast to any to bypass TypeScript type checking for new methods
            const gatesAny = gates;
            // Check if WASM backend supports foreign field addition
            if (!gatesAny.foreignFieldAdd) {
                throw new Error('foreignFieldAdd gate not available in current WASM backend');
            }
            // Convert MLArray format to JavaScript arrays
            // MLArray format is [0, element1, element2, element3]
            const leftJs = mlArrayToJsArray(left);
            const rightJs = mlArrayToJsArray(right);
            const modulusJs = mlArrayToJsArray(foreignFieldModulus);
            // Validate the arrays have 3 elements
            if (leftJs.length !== 3 || rightJs.length !== 3 || modulusJs.length !== 3) {
                throw new Error(`Foreign field arrays must have exactly 3 limbs. Got: left=${leftJs.length}, right=${rightJs.length}, modulus=${modulusJs.length}`);
            }
            // Extract the sign value from FieldConst format [0, value]
            let signValue;
            if (Array.isArray(sign) && sign[0] === 0) {
                const value = sign[1];
                signValue = typeof value === 'bigint' ? value.toString() : String(value);
                // Validate sign value
                if (signValue !== '1' && signValue !== '-1') {
                    // Check for bigint representations of 1 and -1 in the field
                    const fieldOrder = '28948022309329048855892746252171976963363056481941560715954676764349967630337';
                    const minusOne = '28948022309329048855892746252171976963363056481941560715954676764349967630336';
                    if (signValue === fieldOrder || signValue === '0') {
                        signValue = '1';
                    }
                    else if (signValue === minusOne) {
                        signValue = '-1';
                    }
                    else {
                        throw new Error(`Sign must be '1' or '-1', got '${signValue}'`);
                    }
                }
            }
            else {
                throw new Error(`Invalid sign format: expected FieldConst [0, value], got ${Array.isArray(sign) ? `[${sign[0]}, ...]` : typeof sign}`);
            }
            // Extract modulus limb values from FieldConst format [0, value]
            const extractModulusLimb = (limb) => {
                if (Array.isArray(limb) && limb[0] === 0) {
                    const value = limb[1];
                    if (typeof value === 'bigint') {
                        return value.toString();
                    }
                    else if (typeof value === 'string' || typeof value === 'number') {
                        return String(value);
                    }
                    throw new Error(`Modulus values must be strings or bigints, got ${typeof value}`);
                }
                throw new Error(`Invalid modulus limb format: expected FieldConst [0, value]`);
            };
            const modulus0 = extractModulusLimb(modulusJs[0]);
            const modulus1 = extractModulusLimb(modulusJs[1]);
            const modulus2 = extractModulusLimb(modulusJs[2]);
            // Call the WASM foreign field addition gate
            // The Rust function expects modulus as an array, not separate arguments
            gatesAny.foreignFieldAdd(leftJs, // left_limbs: [FieldVar, FieldVar, FieldVar]
            rightJs, // right_limbs: [FieldVar, FieldVar, FieldVar]
            fieldOverflow, // overflow: FieldVar
            carry, // carry: FieldVar
            [modulus0, modulus1, modulus2], // modulus_limbs: [value, value, value]
            signValue // sign: string ("1" or "-1")
            );
        }
        catch (error) {
            throw new Error(`foreignFieldAdd implementation failed: ${error.message}`);
        }
    },
    /**
     * Foreign field multiplication
     */
    foreignFieldMul(left, right, quotient, remainder, carry0, carry1p, carry1m, foreignFieldModulus2, negForeignFieldModulus) {
        // TODO: Implement foreign field multiplication
        throw new Error('foreignFieldMul not yet implemented');
    },
    /**
     * Rotate gate
     */
    rotate(field, rotated, excess, limbs, crumbs, twoToRot, bits) {
        // TODO: Implement rotate gate
        throw new Error('rotate not yet implemented');
    },
    /**
     * NOT gate
     */
    not(x, y, bits) {
        // TODO: Implement NOT gate
        throw new Error('not not yet implemented');
    }
};
