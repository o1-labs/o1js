import { Field } from './field.js';
import { FieldVar } from './core/fieldvar.js';
import { Scalar } from './scalar.js';
import { Fp } from '../../bindings/crypto/finite-field.js';
import { GroupAffine, Pallas, PallasAffine } from '../../bindings/crypto/elliptic-curve.js';
import { Provable } from './provable.js';
import { Bool } from './bool.js';
import { assert } from '../util/assert.js';
import { add, scaleField, scaleShifted } from './gadgets/native-curve.js';

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
   * Unique representation of the `zero` element of the Group (the identity element of addition in this Group).
   *
   * **Note**: The `zero` element is represented as `(0, 0)`.
   *
   * ```typescript
   * // g + -g = 0
   * g.add(g.neg()).assertEquals(zero);
   * // g + 0 = g
   * g.add(zero).assertEquals(g);
   * ```
   */
  static get zero() {
    return new Group({ x: 0, y: 0 });
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
    this.x = x instanceof Field ? x : new Field(x);
    this.y = y instanceof Field ? y : new Field(y);

    if (isConstant(this)) {
      // we also check the zero element (0, 0) here
      if (this.x.equals(0).and(this.y.equals(0)).toBoolean()) return;

      const { add, mul, square } = Fp;

      let x_bigint = this.x.toBigInt();
      let y_bigint = this.y.toBigInt();

      let onCurve = add(mul(x_bigint, mul(x_bigint, x_bigint)), Pallas.b) === square(y_bigint);

      if (!onCurve) {
        throw Error(`(x: ${x_bigint}, y: ${y_bigint}) is not a valid group element`);
      }
    }
  }

  /**
   * Checks if this element is the `zero` element `{x: 0, y: 0}`.
   */
  isZero() {
    // only the zero element can have x = 0, there are no other (valid) group elements with x = 0
    return this.x.equals(0);
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
    if (isConstant(this) && isConstant(g)) {
      // we check if either operand is zero, because adding zero to g just results in g (and vise versa)
      if (this.isZero().toBoolean()) {
        return g;
      } else if (g.isZero().toBoolean()) {
        return this;
      } else {
        let g_proj = Pallas.add(toProjective(this), toProjective(g));
        return fromProjective(g_proj);
      }
    } else {
      let { result, isInfinity } = add(this, g);
      // similarly to the constant implementation, we check if either operand is zero
      // and the implementation above (original OCaml implementation) returns something wild -> g + 0 != g where it should be g + 0 = g
      let gIsZero = g.isZero();
      let onlyThisIsZero = this.isZero().and(gIsZero.not());
      let isNegation = isInfinity;
      let isNormalAddition = gIsZero.or(onlyThisIsZero).or(isNegation).not();

      // note: gIsZero and isNegation are not mutually exclusive, but if both are true, we add 1*0 + 1*0 = 0 which is correct
      return Provable.switch(
        [gIsZero, onlyThisIsZero, isNegation, isNormalAddition],
        Group,
        [this, g, Group.zero, new Group(result)],
        { allowNonExclusive: true }
      );
    }
  }

  /**
   * Lower-level variant of {@link add} which doesn't handle the case where one of the operands is zero, and
   * asserts that the output is non-zero.
   *
   * Optionally, zero outputs can be allowed by setting `allowZeroOutput` to `true`.
   *
   * **Warning**: If one of the inputs is zero, the result will be garbage and the proof useless.
   * This case has to be prevented or handled separately by the caller of this method.
   */
  addNonZero(g2: Group, allowZeroOutput = false): Group {
    if (isConstant(this) && isConstant(g2)) {
      let { x, y, infinity } = PallasAffine.add(toAffine(this), toAffine(g2));
      assert(!infinity || allowZeroOutput, 'Group.addNonzero(): Result is zero');
      return fromAffine({ x, y, infinity });
    }
    let { result, isInfinity } = add(this, g2);

    if (allowZeroOutput) {
      return Provable.if(isInfinity, Group.zero, new Group(result));
    } else {
      isInfinity.assertFalse('Group.addNonzero(): Result is zero');
      return new Group(result);
    }
  }

  /**
   * Subtracts another {@link Group} element from this one.
   */
  sub(g: Group) {
    return this.add(g.neg());
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
  scale(s: Scalar | Field | number | bigint) {
    if (s instanceof Field) return new Group(scaleField(this, s));
    let scalar = Scalar.from(s);

    if (isConstant(this) && scalar.isConstant()) {
      let g_proj = Pallas.scale(toProjective(this), scalar.toBigInt());
      return fromProjective(g_proj);
    } else {
      let result = scaleShifted(this, scalar);
      return new Group(result);
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
    y1.assertEquals(y2, message);
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

    return x1.equals(x2).and(y1.equals(y2));
  }

  static toValue({ x, y }: Group) {
    return { x: x.toBigInt(), y: y.toBigInt() };
  }

  static fromValue(g: { x: bigint | number | Field; y: bigint | number | Field } | Group) {
    return new Group(g);
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
      const { x, y } = g;

      let x2 = x.square();
      let x3 = x2.mul(x);
      let ax = x.mul(Pallas.a); // this will obviously be 0, but just for the sake of correctness

      // we also check the zero element (0, 0) here
      let isZero = x.equals(0).and(y.equals(0));

      isZero.or(x3.add(ax).add(Pallas.b).equals(y.square())).assertTrue();
    } catch (error) {
      if (!(error instanceof Error)) return error;
      throw `${`Element (x: ${g.x}, y: ${g.y}) is not an element of the group.`}\n${error.message}`;
    }
  }

  static toInput(x: Group) {
    return {
      fields: [x.x, x.y],
    };
  }

  static empty() {
    return Group.zero;
  }
}

// internal helpers

function isConstant(g: Group) {
  return g.x.isConstant() && g.y.isConstant();
}

function toProjective(g: Group) {
  return Pallas.fromAffine({
    x: g.x.toBigInt(),
    y: g.y.toBigInt(),
    infinity: false,
  });
}

function fromProjective({ x, y, z }: { x: bigint; y: bigint; z: bigint }) {
  return fromAffine(Pallas.toAffine({ x, y, z }));
}

function fromAffine({ x, y, infinity }: GroupAffine) {
  return infinity ? Group.zero : new Group({ x, y });
}

function toAffine(g: Group): GroupAffine {
  return PallasAffine.from({ x: g.x.toBigInt(), y: g.y.toBigInt() });
}
