import { FiniteField, Fp, Fq, mod } from './finite_field.js';
import {
  Bigint256,
  MlBytes,
  fromMlString,
  toMlStringAscii,
} from './bindings-bigint256.js';

type Field = Bigint256;

export { FpBindings as Fp, FqBindings as Fq };

const FpBindings = createFieldBindings(Fp, 'caml_pasta_fp');
const FqBindings = createFieldBindings(Fq, 'caml_pasta_fq');

function createFieldBindings(Field: FiniteField, fp: string) {
  return {
    [`${fp}_add`]([x]: Field, [y]: Field): Field {
      return [Field.add(x, y)];
    },
    [`${fp}_negate`]([x]: Field): Field {
      return [Field.negate(x)];
    },
    [`${fp}_sub`]([x]: Field, [y]: Field): Field {
      return [Field.sub(x, y)];
    },
    [`${fp}_mul`]([x]: Field, [y]: Field): Field {
      return [Field.mul(x, y)];
    },
    [`${fp}_inv`]([x]: Field): MlOption<Field> {
      return toMlOption(Field.inverse(x));
    },
    [`${fp}_div`]([x]: Field, [y]: Field): Field {
      let z = Field.div(x, y);
      if (z === undefined) throw Error('division by zero');
      return [z];
    },
    [`${fp}_square`]([x]: Field): Field {
      return [Field.square(x)];
    },
    [`${fp}_is_square`]([x]: Field): MlBool {
      return toMlBool(Field.isSquare(x));
    },
    [`${fp}_sqrt`]([x]: Field): MlOption<Field> {
      return toMlOption(Field.sqrt(x));
    },
    [`${fp}_equal`]([x]: Field, [y]: Field): MlBool {
      return toMlBool(Field.equal(x, y));
    },
    [`${fp}_compare`](x: Field, y: Field): 1 | 0 | -1 {
      return Bigint256.caml_bigint_256_compare(x, y);
    },
    [`${fp}_random`](): Field {
      return [Field.random()];
    },
    [`${fp}_of_int`](x: number): Field {
      return [Field.fromNumber(x)];
    },
    [`${fp}_of_bigint`](x: Bigint256): Field {
      return x;
    },
    [`${fp}_to_bigint`](x: Field): Bigint256 {
      return x;
    },
    [`${fp}_to_string`]([x]: Field): MlBytes {
      return toMlStringAscii(x.toString());
    },
    [`${fp}_of_string`](s: MlBytes): Field {
      return [Field.fromBigint(BigInt(fromMlString(s)))];
    },
    [`${fp}_size`](): Bigint256 {
      return [Field.modulus];
    },
    [`${fp}_size_in_bits`](): number {
      return Field.sizeInBits;
    },
    [`${fp}_copy`](x: Field, [y]: Field): void {
      x[0] = y;
    },
    [`${fp}_print`](x: Field): void {
      console.log(x[0].toString());
    },
    [`${fp}_mut_add`](x: Field, [y]: Field): void {
      x[0] = Field.add(x[0], y);
    },
    [`${fp}_mut_sub`](x: Field, [y]: Field): void {
      x[0] = Field.sub(x[0], y);
    },
    [`${fp}_mut_mul`](x: Field, [y]: Field): void {
      x[0] = Field.mul(x[0], y);
    },
    [`${fp}_mut_square`](x: Field): void {
      x[0] = Field.square(x[0]);
    },
    [`${fp}_domain_generator`](i: number): Field {
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
}

type MlBool = 0 | 1;
type MlOption<T> = 0 | [0, T];

function toMlOption<T>(x: undefined | T): MlOption<[T]> {
  if (x === undefined) return 0; // None
  return [0, [x]]; // Some(x)
}

function toMlBool(x: boolean): MlBool {
  return x ? 1 : 0;
}
