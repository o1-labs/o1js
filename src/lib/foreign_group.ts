import { Bn254, Pallas } from '../bindings/crypto/elliptic_curve.js';
import { Snarky } from '../snarky.js';
import { FieldBn254 } from './field_bn254.js';
import { ForeignAffine } from './foreign-field.js';
import { ForeignFieldBn254, createForeignFieldBn254 } from './foreign_field_bn254.js';
import { Provable } from './provable.js';
import { Field as Fp } from '../provable/field-bigint.js';
import { p } from '../bindings/crypto/finite_field.js';
import { BoolBn254 } from './bool_bn254.js';
import { FieldConst } from './field.js';
import { Scalar } from './scalar.js';

export { ForeignGroup, EllipticCurve }

type EllipticCurve = [a: string, b: string, modulus: string, genX: string, genY: string, order: string];

const order = 28948022309329048855892746252171976963363056481941647379679742748393362948097n;

function curveParams(): EllipticCurve {
    return [
        Pallas.a.toString(),
        Pallas.b.toString(),
        p.toString(),
        Pallas.one.x.toString(),
        Pallas.one.y.toString(),
        order.toString()
    ]
}

class ForeignGroup {
    x: ForeignFieldBn254
    y: ForeignFieldBn254

    constructor(x: ForeignFieldBn254, y: ForeignFieldBn254) {
        this.x = x;
        this.y = y;

        if (this.#isConstant()) {
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

    static #fromAffine({
        x,
        y,
        infinity,
    }: {
        x: bigint;
        y: bigint;
        infinity: boolean;
    }) {
        let ForeignGroupField = createForeignFieldBn254(p);

        return infinity ?
            new ForeignGroup(ForeignGroupField.from(0), ForeignGroupField.from(0)) :
            new ForeignGroup(ForeignGroupField.from(x), ForeignGroupField.from(y));
    }

    static #fromProjective({ x, y, z }: { x: bigint; y: bigint; z: bigint }) {
        return this.#fromAffine(Pallas.toAffine({ x, y, z }));
    }

    #toTuple(): ForeignAffine {
        return [0, this.x.value, this.y.value];
    }

    #toProjective() {
        return Pallas.fromAffine({
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

    #addVarForeignGroups(other: ForeignGroup, p: bigint) {
        let left = this.#toTuple();
        let right = other.#toTuple();
        let [_, x, y] = Snarky.foreignGroup.add(left, right, curveParams());
        let ForeignGroupField = createForeignFieldBn254(p);

        return new ForeignGroup(new ForeignGroupField(x), new ForeignGroupField(y));
    }

    add(other: ForeignGroup) {
        if (this.#isConstant() && other.#isConstant()) {
            // we check if either operand is zero, because adding zero to g just results in g (and vise versa)
            if (this.isZero().toBoolean()) {
                return other;
            } else if (other.isZero().toBoolean()) {
                return this;
            } else {
                let g_proj = Pallas.add(this.#toProjective(), other.#toProjective());
                return ForeignGroup.#fromProjective(g_proj);
            }
        } else {
            const { x: x1, y: y1 } = this;
            const { x: x2, y: y2 } = other;

            let inf = Provable.witnessBn254(BoolBn254, () => {
                let x1BigInt = x1.toBigInt();
                let x2BigInt = x2.toBigInt();
                let y1BigInt = y1.toBigInt();
                let y2BigInt = y2.toBigInt();

                return new BoolBn254(x1BigInt === x2BigInt && y1BigInt !== y2BigInt)
            });

            let gIsZero = other.isZero();
            let thisIsZero = this.isZero();

            let bothZero = gIsZero.and(thisIsZero);

            let onlyGisZero = gIsZero.and(thisIsZero.not());
            let onlyThisIsZero = thisIsZero.and(gIsZero.not());

            let isNegation = inf;

            let isNewElement = bothZero
                .not()
                .and(isNegation.not())
                .and(onlyThisIsZero.not())
                .and(onlyGisZero.not());

            let ForeignGroupField = createForeignFieldBn254(p);

            const zero = new ForeignGroup(ForeignGroupField.from(0), ForeignGroupField.from(0));

            // We need to compute addition like this to avoid calling OCaml code in edge cases
            let isNewElementAsBoolean = false;
            let addition = zero;
            Provable.asProverBn254(() => {
                isNewElementAsBoolean = isNewElement.toBoolean();
            });
            if (isNewElementAsBoolean) {
                addition = this.#addVarForeignGroups(other, p);
            }

            return Provable.switchBn254(
                [bothZero, onlyGisZero, onlyThisIsZero, isNegation, isNewElement],
                ForeignGroup,
                [zero, this, other, zero, addition]
            );
        }
    }

    sub(other: ForeignGroup) {
        return this.add(other.neg());
    }

    neg() {
        return new ForeignGroup(this.x, this.y.neg());
    }

    scale(scalar: ForeignFieldBn254) {
        if (this.#isConstant() && scalar.isConstant()) {
            let g_proj = Pallas.scale(this.#toProjective(), scalar.toBigInt());
            return ForeignGroup.#fromProjective(g_proj);
        } else {
            let scalarValue = Scalar.from(0).value;
            Provable.asProverBn254(() => {
                scalarValue = Scalar.from(scalar.toBigInt()).value;
            });
            let [, ...bits] = scalarValue;
            bits.reverse();
            let [, x, y] = Snarky.foreignGroup.scale(this.#toTuple(), [0, ...bits], curveParams());
            let ForeignGroupField = createForeignFieldBn254(p);

            return new ForeignGroup(new ForeignGroupField(x), new ForeignGroupField(y));
        }
    }

    assertEquals(other: ForeignGroup) {
        this.#assertEqualBn254(this.x, other.x);
        this.#assertEqualBn254(this.y, other.y);
    }

    #assertEqualBn254(thisX: ForeignFieldBn254, otherX: ForeignFieldBn254) {
        let thisXs = this.#foreignFieldtoFieldsBn254(thisX);
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
        const ForeignGroupField = createForeignFieldBn254(p);

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
        const ForeignGroupField = createForeignFieldBn254(p);

        const xFields = fields.slice(0, 3);
        const yFields = fields.slice(3);
        const x = ForeignGroupField.fromFields(xFields);
        const y = ForeignGroupField.fromFields(yFields);

        return new ForeignGroup(x, y);
    }

    /**
     * Part of the {@link ProvableBn254} interface.
     *
     * Returns an empty array.
     */
    static toAuxiliary(g?: ForeignGroup) {
        return [];
    }

    /**
     * Checks that a {@link ForeignGroup} element is constraint properly by checking that the element is on the curve.
     */
    static check(g: ForeignGroup) {
        try {
            const { x, y } = g;

            let x2 = x.mul(x);
            let x3 = x2.mul(x);
            let ax = x.mul(Pallas.a); // this will obviously be 0, but just for the sake of correctness

            // we also check the zero element (0, 0) here
            let isZero = x.equals(0).and(y.equals(0));

            isZero.or(x3.add(ax).add(Pallas.b).equals(y.mul(y))).assertTrue();
        } catch (error) {
            if (!(error instanceof Error)) return error;
            throw `${`Element (x: ${g.x}, y: ${g.y}) is not an element of the group.`}\n${error.message
            }`;
        }
    }
}
