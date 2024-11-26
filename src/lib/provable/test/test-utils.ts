import type { FiniteField } from '../../../bindings/crypto/finite-field.js';
import { ProvableSpec, map, spec } from '../../testing/equivalent.js';
import { Random } from '../../testing/random.js';
import { Field3 } from '../gadgets/gadgets.js';
import { assert } from '../gadgets/common.js';
import { Bytes } from '../wrapped-classes.js';
import { CurveAffine } from '../../../bindings/crypto/elliptic-curve.js';
import { simpleMapToCurve } from '../gadgets/elliptic-curve.js';
import { provable } from '../types/provable-derivers.js';

export {
  foreignField,
  unreducedForeignField,
  uniformForeignField,
  bytes,
  pointSpec,
  throwError,
};

// test input specs

function foreignField(F: FiniteField): ProvableSpec<bigint, Field3> {
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
): ProvableSpec<bigint, Field3> {
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
function uniformForeignField(F: FiniteField): ProvableSpec<bigint, Field3> {
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

function pointSpec<T>(field: ProvableSpec<bigint, T>, Curve: CurveAffine) {
  // point but with independently random components, which will never form a valid point
  let pointShape = spec({
    rng: Random.record({ x: field.rng, y: field.rng }),
    there({ x, y }) {
      return { x: field.there(x), y: field.there(y) };
    },
    back({ x, y }) {
      return { x: field.back(x), y: field.back(y), infinity: false };
    },
    provable: provable({ x: field.provable, y: field.provable }),
  });

  // valid random point
  let point = map({ from: field, to: pointShape }, (x) =>
    simpleMapToCurve(x, Curve)
  );
  return point;
}

// helper

function throwError<T>(message: string): T {
  throw Error(message);
}
