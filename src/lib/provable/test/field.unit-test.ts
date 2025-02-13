import { Field } from '../wrapped.js';
import { Fp } from '../../../bindings/crypto/finite-field.js';
import { BinableFp } from '../../../mina-signer/src/field-bigint.js';
import { test, Random } from '../../testing/property.js';
import { deepEqual, throws } from 'node:assert/strict';
import { Provable } from '../provable.js';
import { Binable } from '../../../bindings/lib/binable.js';
import { ProvableExtended } from '../types/struct.js';
import { FieldType } from '../core/fieldvar.js';
import {
  equivalentProvable as equivalent,
  oneOf,
  field,
  bigintField,
  throwError,
  unit,
  bool,
} from '../../testing/equivalent.js';
import { synchronousRunners } from '../core/provable-context.js';
import { ProvablePure } from '../types/provable-intf.js';
import { assert } from '../../util/assert.js';

let { runAndCheckSync } = await synchronousRunners();

// types
Field satisfies Provable<Field, bigint>;
Field satisfies ProvablePure<Field, bigint>;
Field satisfies ProvableExtended<Field>;
Field satisfies Binable<Field>;

// constructor
test(Random.field, Random.json.field, (x, y, assert) => {
  let z = Field(x);
  assert(z instanceof Field);
  assert(z.toBigInt() === x);
  assert(z.toString() === x.toString());
  assert(z.isConstant());
  deepEqual(z.toConstant(), z);

  assert((z = new Field(x)) instanceof Field && z.toBigInt() === x);
  assert((z = Field(z)) instanceof Field && z.toBigInt() === x);
  assert((z = Field(z.value)) instanceof Field && z.toBigInt() === x);

  z = Field(y);
  assert(z instanceof Field);
  assert(z.toString() === y);
  deepEqual(Field.fromJSON(y), z);
  assert(z.toJSON() === y);
});

// handles small numbers
test(Random.nat(1000), (n, assert) => {
  assert(Field(n).toString() === String(n));
});
// handles large numbers 2^31 <= x < 2^53
test(Random.int(2 ** 31, Number.MAX_SAFE_INTEGER), (n, assert) => {
  assert(Field(n).toString() === String(n));
});
// handles negative numbers
test(Random.uint32, (n) => {
  deepEqual(Field(-n), Field(n).neg());
});
// throws on fractional numbers
test.negative(Random.int(-10, 10), Random.fraction(1), (x, f) => {
  Field(x + f);
});
// correctly overflows the field
test(Random.field, Random.int(-5, 5), (x, k) => {
  deepEqual(Field(x + BigInt(k) * Field.ORDER), Field(x));
});

// Field | bigint parameter
let fieldOrBigint = oneOf(field, bigintField);

// arithmetic, both in- and outside provable code
let equivalent1 = equivalent({ from: [field], to: field });
let equivalent2 = equivalent({ from: [field, fieldOrBigint], to: field });

equivalent2(Fp.add, (x, y) => x.add(y));
equivalent1(Fp.negate, (x) => x.neg());
equivalent2(Fp.sub, (x, y) => x.sub(y));
equivalent2(Fp.mul, (x, y) => x.mul(y));
equivalent1(
  (x) => Fp.inverse(x) ?? throwError('division by 0'),
  (x) => x.inv()
);
equivalent2(
  (x, y) => Fp.div(x, y) ?? throwError('division by 0'),
  (x, y) => x.div(y)
);
equivalent1(Fp.square, (x) => x.square());
equivalent1(
  (x) => Fp.sqrt(x) ?? throwError('no sqrt'),
  (x) => x.sqrt()
);
equivalent({ from: [field, fieldOrBigint], to: bool })(
  (x, y) => x === y,
  (x, y) => x.equals(y)
);

