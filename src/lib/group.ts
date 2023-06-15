import { Field, FieldVar, isField } from './field.js';
import { Scalar } from './scalar.js';
import { Snarky } from '../snarky.js';
import { Field as Fp } from '../provable/field-bigint.js';
import { Pallas } from '../bindings/crypto/elliptic_curve.js';
import { Bool } from './bool.js';

export { Group };

/**
 * An element of a Group.
 */
class Group {
  x: Field;
  y: Field;

  /**
   * The generator `g` of the Group.
   */
  static get generator() {
    return new Group({ x: Pallas.one.x, y: Pallas.one.y });
  }

  /**
   * Coerces anything group-like to a {@link Group}.
   */
  constructor({
    x,
    y,
  }: {
    x: FieldVar | Field | number | string | bigint;
    y: FieldVar | Field | number | string | bigint;
  }) {
    this.x = isField(x) ? x : new Field(x);
    this.y = isField(y) ? y : new Field(y);

    if (this.#isConstant()) {
      const { add, mul, square } = Fp;

      let x_bigint = this.x.toBigInt();
      let y_bigint = this.y.toBigInt();

      let onCurve =
        add(mul(x_bigint, mul(x_bigint, x_bigint)), Pallas.b) ===
        square(y_bigint);

      if (!onCurve) {
        throw Error(
          `(x: ${x_bigint}, y: ${y_bigint}) is not a valid group element`
        );
      }
    }
  }

