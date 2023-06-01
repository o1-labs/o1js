import { Scalar, withMessage } from './core.js';
import { Field, FieldVar, isField } from './field.js';
import { Bool, Snarky } from '../snarky.js';
import { Field as Fp } from '../provable/field-bigint.js';
import { Pallas } from '../bindings/crypto/elliptic_curve.js';

export { Group as NewGroup };

/**
 * An element of a Group
 */
class Group {
  x: Field;
  y: Field;

  /**
   * The generator `g` of the Group.
   */
  static get generator() {
    return new Group({
      x: Pallas.one.x,
      y: Pallas.one.y,
    });
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

    /*
    technically elements are only group elements if they are on the curve (aka for two points y, x the following equation must hold y^2 = x^3 + 5 over our field)
    but we never checked that in the original implementation


    const { add, mul, sqrt, square } = Fp;

    let onCurve = add(mul(xx, mul(xx, xx)), Pallas.b) === square(yy);
    if (!onCurve) {
      throw Error(`${{ xx, yy }} is not a valid group element`);
    }
    */
  }

  // helpers
  static #toTuple(g: Group): [0, FieldVar, FieldVar] {
    return [0, g.x.value, g.y.value];
  }

  static #fromAffine({ x, y }: { x: bigint; y: bigint; infinity: boolean }) {
    return new Group({ x, y });
  }

  #isConstant() {
    return this.x.isConstant() && this.y.isConstant();
  }

  /**
   * Return a {@link Bool} if the Group element is on the Pallas curve.
   * It checks that the Weierstrass equation `y^2 = x^3 + 5` is satisfied.
   */
  onCurve() {
    if (this.x.isConstant() && this.y.isConstant()) {
      const { add, mul, square } = Fp;
      let y = this.y.toBigInt();
      let x = this.x.toBigInt();
      return Bool(add(mul(x, mul(x, x)), Pallas.b) === square(y));
    } else {
      let y = this.y;
      let x = this.x;

      // x^3 + 5 === y^2
      let x3 = x.square().mul(x);
      return x3.add(Pallas.b).equals(y.square());
    }
  }

  /**
   * Adds this {@link Group} element to another {@link Group} element.
   *
   * ```ts
   * let g1 = Group({ x: 1, y: 1})
   * let g2 = g1.add(g1)
   * ```
   */
  add(g: Group) {
    let { x: x1, y: y1 } = this;
    let { x: x2, y: y2 } = g;

    if ([x1, y1, x2, y2].every((e) => e.isConstant())) {
      if (x1.toBigInt() === 0n) {
        return g;
      } else if (x2.toBigInt() === 0n) {
        return this;
      } else {
        let g_proj = Pallas.add(
          Pallas.fromAffine({
            x: x1.toBigInt(),
            y: y1.toBigInt(),
            infinity: false,
          }),
          Pallas.fromAffine({
            x: x2.toBigInt(),
            y: y2.toBigInt(),
            infinity: false,
          })
        );

        return Group.#fromAffine(Pallas.toAffine(g_proj));
      }
    } else {
      let [, x, y] = Snarky.group.add(Group.#toTuple(this), Group.#toTuple(g));
      return new Group({
        x,
        y,
      });
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
    return new Group({
      x,
      y: y.neg(),
    });
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
    let scalar = s instanceof Scalar ? s : Scalar.fromBigInt(BigInt(s));
    let fields = scalar.toFields();

    if (
      this.x.isConstant() &&
      this.y.isConstant() &&
      fields.every((f) => f.isConstant())
    ) {
      let { x, y } = this;

      let g_proj = Pallas.scale(
        Pallas.fromAffine({
          x: x.toBigInt(),
          y: y.toBigInt(),
          infinity: x.toBigInt() === 1n && y.toBigInt() === 1n,
        }),
        BigInt(scalar.toJSON())
      );
      return Group.#fromAffine(Pallas.toAffine(g_proj));
    } else {
      let [, x, y] = Snarky.group.scale(Group.#toTuple(this), [
        0,
        ...fields.map((f) => f.value).reverse(),
      ]);
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
    let { x: x1, y: y1 } = this;
    let { x: x2, y: y2 } = g;

    if (this.#isConstant() && g.#isConstant()) {
      /*
    let equal_x = x1.equals(x2);
    let equal_y = y1.equals(y2);
    return equal_x.and(equal_y);*/

      let z = Snarky.group.equals(Group.#toTuple(this), Group.#toTuple(g));
      return Bool.Unsafe.ofField(new Field(z));
    } else {
      return Bool(x1.equals(x2).and(y1.equals(y2)));
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
   * Adds a {@link Group} element to another one.
   */
  static add(g1: Group, g2: Group) {
    return g1.add(g2);
  }

  /**
   * Subtracts a {@link Group} element from another one.
   */
  static sub(g1: Group, g2: Group) {
    return g1.sub(g2);
  }

  /**
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
  static toAuxiliary() {
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
    console.log('its running check');
    try {
      Snarky.group.onCurve(Group.#toTuple(g));
    } catch (err) {
      throw withMessage(
        err,
        `Element (x: ${g.x}, y: ${g.y}) is not an element of the group.`
      );
    }
  }

  /**
   * Return a {@link Bool} if a Group element is on the Pallas curve.
   * It checks that the Weierstrass equation `y^2 = x^3 + 5` is satisfied.
   */
  static onCurve(g: Group) {
    return g.onCurve();
  }
}