equivalent({ from: [field, fieldOrBigint], to: bool })(
  (x, y) => x < y,
  (x, y) => x.lessThan(y)
);
equivalent({ from: [field, fieldOrBigint], to: bool })(
  (x, y) => x <= y,
  (x, y) => x.lessThanOrEqual(y)
);
equivalent({ from: [field, fieldOrBigint], to: unit })(
  (x, y) => x === y || throwError('not equal'),
  (x, y) => x.assertEquals(y)
);
equivalent({ from: [field, fieldOrBigint], to: unit })(
  (x, y) => x !== y || throwError('equal'),
  (x, y) => x.assertNotEquals(y)
);
equivalent({ from: [field, fieldOrBigint], to: unit })(
  (x, y) => x < y || throwError('not less than'),
  (x, y) => x.assertLessThan(y)
);
equivalent({ from: [field, fieldOrBigint], to: unit })(
  (x, y) => x <= y || throwError('not less than or equal'),
  (x, y) => x.assertLessThanOrEqual(y)
);
equivalent({ from: [field], to: bool })(
  (x) => {
    assert(x === 0n || x === 1n, 'not boolean');
    return x === 1n;
  },
  (x) => x.assertBool()
);
equivalent({ from: [field], to: unit })(
  (x) => x === 0n || x === 1n || throwError('not boolean'),
  (x) => {
    let y = Provable.witness(Field, () => x.div(2));
    y.mul(2).assertBool();
  }
);
equivalent({ from: [field], to: bool })(
  (x) => (x & 1n) === 0n,
  (x) => x.isEven()
);

// non-constant field vars
test(Random.field, (x0, assert) => {
  runAndCheckSync(() => {
    // Var
    let x = Provable.witness(Field, () => x0);
    assert(x.value[0] === FieldType.Var);
    assert(typeof x.value[1] === 'number');
    throws(() => x.toConstant());
    throws(() => x.toBigInt());
    Provable.asProver(() => assert(x.toBigInt() === x0));

    // Scale
    let z = x.mul(2);
    assert(z.value[0] === FieldType.Scale);
    throws(() => x.toConstant());

    // Add
    let u = z.add(x);
    assert(u.value[0] === FieldType.Add);
    throws(() => x.toConstant());
    Provable.asProver(() => assert(u.toBigInt() === Fp.mul(x0, 3n)));

    // seal
    let v = u.seal();
    assert(v.value[0] === FieldType.Var);
    Provable.asProver(() => assert(v.toBigInt() === Fp.mul(x0, 3n)));

    // Provable.witness / assertEquals / assertNotEquals
    let w0 = Provable.witness(Field, () => v.mul(5).add(1));
    let w1 = x.mul(15).add(1);
    w0.assertEquals(w1);
    throws(() => w0.assertNotEquals(w1));

    let w2 = Provable.witness(Field, () => w0.add(1));
    w0.assertNotEquals(w2);
    throws(() => w0.assertEquals(w2));
  });
});

// some provable operations
test(Random.field, Random.field, (x0, y0, assert) => {
  runAndCheckSync(() => {
    // equals
    let x = Provable.witness(Field, () => x0);
    let y = Provable.witness(Field, () => y0);

    let b = x.equals(y);
    b.assertEquals(x0 === y0);
    Provable.asProver(() => assert(b.toBoolean() === (x0 === y0)));

    let c = x.equals(x0);
    c.assertEquals(true);
    Provable.asProver(() => assert(c.toBoolean()));

    // mul
    let z = x.mul(y);
    Provable.asProver(() => assert(z.toBigInt() === Fp.mul(x0, y0)));

    // toBits / fromBits
    // BinableFp.toBits() returns 255 bits, but our new to/from impl only accepts <=254
    // https://github.com/o1-labs/o1js/pull/1461
    let bits = BinableFp.toBits(x0).slice(0, -1);
    let x1 = Provable.witness(Field, () => Field.fromBits(bits));
    let bitsVars = x1.toBits();
    Provable.asProver(() => assert(bitsVars.every((b, i) => b.toBoolean() === bits[i])));
  });
});
