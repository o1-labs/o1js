import { Bn254 } from '../bindings/crypto/elliptic_curve.js';
import { Snarky } from '../snarky.js';
import { FieldBn254 } from './field_bn254.js';
import { ForeignAffine } from './foreign-field.js';
import { ForeignFieldBn254, createForeignFieldBn254 } from './foreign_field_bn254.js';
import { Provable } from './provable.js';

export { EllipticCurve, ForeignGroup }

type EllipticCurve = [a: string, b: string, modulus: string, genX: string, genY: string, order: string];
class ForeignGroup {
    static curve: EllipticCurve

    x: ForeignFieldBn254
    y: ForeignFieldBn254

    constructor(x: ForeignFieldBn254, y: ForeignFieldBn254) {
        this.x = x;
        this.y = y;
    }

    static #fromAffine({
        x,
        y,
        infinity,
    }: {
        x: bigint;
        y: bigint;
        infinity: boolean;
    }) {
        let modulus = BigInt(ForeignGroup.curve[2]);
        let ForeignGroupField = createForeignFieldBn254(modulus);

        return infinity ?
            new ForeignGroup(ForeignGroupField.from(0), ForeignGroupField.from(0)) :
            new ForeignGroup(ForeignGroupField.from(x), ForeignGroupField.from(y));
    }

    static #fromProjective({ x, y, z }: { x: bigint; y: bigint; z: bigint }) {
        return this.#fromAffine(Bn254.toAffine({ x, y, z }));
    }

    #toTuple(): ForeignAffine {
        return [0, this.x.value, this.y.value];
    }

    #toProjective() {
        return Bn254.fromAffine({
            x: this.x.toBigInt(),
            y: this.y.toBigInt(),
            infinity: false,
        });
    }

    #isConstant() {
        return this.x.isConstant() && this.y.isConstant();
    }

    isZero() {
        // only the zero element can have x = 0, there are no other (valid) group elements with x = 0
        return this.x.equals(0);
    }

    add(other: ForeignGroup) {
        Provable.asProverBn254(() => { console.log("ADD"); })
        let thisIsZero = false;
        let otherIsZero = false;
        Provable.asProverBn254(() => {
            thisIsZero = this.isZero().toBoolean();
            otherIsZero = other.isZero().toBoolean();
        });

        // Given a + b
        if (thisIsZero) {
            // If a = 0 ...
            Provable.asProverBn254(() => { console.log("this is zero"); })
            return other;
        } else if (otherIsZero) {
            // If b = 0 ...
            Provable.asProverBn254(() => { console.log("other is zero"); })
            return this;
        } else if (this.#isConstant() && other.#isConstant()) {
            // If a and b are constants ...
            Provable.asProverBn254(() => { console.log("both are constants"); })
            let g_proj = Bn254.add(this.#toProjective(), other.#toProjective());
            return ForeignGroup.#fromProjective(g_proj);
        } else {
            // If a or b is variable ...
            Provable.asProverBn254(() => { console.log("one of them is variable"); })
            let left = this.#toTuple();
            let right = other.#toTuple();
            let [_, x, y] = Snarky.foreignGroup.add(left, right, ForeignGroup.curve);
            let modulus = BigInt(ForeignGroup.curve[2]);
            let ForeignGroupField = createForeignFieldBn254(modulus);

            return new ForeignGroup(new ForeignGroupField(x), new ForeignGroupField(y));
        }
    }

    sub(other: ForeignGroup) {
        return this.add(other.neg());
    }

    neg() {
        return new ForeignGroup(this.x, this.y.neg());
    }

    scale(scalar: ForeignFieldBn254) {
        Provable.asProverBn254(() => { console.log("SCALE"); })
        let [, ...bits] = scalar.value;
        bits.reverse();
        let [, x, y] = Snarky.foreignGroup.scale(this.#toTuple(), [0, ...bits], ForeignGroup.curve);
        let modulus = BigInt(ForeignGroup.curve[2]);
        let ForeignGroupField = createForeignFieldBn254(modulus);

        return new ForeignGroup(new ForeignGroupField(x), new ForeignGroupField(y));
    }

    assertEquals(other: ForeignGroup) {
        this.#assertEqualBn254(other.x);
        this.#assertEqualBn254(other.y);
    }

    #assertEqualBn254(otherX: ForeignFieldBn254) {
        let thisXs = this.#foreignFieldtoFieldsBn254(this.x);
        let otherXs = this.#foreignFieldtoFieldsBn254(otherX);
        for (let i = 0; i < thisXs.length; i++) {
            thisXs[i].assertEquals(otherXs[i]);
        }
    }

    #foreignFieldtoFieldsBn254(x: ForeignFieldBn254) {
        let [, ...limbs] = x.value;
        return limbs.map((x) => new FieldBn254(x));
    }

    /**
     * Part of the {@link Provable} interface.
     * 
     * Returns `2 * ForeignFieldBn254.sizeInFields()` which is 6
     */
    static sizeInFields() {
        return 6;
    }

    /**
     * Part of the {@link ProvableBn254} interface.
     *
     * Returns an array containing this {@link ForeignGroup} element as an array of {@link FieldBn254} elements.
     */
    toFields() {
        const modulus = BigInt(ForeignGroup.curve[2]);
        const ForeignGroupField = createForeignFieldBn254(modulus);

        const xFields = ForeignGroupField.toFields(this.x);
        const yFields = ForeignGroupField.toFields(this.y);

        return [...xFields, ...yFields];
    }

    static toFields(g: ForeignGroup) {
        return g.toFields();
    }

    /**
     * Part of the {@link ProvableBn254} interface.
     *
     * Deserializes a {@link ForeignGroup} element from a list of field elements.
     * Assumes the following format `[...x, ...y]`
     */
    static fromFields(fields: FieldBn254[]) {
        const modulus = BigInt(ForeignGroup.curve[2]);
        const ForeignGroupField = createForeignFieldBn254(modulus);

        const xFields = fields.slice(0, 3);
        const yFields = fields.slice(3);
        const x = ForeignGroupField.fromFields(xFields);
        const y = ForeignGroupField.fromFields(yFields);

        return new ForeignGroup(x, y);
    }
}
