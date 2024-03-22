import { Field } from './field.js';
import { FieldVar } from './provable-core/fieldvar.js';
import { Scalar } from './scalar.js';
import { Snarky } from '../snarky.js';
import { Fp } from '../bindings/crypto/finite-field.js';
import { GroupAffine, Pallas } from '../bindings/crypto/elliptic-curve.js';
import { Provable } from './provable.js';
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
      const { x: x1, y: y1 } = this;
      const { x: x2, y: y2 } = g;

      let zero = new Field(0);

      let same_x = Provable.witness(Field, () => x1.equals(x2).toField());

      let inf = Provable.witness(Bool, () =>
        x1.equals(x2).and(y1.equals(y2).not())
      );

      let inf_z = Provable.witness(Field, () => {
        if (y1.equals(y2).toBoolean()) return zero;
        else if (x1.equals(x2).toBoolean()) return y2.sub(y1).inv();
        else return zero;
      });

      let x21_inv = Provable.witness(Field, () => {
        if (x1.equals(x2).toBoolean()) return zero;
        else return x2.sub(x1).inv();
      });

      let s = Provable.witness(Field, () => {
        if (x1.equals(x2).toBoolean()) {
          let x1_squared = x1.square();
          return x1_squared.add(x1_squared).add(x1_squared).div(y1.add(y1));
        } else return y2.sub(y1).div(x2.sub(x1));
      });

      let x3 = Provable.witness(Field, () => {
        return s.square().sub(x1.add(x2));
      });

      let y3 = Provable.witness(Field, () => {
        return s.mul(x1.sub(x3)).sub(y1);
      });

      let [, x, y] = Snarky.gates.ecAdd(
        toTuple(Group.from(x1.seal(), y1.seal())),
        toTuple(Group.from(x2.seal(), y2.seal())),
        toTuple(Group.from(x3, y3)),
        inf.toField().value,
        same_x.value,
        s.value,
        inf_z.value,
        x21_inv.value
      );

      // similarly to the constant implementation, we check if either operand is zero
      // and the implementation above (original OCaml implementation) returns something wild -> g + 0 != g where it should be g + 0 = g
      let gIsZero = g.isZero();
      let onlyThisIsZero = this.isZero().and(gIsZero.not());
      let isNegation = inf;
      let isNormalAddition = gIsZero.or(onlyThisIsZero).or(isNegation).not();

      // note: gIsZero and isNegation are not mutually exclusive, but if both are true, we add 1*0 + 1*0 = 0 which is correct
      return Provable.switch(
        [gIsZero, onlyThisIsZero, isNegation, isNormalAddition],
        Group,
        [this, g, Group.zero, new Group({ x, y })]
      );
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
  scale(s: Scalar | number | bigint) {
    let scalar = Scalar.from(s);

    if (isConstant(this) && scalar.isConstant()) {
      let g_proj = Pallas.scale(toProjective(this), scalar.toBigInt());
      return fromProjective(g_proj);
    } else {
      let [, ...bits] = scalar.value;
      bits.reverse();
      let [, x, y] = Snarky.group.scale(toTuple(this), [0, ...bits]);
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
      const { x, y } = g;

      let x2 = x.square();
      let x3 = x2.mul(x);
      let ax = x.mul(Pallas.a); // this will obviously be 0, but just for the sake of correctness

      // we also check the zero element (0, 0) here
      let isZero = x.equals(0).and(y.equals(0));

      isZero.or(x3.add(ax).add(Pallas.b).equals(y.square())).assertTrue();
    } catch (error) {
      if (!(error instanceof Error)) return error;
      throw `${`Element (x: ${g.x}, y: ${g.y}) is not an element of the group.`}\n${
        error.message
      }`;
    }
  }

  static toInput(x: Group) {
    return {
      fields: [x.x, x.y],
    };
  }
}

// internal helpers

function isConstant(g: Group) {
  return g.x.isConstant() && g.y.isConstant();
}

function toTuple(g: Group): [0, FieldVar, FieldVar] {
  return [0, g.x.value, g.y.value];
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
