import { Scalar, withMessage } from './core.js';
import { Field, FieldConst, FieldType, FieldVar, isField } from './field.js';
import { Bool, Snarky, Group as SnarkyGroup } from '../snarky.js';
import { Field as Fp } from '../provable/field-bigint.js';
import { Pallas } from '../bindings/crypto/elliptic_curve.js';
import { Provable } from './provable.js';

export { Group as NewGroup };

/**
 * An element of a Group
 */
class Group {
  x: Field;
  y: Field;

  static generator: Group;

  static #toTuple(g: Group): [0, FieldVar, FieldVar] {
    return [0, g.x.value, g.y.value];
  }

  static #fromAffine({ x, y }: { x: bigint; y: bigint; infinity: boolean }) {
    return new Group({ x, y });
  }

  #isConstant() {
    return this.x.isConstant() && this.y.isConstant();
  }

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

  add(p: Group) {
    let { x: x1, y: y1 } = this;
    let { x: x2, y: y2 } = p;

    if ([x1, y1, x2, y2].every((e) => e.isConstant())) {
      if (x1.toBigInt() === 0n) {
        return p;
      } else if (x2.toBigInt() === 0n) {
        return this;
      } else {
        // TODO: figure out if the conversion of infinite is correct like that
        let g_proj = Pallas.add(
          Pallas.fromAffine({
            x: x1.toBigInt(),
            y: y1.toBigInt(),
            infinity: x1.toBigInt() === 0n && y1.toBigInt() === 0n,
          }),
          Pallas.fromAffine({
            x: x2.toBigInt(),
            y: y2.toBigInt(),
            infinity: x2.toBigInt() === 0n && y2.toBigInt() === 0n,
          })
        );

        return Group.#fromAffine(Pallas.toAffine(g_proj));
      }
    } else {
      let [, x, y] = Snarky.group.add(Group.#toTuple(this), Group.#toTuple(p));
      return new Group({
        x,
        y,
      });
    }
  }

  sub(y: Group) {
    return this.add(y.neg());
  }

  neg() {
    let { x, y } = this;
    return new Group({
      x,
      y: y.neg(),
    });
  }

  scale(s: Scalar) {
    let fields = s.toFields();

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
        BigInt(s.toJSON())
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

  assertEquals(g: Group, message?: string) {
    let { x: x1, y: y1 } = this;
    let { x: x2, y: y2 } = g;

    x1.assertEquals(x2, message);
    // y1.assertEquals(y2, message); need to enable this later on, but it breaks constraint backwards compatibility
  }

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

  toJSON(): {
    x: string;
    y: string;
  } {
    return {
      x: this.x.toString(),
      y: this.y.toString(),
    };
  }

  toFields() {
    return [this.x, this.y];
  }

  static add(x: Group, y: Group) {
    return x.add(y);
  }

  static sub(x: Group, y: Group) {
    return x.sub(y);
  }

  static neg(x: Group) {
    return x.neg();
  }

  static scale(x: Group, y: Scalar) {
    return x.scale(y);
  }

  static assertEqual(x: Group, y: Group) {
    x.assertEquals(y);
  }

  static equal(x: Group, y: Group) {
    return x.equals(y);
  }

  static toFields(x: Group) {
    return x.toFields();
  }

  static toAuxiliary(x?: Group) {
    return [];
  }

  static fromFields([x, y]: Field[]) {
    return new Group({ x, y });
  }

  static sizeInFields() {
    return 2;
  }

  static toJSON(x: Group) {
    return x.toJSON();
  }

  static fromJSON({ x, y }: { x: string | number; y: string | number }) {
    return new Group({ x, y });
  }

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

  static onCurve(g: Group) {
    return g.onCurve();
  }
}