  // helpers
  static #fromAffine({ x, y }: { x: bigint; y: bigint; infinity: boolean }) {
    return new Group({ x, y });
  }

  static #fromProjective({ x, y, z }: { x: bigint; y: bigint; z: bigint }) {
    return this.#fromAffine(Pallas.toAffine({ x, y, z }));
  }

  #toTuple(): [0, FieldVar, FieldVar] {
    return [0, this.x.value, this.y.value];
  }

  #isConstant() {
    return this.x.isConstant() && this.y.isConstant();
  }

  #toProjective() {
    return Pallas.fromAffine({
      x: this.x.toBigInt(),
      y: this.y.toBigInt(),
      infinity: false,
    });
  }

  /**
   * Adds this {@link Group} element to another {@link Group} element.
   *
   * ```ts
   * let g1 = Group({ x: -1, y: 2})
   * let g2 = g1.add(g1)
   * ```
   */
  add(g: Group) {
    if (this.#isConstant() && g.#isConstant()) {
      if (this.x.toBigInt() === 0n) {
        return g;
      } else if (g.x.toBigInt() === 0n) {
        return this;
      } else {
        let g_proj = Pallas.add(this.#toProjective(), g.#toProjective());
        return Group.#fromProjective(g_proj);
      }
    } else {
      let [, x, y] = Snarky.group.add(this.#toTuple(), g.#toTuple());
      return new Group({ x, y });
    }
  }

  /**
   * Subtracts another {@link Group} element from this one.
   */
  sub(y: Group) {
    return this.add(y.neg());
  }

  /**
   * Negates this {@link Group}. Under the hood, it simply negates the `y` coordinate and leaves the `x` coordinate as is.
   */
  neg() {
    let { x, y } = this;
    return new Group({ x, y: y.neg() });
  }

  /**
   * Elliptic curve scalar multiplication. Scales the {@link Group} element `n`-times by itself, where `n` is the {@link Scalar}.
   *
   * ```typescript
   * let s = Scalar(5);
   * let 5g = g.scale(s);
   * ```
   */
  scale(s: Scalar | number | bigint) {
    let scalar = Scalar.from(s);

    if (this.#isConstant() && scalar.isConstant()) {
      let g_proj = Pallas.scale(this.#toProjective(), scalar.toBigInt());
      return Group.#fromProjective(g_proj);
    } else {
      let [, ...bits] = scalar.value;
      bits.reverse();
      let [, x, y] = Snarky.group.scale(this.#toTuple(), [0, ...bits]);
      return new Group({ x, y });
    }
  }

  /**
   * Assert that this {@link Group} element equals another {@link Group} element.
   * Throws an error if the assertion fails.
   *
   * ```ts
   * g1.assertEquals(g2);
   * ```
   */
  assertEquals(g: Group, message?: string) {
    let { x: x1, y: y1 } = this;
    let { x: x2, y: y2 } = g;

    x1.assertEquals(x2, message);
    // y1.assertEquals(y2, message); need to enable this later on, but it breaks constraint backwards compatibility
  }

  /**
   * Check if this {@link Group} element equals another {@link Group} element.
   * Returns a {@link Bool}.
   *
   * ```ts
   * g1.equals(g1); // Bool(true)
   * ```
   */
  equals(g: Group) {
    if (this.#isConstant() && g.#isConstant()) {
      let { x: x1, y: y1 } = this;
      let { x: x2, y: y2 } = g;

      return x1.equals(x2).and(y1.equals(y2));
    } else {
      let z = Snarky.group.equals(this.#toTuple(), g.#toTuple());
      return Bool.Unsafe.ofField(new Field(z));
    }
  }

  /**
   * Serializes this {@link Group} element to a JSON object.
   *
   * This operation does NOT affect the circuit and can't be used to prove anything about the representation of the element.
   */
  toJSON(): {
    x: string;
    y: string;
  } {
    return {
      x: this.x.toString(),
      y: this.y.toString(),
    };
  }

  /**
   * Part of the {@link Provable} interface.
   *
   * Returns an array containing this {@link Group} element as an array of {@link Field} elements.
   */
  toFields() {
    return [this.x, this.y];
  }

  /**
   * Coerces two x and y coordinates into a {@link Group} element.
   */
  static from(
    x: FieldVar | Field | number | string | bigint,
    y: FieldVar | Field | number | string | bigint
  ) {
    return new Group({ x, y });
  }

  /**
   * @deprecated Please use the method `.add` on the instance instead
   *
   * Adds a {@link Group} element to another one.
   */
  static add(g1: Group, g2: Group) {
    return g1.add(g2);
  }

  /**
   * @deprecated Please use the method `.sub` on the instance instead
   *
   * Subtracts a {@link Group} element from another one.
   */
  static sub(g1: Group, g2: Group) {
    return g1.sub(g2);
  }

  /**
   * @deprecated Please use the method `.neg` on the instance instead
   *
   * Negates a {@link Group} element. Under the hood, it simply negates the `y` coordinate and leaves the `x` coordinate as is.
   *
   * ```typescript
   * let gNeg = Group.neg(g);
   * ```
   */
  static neg(g: Group) {
    return g.neg();
  }

  /**
   * @deprecated Please use the method `.scale` on the instance instead
   *
   * Elliptic curve scalar multiplication. Scales a {@link Group} element `n`-times by itself, where `n` is the {@link Scalar}.
   *
   * ```typescript
   * let s = Scalar(5);
   * let 5g = Group.scale(g, s);
   * ```
   */
  static scale(g: Group, s: Scalar) {
    return g.scale(s);
  }

  /**
   * @deprecated Please use the method `.assertEqual` on the instance instead.
   *
   * Assert that two {@link Group} elements are equal to another.
   * Throws an error if the assertion fails.
   *
   * ```ts
   * Group.assertEquals(g1, g2);
   * ```
   */
  static assertEqual(g1: Group, g2: Group) {
    g1.assertEquals(g2);
  }

  /**
   * @deprecated Please use the method `.equals` on the instance instead.
   *
   * Checks if a {@link Group} element is equal to another {@link Group} element.
   * Returns a {@link Bool}.
   *
   * ```ts
   * Group.equal(g1, g2); // Bool(true)
   * ```
   */
  static equal(g1: Group, g2: Group) {
    return g1.equals(g2);
  }

  /**
   * Part of the {@link Provable} interface.
   *
   * Returns an array containing a {@link Group} element as an array of {@link Field} elements.
   */
  static toFields(g: Group) {
    return g.toFields();
  }

  /**
   * Part of the {@link Provable} interface.
   *
   * Returns an empty array.
   */
  static toAuxiliary(g?: Group) {
    return [];
  }

  /**
   * Part of the {@link Provable} interface.
   *
   * Deserializes a {@link Group} element from a list of field elements.
   */
  static fromFields([x, y]: Field[]) {
    return new Group({ x, y });
  }

  /**
   * Part of the {@link Provable} interface.
   *
   * Returns 2.
   */
  static sizeInFields() {
    return 2;
  }

  /**
   * Serializes a {@link Group} element to a JSON object.
   *
   * This operation does NOT affect the circuit and can't be used to prove anything about the representation of the element.
   */
  static toJSON(g: Group) {
    return g.toJSON();
  }

  /**
   * Deserializes a JSON-like structure to a {@link Group} element.
   *
   * This operation does NOT affect the circuit and can't be used to prove anything about the representation of the element.
   */
  static fromJSON({
    x,
    y,
  }: {
    x: string | number | bigint | Field | FieldVar;
    y: string | number | bigint | Field | FieldVar;
  }) {
    return new Group({ x, y });
  }

  /**
   * Checks that a {@link Group} element is constraint properly by checking that the element is on the curve.
   */
  static check(g: Group) {
    try {
      Snarky.group.assertOnCurve(g.#toTuple());
    } catch (error) {
      if (!(error instanceof Error)) return error;
      throw `${`Element (x: ${g.x}, y: ${g.y}) is not an element of the group.`}\n${
        error.message
      }`;
    }
  }
}
