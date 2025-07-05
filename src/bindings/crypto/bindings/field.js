/**
 * TS implementation of Pasta_bindings.{Fp, Fq}
 */
import { Fp, Fq, mod } from '../finite-field.js';
import { Bigint256Bindings, fromMlString, toMlStringAscii, } from './bigint256.js';
import { MlBool } from '../../../lib/ml/base.js';
import { withPrefix } from './util.js';
export { FpBindings, FqBindings };
const FpBindings = withPrefix('caml_pasta_fp', createFieldBindings(Fp));
const FqBindings = withPrefix('caml_pasta_fq', createFieldBindings(Fq));
function createFieldBindings(Field) {
    return {
        size_in_bits() {
            return Field.sizeInBits;
        },
        size() {
            return [0, Field.modulus];
        },
        add([, x], [, y]) {
            return [0, Field.add(x, y)];
        },
        sub([, x], [, y]) {
            return [0, Field.sub(x, y)];
        },
        negate([, x]) {
            return [0, Field.negate(x)];
        },
        mul([, x], [, y]) {
            return [0, Field.mul(x, y)];
        },
        div([, x], [, y]) {
            let z = Field.div(x, y);
            if (z === undefined)
                throw Error('division by zero');
            return [0, z];
        },
        inv([, x]) {
            return toMlOption(Field.inverse(x));
        },
        square([, x]) {
            return [0, Field.square(x)];
        },
        is_square([, x]) {
            return MlBool(Field.isSquare(x));
        },
        sqrt([, x]) {
            return toMlOption(Field.sqrt(x));
        },
        of_int(x) {
            // avoid unnatural behaviour in Rust which treats negative numbers as uint64,
            // e.g. -1 becomes 2^64 - 1
            if (x < 0)
                throw Error('of_int: inputs must be non-negative');
            return [0, Field.fromNumber(x)];
        },
        to_string([, x]) {
            return toMlStringAscii(x.toString());
        },
        of_string(s) {
            return [0, Field.fromBigint(BigInt(fromMlString(s)))];
        },
        print(x) {
            console.log(x[0].toString());
        },
        copy(x, [, y]) {
            x[1] = y;
        },
        mut_add(x, [, y]) {
            x[1] = Field.add(x[1], y);
        },
        mut_sub(x, [, y]) {
            x[1] = Field.sub(x[1], y);
        },
        mut_mul(x, [, y]) {
            x[1] = Field.mul(x[1], y);
        },
        mut_square(x) {
            x[1] = Field.square(x[1]);
        },
        compare(x, y) {
            return Bigint256Bindings.caml_bigint_256_compare(x, y);
        },
        equal([, x], [, y]) {
            return MlBool(x === y);
        },
        random() {
            return [0, Field.random()];
        },
        rng(i) {
            // not used in js
            throw Error('rng: not implemented');
        },
        to_bigint([, x]) {
            // copying to a new array to break mutable reference
            return [0, x];
        },
        of_bigint([, x]) {
            if (x >= Field.modulus)
                throw Error('of_bigint: input exceeds field size');
            // copying to a new array to break mutable reference
            return [0, x];
        },
        two_adic_root_of_unity() {
            return [0, Field.twoadicRoot];
        },
        domain_generator(i) {
            // this takes an integer i and returns a 2^ith root of unity, i.e. a number `w` with
            // w^(2^i) = 1, w^(2^(i-1)) = -1
            // computed by taking the 2^32th root and squaring 32-i times
            if (i > 32 || i < 0)
                throw Error('log2 size of evaluation domain must be in [0, 32], got ' + i);
            if (i === 0)
                return [0, 1n];
            let generator = Field.twoadicRoot;
            for (let j = 32; j > i; j--) {
                generator = mod(generator * generator, Field.modulus);
            }
            return [0, generator];
        },
        to_bytes(x) {
            return Bigint256Bindings.caml_bigint_256_to_bytes(x);
        },
        of_bytes(bytes) {
            // not used in js
            throw Error('of_bytes: not implemented');
        },
        deep_copy([, x]) {
            return [0, x];
        },
    };
}
function toMlOption(x) {
    if (x === undefined)
        return 0; // None
    return [0, [0, x]]; // Some(x)
}
