/**
 * TS implementation of Pasta_bindings.{Fp, Fq}
 */
import { FiniteField, Fp, Fq, mod } from './finite_field.js';
import {
  Bigint256Bindings,
  Bigint256,
  MlBytes,
  fromMlString,
  toMlStringAscii,
} from './bindings-bigint256.js';
import { MlOption, MlBool } from '../../lib/ml/base.js';
import { withPrefix } from './bindings-util.js';

type Field = [bigint];

export { FpBindings, FqBindings, Field };

const FpBindings = withPrefix('caml_pasta_fp', createFieldBindings(Fp));
const FqBindings = withPrefix('caml_pasta_fq', createFieldBindings(Fq));

function createFieldBindings(Field: FiniteField) {
  return {
    size_in_bits(): number {
      return Field.sizeInBits;
    },
    size(): Bigint256 {
      return [Field.modulus];
    },
    add([x]: Field, [y]: Field): Field {
      return [Field.add(x, y)];
    },
    sub([x]: Field, [y]: Field): Field {
      return [Field.sub(x, y)];
    },
    negate([x]: Field): Field {
      return [Field.negate(x)];
    },
    mul([x]: Field, [y]: Field): Field {
      return [Field.mul(x, y)];
    },
    div([x]: Field, [y]: Field): Field {
      let z = Field.div(x, y);
      if (z === undefined) throw Error('division by zero');
      return [z];
    },
    inv([x]: Field): MlOption<Field> {
      return toMlOption(Field.inverse(x));
    },
    square([x]: Field): Field {
      return [Field.square(x)];
    },
    is_square([x]: Field): MlBool {
      return MlBool(Field.isSquare(x));
    },
    sqrt([x]: Field): MlOption<Field> {
      return toMlOption(Field.sqrt(x));
    },
    of_int(x: number): Field {
      return [Field.fromNumber(x)];
    },
    to_string([x]: Field): MlBytes {
      return toMlStringAscii(x.toString());
    },
    of_string(s: MlBytes): Field {
      return [Field.fromBigint(BigInt(fromMlString(s)))];
    },
    print(x: Field): void {
      console.log(x[0].toString());
    },
    copy(x: Field, [y]: Field): void {
      x[0] = y;
    },
    mut_add(x: Field, [y]: Field): void {
      x[0] = Field.add(x[0], y);
    },
    mut_sub(x: Field, [y]: Field): void {
      x[0] = Field.sub(x[0], y);
    },
    mut_mul(x: Field, [y]: Field): void {
      x[0] = Field.mul(x[0], y);
    },
    mut_square(x: Field): void {
      x[0] = Field.square(x[0]);
    },
    compare(x: Field, y: Field): 1 | 0 | -1 {
      return Bigint256Bindings.caml_bigint_256_compare(x, y);
    },
    equal([x]: Field, [y]: Field): MlBool {
      return MlBool(x === y);
    },
    random(): Field {
      return [Field.random()];
    },
    rng(i: number): Field {
      console.warn('rng is not implemented');
      return [Field.random()];
    },
    to_bigint(x: Field): Bigint256 {
      return x;
    },
    of_bigint(x: Bigint256): Field {
      return x;
    },
    two_adic_root_of_unity(): Field {
      return [Field.twoadicRoot];
    },
    domain_generator(i: number): Field {
      // this takes an integer i and returns a 2^ith root of unity, i.e. a number `w` with
      // w^(2^i) = 1, w^(2^(i-1)) = -1
      // computed by taking the 2^32th root and squaring 32-i times
      if (i > 32 || i < 0)
        throw Error(
          'log2 size of evaluation domain must be in [0, 32], got ' + i
        );
      if (i === 0) return [1n];
      let generator = Field.twoadicRoot;
      for (var j = 32; j > i; j--) {
        generator = mod(generator * generator, Field.modulus);
      }
      return [generator];
    },
    to_bytes(x: Field): MlBytes {
      return Bigint256Bindings.caml_bigint_256_to_bytes(x);
    },
    of_bytes(x: MlBytes): Field {
      return Bigint256Bindings.caml_bigint_256_of_bytes(x);
    },
    deep_copy([x]: Field): Field {
      return [x];
    },
  };
}

function toMlOption<T>(x: undefined | T): MlOption<[T]> {
  if (x === undefined) return 0; // None
  return [0, [x]]; // Some(x)
}
