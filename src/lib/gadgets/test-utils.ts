import type { FiniteField } from '../../bindings/crypto/finite_field.js';
import { ProvableSpec, spec } from '../testing/equivalent.js';
import { Random } from '../testing/random.js';
import { Gadgets } from './gadgets.js';
import { assert } from './common.js';
import { Bytes } from '../provable-types/provable-types.js';

export {
  foreignField,
  unreducedForeignField,
  uniformForeignField,
  bytes,
  throwError,
};

const { Field3 } = Gadgets;

// test input specs

function foreignField(F: FiniteField): ProvableSpec<bigint, Gadgets.Field3> {
  return {
    rng: Random.otherField(F),
    there: Field3.from,
    back: Field3.toBigint,
    provable: Field3.provable,
  };
}

// for testing with inputs > f
function unreducedForeignField(
  maxBits: number,
  F: FiniteField
): ProvableSpec<bigint, Gadgets.Field3> {
  return {
    rng: Random.bignat(1n << BigInt(maxBits)),
    there: Field3.from,
    back: Field3.toBigint,
    provable: Field3.provable,
    assertEqual(x, y, message) {
      // need weak equality here because, while ffadd works on bigints larger than the modulus,
      // it can't fully reduce them
      assert(F.equal(x, y), message);
    },
  };
}

// for fields that must follow an unbiased distribution, like private keys
function uniformForeignField(
  F: FiniteField
): ProvableSpec<bigint, Gadgets.Field3> {
  return {
    rng: Random(F.random),
    there: Field3.from,
    back: Field3.toBigint,
    provable: Field3.provable,
  };
}

function bytes(length: number) {
  const Bytes_ = Bytes(length);
  return spec<Uint8Array, Bytes>({
    rng: Random.map(Random.bytes(length), (x) => Uint8Array.from(x)),
    there: Bytes_.from,
    back: (x) => x.toBytes(),
    provable: Bytes_.provable,
  });
}

// helper

function throwError<T>(message: string): T {
  throw Error(message);
}
