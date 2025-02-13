import {
  Bool,
  Provable,
  Int64,
  Struct,
  Field,
  PrivateKey,
  PublicKey,
} from 'o1js';

describe('Provable', () => {
  it('Provable.if out of snark', () => {
    let x = Provable.if(Bool(false), Int64, Int64.from(-1), Int64.from(-2));
    expect(x.toString()).toBe('-2');
  });

  it('Provable.if in snark', async () => {
    await Provable.runAndCheck(() => {
      let x = Provable.witness(Int64, () => Int64.from(-1));
      let y = Provable.witness(Int64, () => Int64.from(-2));
      let b = Provable.witness(Bool, () => Bool(true));

      let z = Provable.if(b, Int64, x, y);

      Provable.assertEqual(z, Int64.from(-1));
      Provable.asProver(() => {
        expect(z.toString()).toBe('-1');
      });

      z = Provable.if(b, Int64, Int64.from(99), y);

      Provable.assertEqual(z, Int64.from(99));
      Provable.asProver(() => {
        expect(z.toString()).toBe('99');
      });

      z = Provable.if(b.not(), Int64, Int64.from(99), y);

      Provable.assertEqual(z, Int64.from(-2));
      Provable.asProver(() => {
        expect(z.toString()).toBe('-2');
      });

      z = Provable.if(Bool(false), Int64, x, y);

      Provable.assertEqual(z, Int64.from(-2));
      Provable.asProver(() => {
        expect(z.toString()).toBe('-2');
      });
    });
  });

  it('Provable.switch picks the right value', () => {
    const x = Provable.switch([Bool(false), Bool(true), Bool(false)], Int64, [
      Int64.from(-1),
      Int64.from(-2),
      Int64.from(-3),
    ]);
    expect(x.toString()).toBe('-2');
  });

  it('Provable.switch returns 0 if the mask has only false elements', () => {
    const x = Provable.switch([Bool(false), Bool(false), Bool(false)], Int64, [
      Int64.from(-1),
      Int64.from(-2),
      Int64.from(-3),
    ]);
    expect(x.toString()).toBe('0');
  });

  it('Provable.switch throws when mask has >1 true elements', () => {
    expect(() =>
      Provable.switch([Bool(true), Bool(true), Bool(false)], Int64, [
        Int64.from(-1),
        Int64.from(-2),
        Int64.from(-3),
      ])
    ).toThrow(/`mask` must have 0 or 1 true element, found 2/);
  });

  it('Provable.assertEqual', async () => {
    const FieldAndBool = Struct({ x: Field, b: Bool });

    await Provable.runAndCheck(() => {
      let x = Provable.witness(Field, () => Field(1));
      let b = Provable.witness(Bool, () => Bool(true));

      // positive
      Provable.assertEqual(b, Bool(true));
      Provable.assertEqual(
        FieldAndBool,
        { x, b },
        { x: Field(1), b: Bool(true) }
      );

      //negative
      expect(() => Provable.assertEqual(b, Bool(false))).toThrow();
      expect(() =>
        Provable.assertEqual(
          FieldAndBool,
          { x, b },
          { x: Field(5), b: Bool(true) }
        )
      ).toThrow();
      expect(() => Provable.assertEqual(b, PrivateKey.random() as any)).toThrow(
        'must contain the same number of field elements'
      );
    });
  });

  it('Provable.equal', async () => {
    const FieldAndBool = Struct({ x: Field, b: Bool });
    let pk1 = PublicKey.fromBase58(
      'B62qoCHJ1dcGjKhdMTMuAytzRkLxRFUgq6YC5XSgmmxAt8r7FVi1DhT'
    );
    let pk2 = PublicKey.fromBase58(
      'B62qnDjh7J27q6CoG6hkQzP6J6t1USA6bCoKsBFhxNughNHQgVwEtT9'
    );

    function expectBoolean(b: Bool, expected: boolean) {
      Provable.asProver(() => {
        expect(b.toBoolean()).toEqual(expected);
      });
    }

    await Provable.runAndCheck(() => {
      let x = Provable.witness(Field, () => Field(1));
      let b = Provable.witness(Bool, () => Bool(true));
      let pk = Provable.witness(PublicKey, () => pk1);

      expectBoolean(Provable.equal(PublicKey, pk, pk1), true);
      expectBoolean(
        Provable.equal(FieldAndBool, { x, b }, { x: Field(1), b: Bool(true) }),
        true
      );

      expectBoolean(Provable.equal(PublicKey, pk, pk2), false);
      expectBoolean(
        Provable.equal(FieldAndBool, { x, b }, { x: Field(1), b: Bool(false) }),
        false
      );
    });
  });

  it('can serialize Struct with array', async () => {
    class MyStruct extends Struct({
      values: Provable.Array(Field, 2),
    }) {}

    const original = new MyStruct({ values: [Field(0), Field(1)] });

    const serialized = MyStruct.toJSON(original);
    const reconstructed = MyStruct.fromJSON(serialized);

    Provable.assertEqual<MyStruct>(MyStruct, original, reconstructed);
  });

  it('can serialize nested Struct', async () => {
    class OtherStruct extends Struct({
      x: Field,
    }) {
      toString() {
        return `other-struct:${this.x}`;
      }
    }

    class MyStruct extends Struct({
      a: Field,
      b: PrivateKey,
      y: OtherStruct,
    }) {
      toString() {
        return `my-struct:${this.a};${this.b.toBase58()};${this.y}`;
      }
    }

    const original = new MyStruct({
      a: Field(42),
      b: PrivateKey.random(),
      y: new OtherStruct({ x: Field(99) }),
    });

    const serialized = MyStruct.toJSON(original);
    const reconstructed = MyStruct.fromJSON(serialized);

    Provable.assertEqual(MyStruct, original, reconstructed);
    expect(reconstructed.toString()).toEqual(original.toString());
  });
});
