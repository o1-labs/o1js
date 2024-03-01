import { Snarky } from "../snarky.js";
import { assert } from "./errors.js";
import { FieldBn254 as Fp } from "../provable/field_bn254_bigint.js";
import { FieldConst, FieldType, FieldVar, checkBitLength, readVarMessage, withMessage } from "./field.js";
import { inCheckedComputation } from "./provable-context.js";
import { BoolBn254 } from "./bool_bn254.js";
import { Provable } from "./provable.js";

export { FieldBn254 }

type ConstantFieldVar = [FieldType.Constant, FieldConst];
type ConstantField = FieldBn254 & { value: ConstantFieldVar };

class FieldBn254 {
    value: FieldVar;

    constructor(x: bigint | number | string | FieldBn254 | FieldVar | FieldConst) {
        if (FieldBn254.#isField(x)) {
            this.value = x.value;
            return;
        }
        if (Array.isArray(x)) {
            if (typeof x[1] === 'bigint') {
                // FieldConst
                this.value = FieldVar.constant(x as FieldConst);
                return;
            } else {
                // FieldVar
                this.value = x as FieldVar;
                return;
            }
        }
        // TODO this should handle common values efficiently by reading from a lookup table
        this.value = FieldVar.constant(Fp(x));
    }

    static #isField(
        x: bigint | number | string | FieldBn254 | FieldVar | FieldConst
    ): x is FieldBn254 {
        return x instanceof FieldBn254;
    }

    static #toConst(x: bigint | number | string | ConstantField): FieldConst {
        if (FieldBn254.#isField(x)) return x.value[1];
        return FieldConst.fromBigint(Fp(x));
    }

    static #toVar(x: bigint | number | string | FieldBn254): FieldVar {
        if (FieldBn254.#isField(x)) return x.value;
        return FieldVar.constant(Fp(x));
    }

    static from(x: bigint | number | string | FieldBn254): FieldBn254 {
        if (FieldBn254.#isField(x)) return x;
        return new FieldBn254(x);
    }

    assertEquals(y: FieldBn254, message?: string) {
        try {
            Snarky.fieldBn254.assertEqual(this.value, y.value);
        } catch (err) {
            throw withMessage(err, message);
        }
    }

    isConstant(): this is { value: ConstantFieldVar } {
        return this.value[0] === FieldType.Constant;
    }

    #toConstant(name: string): ConstantField {
        return toConstantField(this, name, 'x', 'field element');
    }

    toConstant(): ConstantField {
        return this.#toConstant('toConstant');
    }

    toBigInt() {
        let x = this.#toConstant('toBigInt');
        return FieldConst.toBigint(x.value[1]);
    }

    toBits(length?: number) {
        if (length !== undefined) checkBitLength('FieldBn254.toBits()', length);
        if (this.isConstant()) {
            let bits = Fp.toBits(this.toBigInt());
            if (length !== undefined) {
                if (bits.slice(length).some((bit) => bit))
                    throw Error(`FieldBn254.toBits(): ${this} does not fit in ${length} bits`);
                return bits.slice(0, length).map((b) => new BoolBn254(b));
            }
            return bits.map((b) => new BoolBn254(b));
        }
        let [, ...bits] = Snarky.fieldBn254.toBits(length ?? Fp.sizeInBits, this.value);
        return bits.map((b) => BoolBn254.Unsafe.ofField(new FieldBn254(b)));
    }

    static fromBits(bits: (BoolBn254 | boolean)[]) {
        let length = bits.length;
        checkBitLength('FieldBn254.fromBits()', length);
        if (bits.every((b) => typeof b === 'boolean' || b.toField().isConstant())) {
            let bits_ = bits
                .map((b) => (typeof b === 'boolean' ? b : b.toBoolean()))
                .concat(Array(Fp.sizeInBits - length).fill(false));
            return new FieldBn254(Fp.fromBits(bits_));
        }
        let bitsVars = bits.map((b): FieldVar => {
            if (typeof b === 'boolean') return b ? FieldVar[1] : FieldVar[0];
            return b.toField().value;
        });
        let x = Snarky.field.fromBits([0, ...bitsVars]);
        return new FieldBn254(x);
    }

    static sizeInFields() {
        return 1;
    }

    static fromFields([x]: FieldBn254[]) {
        return x;
    }

    static toFields(x: FieldBn254) {
        return [x];
    }

    static check() { }

    equals(y: FieldBn254 | bigint | number | string): BoolBn254 {
        return this.sub(y).isZero();
    }

    isZero() {
        if (this.isConstant()) {
            return new BoolBn254(this.toBigInt() === 0n);
        }
        // create witnesses z = 1/x, or z=0 if x=0,
        // and b = 1 - zx
        let [, b, z] = Snarky.existsBn254(2, () => {
            let x = this.toBigInt();
            let z = Fp.inverse(x) ?? 0n;
            let b = Fp.sub(1n, Fp.mul(z, x));
            return [0, FieldConst.fromBigint(b), FieldConst.fromBigint(z)];
        });
        // add constraints
        // b * x === 0
        Snarky.fieldBn254.assertMul(b, this.value, FieldVar[0]);
        // z * x === 1 - b
        Snarky.fieldBn254.assertMul(
            z,
            this.value,
            Snarky.fieldBn254.add(FieldVar[1], Snarky.fieldBn254.scale(FieldConst[-1], b))
        );
        // ^^^ these prove that b = Bool(x === 0):
        // if x = 0, the 2nd equation implies b = 1
        // if x != 0, the 1st implies b = 0
        return BoolBn254.Unsafe.ofField(new FieldBn254(b));
    }

    add(y: FieldBn254 | bigint | number | string): FieldBn254 {
        if (this.isConstant() && isConstant(y)) {
            return new FieldBn254(Fp.add(this.toBigInt(), toFp(y)));
        }
        // return new AST node Add(x, y)
        let z = Snarky.fieldBn254.add(this.value, FieldBn254.#toVar(y));
        return new FieldBn254(z);
    }

    sub(y: FieldBn254 | bigint | number | string) {
        return this.add(FieldBn254.from(y).neg());
    }

    neg() {
        if (this.isConstant()) {
            return new FieldBn254(Fp.negate(this.toBigInt()));
        }
        // return new AST node Scale(-1, x)
        let z = Snarky.fieldBn254.scale(FieldConst[-1], this.value);
        return new FieldBn254(z);
    }

    mul(y: FieldBn254 | bigint | number | string): FieldBn254 {
        if (this.isConstant() && isConstant(y)) {
            return new FieldBn254(Fp.mul(this.toBigInt(), toFp(y)));
        }
        // if one of the factors is constant, return Scale AST node
        if (isConstant(y)) {
            let z = Snarky.fieldBn254.scale(FieldBn254.#toConst(y), this.value);
            return new FieldBn254(z);
        }
        if (this.isConstant()) {
            let z = Snarky.fieldBn254.scale(this.value[1], y.value);
            return new FieldBn254(z);
        }
        // create a new witness for z = x*y
        let z = Snarky.existsVarBn254(() =>
            FieldConst.fromBigint(Fp.mul(this.toBigInt(), toFp(y)))
        );
        // add a multiplication constraint
        Snarky.fieldBn254.assertMul(this.value, y.value, z);
        return new FieldBn254(z);
    }
}

function isConstant(
    x: bigint | number | string | FieldBn254
): x is bigint | number | string | ConstantField {
    let type = typeof x;
    if (type === 'bigint' || type === 'number' || type === 'string') {
        return true;
    }
    return (x as FieldBn254).isConstant();
}

function toConstantField(
    x: FieldBn254,
    methodName: string,
    varName = 'x',
    varDescription = 'field element'
): ConstantField {
    // if this is a constant, return it
    if (x.isConstant()) return x;

    // a non-constant can only appear inside a checked computation. everything else is a bug.
    assert(
        inCheckedComputation(),
        'variables only exist inside checked computations'
    );

    // if we are inside an asProver or witness block, read the variable's value and return it as constant
    if (Snarky.run.inProverBlockBn254()) {
        let value = Snarky.fieldBn254.readVar(x.value);
        return new FieldBn254(value) as ConstantField;
    }

    // otherwise, calling `toConstant()` is likely a mistake. throw a helpful error message.
    throw Error(readVarMessage(methodName, varName, varDescription));
}

function toFp(x: bigint | number | string | FieldBn254): Fp {
    let type = typeof x;
    if (type === 'bigint' || type === 'number' || type === 'string') {
        return Fp(x as bigint | number | string);
    }
    return (x as FieldBn254).toBigInt();
}
