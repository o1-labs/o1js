import { Scalar } from './core.js';
import { Field, FieldConst, FieldType, FieldVar, isField } from './field.js';
import { Snarky, Group as SnarkyGroup } from '../snarky.js';
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
    technically elements are only (i believe?) group elements if they are on the curve (aka for two points y, x the following equation must hold y^2 = x^3 + 5 over our field)
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
      const { add, mul, sqrt, square } = Fp;
      let y = this.y.toBigInt();
      let x = this.x.toBigInt();
      return add(mul(x, mul(x, x)), Pallas.b) === square(y);
    } else {
      throw Error('TODO');
    }
  }

  add(p: Group) {
    let { x: x1, y: y1 } = this;
    let { x: x2, y: y2 } = p;

    if ([x1, y1, x2, y2].every((e) => e.isConstant())) {
      Provable.log('all constants');

      if (x1.toBigInt() === 0n) {
        return p;
      } else if (x2.toBigInt() === 0n) {
        return this;
      } else {
        // TODO: figure out if the conversion of infinite is correct like that
        let r = Pallas.add(
          Pallas.fromAffine({
            x: x1.toBigInt(),
            y: y1.toBigInt(),
            infinity: x1.toBigInt() === 1n && y1.toBigInt() === 1n,
          }),
          Pallas.fromAffine({
            x: x2.toBigInt(),
            y: y2.toBigInt(),
            infinity: x2.toBigInt() === 1n && y2.toBigInt() === 1n,
          })
        );

        let { x, y } = Pallas.toAffine(r);

        return new Group({
          x,
          y,
        });
      }
    } else {
      let [, x, y] = Snarky.group.add(
        [0, x1.value, y1.value],
        [0, x2.value, y2.value]
      );
      return new Group({
        x,
        y,
      });
    }
  }
  sub(y: Group) {}
  neg() {}
  scale(y: Scalar) {}
  assertEquals(y: Group, message?: string) {}
  equals(y: Group) {}

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
    throw Error('TODO');
  }
}
