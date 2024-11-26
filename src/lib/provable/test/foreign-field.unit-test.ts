import { Field } from '../wrapped.js';
import { AlmostForeignField, createForeignField } from '../foreign-field.js';
import { Fq } from '../../../bindings/crypto/finite-field.js';
import { expect } from 'expect';
import {
  bool,
  equivalentProvable as equivalent,
  first,
  spec,
  throwError,
  unit,
} from '../../testing/equivalent.js';
import { test, Random } from '../../testing/property.js';
import { l } from '../gadgets/range-check.js';
import { ProvablePure } from '../types/provable-intf.js';

// toy example - F_17

class SmallField extends createForeignField(17n) {}

let x = SmallField.from(16);
x.assertEquals(-1); // 16 = -1 (mod 17)
x.mul(x).assertEquals(1); // 16 * 16 = 15 * 17 + 1 = 1 (mod 17)

// invalid example - modulus too large

expect(() => createForeignField(1n << 260n)).toThrow(
  'modulus exceeds the max supported size'
);

// real example - foreign field arithmetic in the Pallas scalar field

class ForeignScalar extends createForeignField(Fq.modulus) {}

// types
ForeignScalar.provable satisfies ProvablePure<ForeignScalar>;

// basic constructor / IO
{
  let s0 = 1n + ((1n + (1n << l)) << l);
  let scalar = new ForeignScalar(s0);

  expect(scalar.value).toEqual([Field(1), Field(1), Field(1)]);
  expect(scalar.toBigInt()).toEqual(s0);
}

test(Random.scalar, (x0, assert) => {
  let x = new ForeignScalar(x0);
  assert(x.toBigInt() === x0);
  assert(x.isConstant());
});

// test equivalence of in-SNARK and out-of-SNARK operations

let f = spec({
  rng: Random.scalar,
  there: ForeignScalar.from,
  back: (x: AlmostForeignField) => x.toBigInt(),
  provable: ForeignScalar.AlmostReduced.provable,
});
let u264 = spec({
  rng: Random.bignat(1n << 264n),
  there: ForeignScalar.from,
  back: (x: ForeignScalar) => x.toBigInt(),
  provable: ForeignScalar.Unreduced.provable,
});

// arithmetic
equivalent({ from: [f, f], to: u264 })(Fq.add, (x, y) => x.add(y));
equivalent({ from: [f, f], to: u264 })(Fq.sub, (x, y) => x.sub(y));
equivalent({ from: [f], to: u264 })(Fq.negate, (x) => x.neg());
equivalent({ from: [f, f], to: u264 })(Fq.mul, (x, y) => x.mul(y));
equivalent({ from: [f], to: f })(
  (x) => Fq.inverse(x) ?? throwError('division by 0'),
  (x) => x.inv()
);
equivalent({ from: [f, f], to: f })(
  (x, y) => Fq.div(x, y) ?? throwError('division by 0'),
  (x, y) => x.div(y)
);

// equality with a constant
equivalent({ from: [f, first(f)], to: bool })(
  (x, y) => x === y,
  (x, y) => x.equals(y)
);
equivalent({ from: [f, f], to: unit })(
  (x, y) => x === y || throwError('not equal'),
  (x, y) => x.assertEquals(y)
);
equivalent({ from: [f, first(u264)], to: unit })(
  (x, y) => x < y || throwError('not less than'),
  (x, y) => x.assertLessThan(y)
);

// toBits / fromBits
equivalent({ from: [f], to: f })(
  (x) => x,
  (x) => {
    let bits = x.toBits();
    expect(bits.length).toEqual(255);
    return ForeignScalar.fromBits(bits);
  }
);
