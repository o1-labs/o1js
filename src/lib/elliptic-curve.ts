import { Snarky } from '../snarky.js';
import { ForeignAffine, ForeignField, ForeignFieldVar, createForeignField } from './foreign-field.js';
import { MlTuple } from './ml/base.js';

export { EllipticCurve, ForeignGroup }

type EllipticCurve = [a: string, b: string, modulus: string, genX: string, genY: string, order: string];
class ForeignGroup {
    static curve: EllipticCurve

    x: ForeignField
    y: ForeignField

    constructor(x: ForeignField, y: ForeignField) {
        this.x = x;
        this.y = y;
    }

    #toTuple(): ForeignAffine {
        return [0, this.x.value, this.y.value];
    }

    add(other: ForeignGroup) {
        let left = this.#toTuple();
        let right = other.#toTuple();
        let [_, x, y] = Snarky.foreignGroup.add(left, right, ForeignGroup.curve);
        let modulus = BigInt(ForeignGroup.curve[2]);
        let ForeignGroupField = createForeignField(modulus);

        return new ForeignGroup(new ForeignGroupField(x), new ForeignGroupField(y));
    }

    sub(other: ForeignGroup) {
        return this.add(other.neg());
    }

    neg() {
        return new ForeignGroup(this.x, this.y.neg());
    }

    scale(scalar: ForeignField) {
        let [, ...bits] = scalar.value;
        bits.reverse();
        let [, x, y] = Snarky.foreignGroup.scale(this.#toTuple(), [0, ...bits], ForeignGroup.curve);
        let modulus = BigInt(ForeignGroup.curve[2]);
        let ForeignGroupField = createForeignField(modulus);

        return new ForeignGroup(new ForeignGroupField(x), new ForeignGroupField(y));
    }

    assertEquals(other: ForeignGroup) {
        this.x.assertEquals(other.x.toBigInt());
        this.y.assertEquals(other.y.toBigInt());
    }
}
