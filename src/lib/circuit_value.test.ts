import {
  Bool,
  Circuit,
  Provable,
  isReady,
  shutdown,
  Int64,
  Struct,
  Field,
  PrivateKey,
} from 'snarkyjs';

describe('circuit', () => {
  beforeAll(() => isReady);
  afterAll(() => setTimeout(shutdown, 0));

  it('Circuit.switch picks the right value', () => {
    const x = Circuit.switch([Bool(false), Bool(true), Bool(false)], Int64, [
      Int64.from(-1),
      Int64.from(-2),
      Int64.from(-3),
    ]);
    expect(x.toString()).toBe('-2');
  });

  it('Circuit.switch returns 0 if the mask has only false elements', () => {
    const x = Circuit.switch([Bool(false), Bool(false), Bool(false)], Int64, [
      Int64.from(-1),
      Int64.from(-2),
      Int64.from(-3),
    ]);
    expect(x.toString()).toBe('0');
  });

  it('Circuit.switch throws when mask has >1 true elements', () => {
    expect(() =>
      Circuit.switch([Bool(true), Bool(true), Bool(false)], Int64, [
        Int64.from(-1),
        Int64.from(-2),
        Int64.from(-3),
      ])
    ).toThrow(/`mask` must have 0 or 1 true element, found 2/);
  });

  it('Provable.assertEqual', () => {
    const FieldAndBool = Struct({ x: Field, b: Bool });

    Provable.runAndCheck(() => {
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

  it('can serialize Struct with array', async () => {
    class MyStruct extends Struct({
      values: Provable.array(Field, 2),
    }) {}

    const original = new MyStruct({ values: [Field(0), Field(1)] });

    const serialized = MyStruct.toJSON(original);
    const reconstructed = MyStruct.fromJSON(serialized);

    Circuit.assertEqual<MyStruct>(MyStruct, original, reconstructed);
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

    Circuit.assertEqual(MyStruct, original, reconstructed);
    expect(reconstructed.toString()).toEqual(original.toString());
  });
});
