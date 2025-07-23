import { Field } from '../wrapped.js';
import { AlmostForeignField, createForeignField } from '../foreign-field.js';
import { Fq } from '../../../bindings/crypto/finite-field.js';
import { expect } from 'expect';
import {
  bool,
  equivalentProvable as equivalent,
  field,
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

expect(() => createForeignField(1n << 260n)).toThrow('modulus exceeds the max supported size');

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

// Field to ForeignField conversion tests

console.log('Testing Field to ForeignField conversion...');

// Test 1: Constant Field conversion
{
  let field = Field(123);
  let foreignField = ForeignScalar.from(field);
  expect(foreignField.toBigInt()).toBe(123n);
  expect(foreignField.isConstant()).toBe(true);
  console.log('✓ Constant Field conversion');
}

// Test 2: Constructor with Field
{
  let field = Field(456);
  let foreignField = new ForeignScalar(field);
  expect(foreignField.toBigInt()).toBe(456n);
  expect(foreignField.isConstant()).toBe(true);
  console.log('✓ Constructor with Field');
}

// Test 3: Boundary values
{
  // Test zero
  let zero = ForeignScalar.from(Field(0));
  expect(zero.toBigInt()).toBe(0n);

  // Test large valid value within native Field range
  // Use a large value that fits in native Field (~2^254) rather than foreign field modulus (~2^259)
  let largeValue = (1n << 200n) - 1n; // Safe value within native Field range
  let large = Field(largeValue);
  let foreignLarge = ForeignScalar.from(large);
  expect(foreignLarge.toBigInt()).toBe(largeValue);
  console.log('✓ Boundary values');
}

// Test 4: Small field modulus overflow error
{
  // Using SmallField (modulus 17) to easily test overflow
  expect(() => {
    SmallField.from(Field(18)); // 18 > 17 (modulus)
  }).toThrow('exceeds foreign field modulus');
  console.log('✓ Modulus overflow error');
}

// Test 5: Round-trip conversion
{
  let original = Field(12345);
  let foreign = ForeignScalar.from(original);
  let reconstructed = Field(foreign.toBigInt());
  expect(reconstructed.toBigInt()).toBe(original.toBigInt());
  console.log('✓ Round-trip conversion');
}

// Test 6: Variable Field conversion in provable context
equivalent({
  from: [field],
  to: f,
})(
  (x) => x,
  (field) => ForeignScalar.from(field)
);

console.log('✓ All Field conversion tests passed!');
