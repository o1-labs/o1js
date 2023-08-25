import { FiniteField, Fp, Fq, mod } from './finite_field.js';
import {
  Bigint256,
  MlBytes,
  fromMlString,
  toMlStringAscii,
} from './bindings-bigint256.js';
import { MlOption, MlBool } from '../../lib/ml/base.js';

type Field = [bigint];

export { FpBindings as Fp, FqBindings as Fq };

const FpBindings = createFieldBindings(Fp, 'caml_pasta_fp');
const FqBindings = createFieldBindings(Fq, 'caml_pasta_fq');

function createFieldBindings<fp extends string>(Field: FiniteField, fp: fp) {
  let FieldBindings = {
    add([x]: Field, [y]: Field): Field {
      return [Field.add(x, y)];
    },
    negate([x]: Field): Field {
      return [Field.negate(x)];
    },
    sub([x]: Field, [y]: Field): Field {
      return [Field.sub(x, y)];
    },
    mul([x]: Field, [y]: Field): Field {
      return [Field.mul(x, y)];
    },
    inv([x]: Field): MlOption<Field> {
      return toMlOption(Field.inverse(x));
    },
    div([x]: Field, [y]: Field): Field {
      let z = Field.div(x, y);
      if (z === undefined) throw Error('division by zero');
      return [z];
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
    equal([x]: Field, [y]: Field): MlBool {
      return MlBool(Field.equal(x, y));
    },
    compare(x: Field, y: Field): 1 | 0 | -1 {
      return Bigint256.caml_bigint_256_compare(x, y);
    },
    random(): Field {
      return [Field.random()];
    },
    of_int(x: number): Field {
      return [Field.fromNumber(x)];
    },
    of_bigint(x: Bigint256): Field {
      return x;
    },
    to_bigint(x: Field): Bigint256 {
      return x;
    },
    to_string([x]: Field): MlBytes {
      return toMlStringAscii(x.toString());
    },
    of_string(s: MlBytes): Field {
      return [Field.fromBigint(BigInt(fromMlString(s)))];
    },
    size(): Bigint256 {
      return [Field.modulus];
    },
    size_in_bits(): number {
      return Field.sizeInBits;
    },
    copy(x: Field, [y]: Field): void {
      x[0] = y;
    },
    print(x: Field): void {
      console.log(x[0].toString());
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
  };
  type FieldBindings = typeof FieldBindings;
  return Object.fromEntries(
    Object.entries(FieldBindings).map(([k, v]) => {
      return [`${fp}_${k}`, v];
    })
  ) as {
    [k in keyof FieldBindings as `${fp}_${k}`]: FieldBindings[k];
  };
}

function toMlOption<T>(x: undefined | T): MlOption<[T]> {
  if (x === undefined) return 0; // None
  return [0, [x]]; // Some(x)
}
