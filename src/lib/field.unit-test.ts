import { ProvablePure } from '../snarky.js';
import { Field } from './core.js';
import { Field as Fp } from '../provable/field-bigint.js';
import { test, Random } from './testing/property.js';
import { deepEqual } from 'node:assert/strict';
import { Provable } from './provable.js';
import { Binable } from '../bindings/lib/binable.js';
import { ProvableExtended } from './circuit_value.js';
import { throws } from 'node:assert';
import { FieldType } from './field.js';

// types
Field satisfies Provable<Field>;
Field satisfies ProvablePure<Field>;
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

// constant arithmetic
equivalent2((x, y) => x.add(y), Fp.add);
equivalent1((x) => x.neg(), Fp.negate);
equivalent2((x, y) => x.sub(y), Fp.sub);
equivalent2((x, y) => x.mul(y), Fp.mul);
equivalent1(
  (x) => x.inv(),
  (x) => Fp.inverse(x) ?? throwError('division by 0')
);
equivalent2(
  (x, y) => x.div(y),
  (x, y) => Fp.div(x, y) ?? throwError('division by 0')
);
equivalent1((x) => x.square(), Fp.square);
equivalent1(
  (x) => x.sqrt(),
  (x) => Fp.sqrt(x) ?? throwError('no sqrt')
);
equivalent2(
  (x, y) => x.equals(y).toField(),
  (x, y) => BigInt(x === y)
);
equivalent2(
  (x, y) => x.lessThan(y).toField(),
  (x, y) => BigInt(x < y)
);
equivalent2(
  (x, y) => x.lessThanOrEqual(y).toField(),
  (x, y) => BigInt(x <= y)
);
equivalentVoid2(
  (x, y) => x.assertEquals(y),
  (x, y) => x === y || throwError('not equal')
);
equivalentVoid2(
  (x, y) => x.assertNotEquals(y),
  (x, y) => x !== y || throwError('equal')
);
equivalentVoid2(
  (x, y) => x.assertLessThan(y),
  (x, y) => x < y || throwError('not less than')
);
equivalentVoid2(
  (x, y) => x.assertLessThanOrEqual(y),
  (x, y) => x <= y || throwError('not less than')
);
equivalentVoid1(
  (x) => x.assertBool(),
  (x) => x === 0n || x === 1n || throwError('not boolean')
);

// non-constant field vars
test(Random.field, (x0, assert) => {
  Provable.runAndCheck(() => {
    // Var
    let x = Provable.witness(Field, () => Field(x0));
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
  Provable.runAndCheck(() => {
    // equals
    let x = Provable.witness(Field, () => Field(x0));
    let y = Provable.witness(Field, () => Field(y0));

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
    let bits = Fp.toBits(x0);
    let x1 = Provable.witness(Field, () => Field.fromBits(bits));
    let bitsVars = x1.toBits();
    Provable.asProver(() =>
      assert(bitsVars.every((b, i) => b.toBoolean() === bits[i]))
    );

    // assertGreater / Less
    let isGreater = x0 > y0;
    if (isGreater) x.assertGreaterThan(y);
    else x.assertLessThanOrEqual(y);
  });
});

// helpers

function equivalent1(op1: (x: Field) => Field, op2: (x: bigint) => bigint) {
  test(Random.field, (x0, assert) => {
    let x = Field(x0);
    handleErrors(
      () => op1(x),
      () => op2(x0),
      (a, b) => assert(a.toBigInt() === b, 'equal results')
    );
  });
}
function equivalent2(
  op1: (x: Field, y: Field | bigint) => Field,
  op2: (x: bigint, y: bigint) => bigint
) {
  test(Random.field, Random.field, (x0, y0, assert) => {
    let x = Field(x0);
    let y = Field(y0);
    handleErrors(
      () => op1(x, y),
      () => op2(x0, y0),
      (a, b) => assert(a.toBigInt() === b, 'equal results')
    );
    handleErrors(
      () => op1(x, y0),
      () => op2(x0, y0),
      (a, b) => assert(a.toBigInt() === b, 'equal results')
    );
  });
}
function equivalentVoid1(op1: (x: Field) => void, op2: (x: bigint) => void) {
  test(Random.field, (x0) => {
    let x = Field(x0);
    handleErrors(
      () => op1(x),
      () => op2(x0)
    );
  });
}
function equivalentVoid2(
  op1: (x: Field, y: Field | bigint) => void,
  op2: (x: bigint, y: bigint) => void
) {
  test(Random.field, Random.field, (x0, y0) => {
    let x = Field(x0);
    let y = Field(y0);
    handleErrors(
      () => op1(x, y),
      () => op2(x0, y0)
    );
    handleErrors(
      () => op1(x, y0),
      () => op2(x0, y0)
    );
  });
}

function handleErrors<T, S, R>(
  op1: () => T,
  op2: () => S,
  useResults?: (a: T, b: S) => R
): R | undefined {
  let result1: T, result2: S;
  let hadError1: Error | undefined;
  let hadError2: Error | undefined;
  try {
    result1 = op1();
  } catch (err) {
    hadError1 = err as Error;
  }
  try {
    result2 = op2();
  } catch (err) {
    hadError2 = err as Error;
  }
  deepEqual(!!hadError1, !!hadError2, 'equivalent errors');
  if (!(hadError1 || hadError2) && useResults !== undefined) {
    return useResults(result1!, result2!);
  }
}

function throwError(message?: string): any {
  throw Error(message);
}
