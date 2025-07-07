import { Snarky, getCurrentBackend } from '../../bindings.js';
import { Field, readVarMessage, withMessage } from './field.js';
import { FieldVar, FieldConst, FieldType } from './core/fieldvar.js';
import { defineBinable } from '../../bindings/lib/binable.js';
import { existsOne } from './core/exists.js';
import { assertMul } from './gadgets/compatible.js';
import { setBoolConstructor } from './core/field-constructor.js';
export { Bool };
/**
 * A boolean value. You can use it like this:
 *
 * ```
 * const x = new Bool(true);
 * ```
 *
 * You can also combine multiple booleans via [[`not`]], [[`and`]], [[`or`]].
 *
 * Use [[assertEquals]] to enforce the value of a Bool.
 */
class Bool {
    constructor(x) {
        if (x instanceof Bool) {
            this.value = x.value;
            return;
        }
        if (Array.isArray(x)) {
            this.value = x;
            return;
        }
        this.value = FieldVar.constant(BigInt(x));
    }
    isConstant() {
        return this.value[0] === FieldType.Constant;
    }
    /**
     * Converts a {@link Bool} to a {@link Field}. `false` becomes 0 and `true` becomes 1.
     */
    toField() {
        return Bool.toField(this);
    }
    /**
     * @returns a new {@link Bool} that is the negation of this {@link Bool}.
     */
    not() {
        if (this.isConstant()) {
            return new Bool(!this.toBoolean());
        }
        // Semantic Boolean NOT for Sparky backend
        if (getCurrentBackend() === 'sparky' &&
            globalThis.sparkyConstraintBridge?.emitBooleanNot) {
            const result = globalThis.sparkyConstraintBridge.emitBooleanNot(this.value);
            if (result)
                return new Bool(result);
        }
        // Fallback to field subtraction: 1 - x
        let not = new Field(1).sub(this.toField());
        return new Bool(not.value);
    }
    /**
     * @param y A {@link Bool} to AND with this {@link Bool}.
     * @returns a new {@link Bool} that is set to true only if
     * this {@link Bool} and `y` are also true.
     */
    and(y) {
        if (this.isConstant() && isConstant(y)) {
            return new Bool(this.toBoolean() && toBoolean(y));
        }
        // Semantic Boolean AND for Sparky backend
        if (getCurrentBackend() === 'sparky' &&
            globalThis.sparkyConstraintBridge?.emitBooleanAnd) {
            const result = globalThis.sparkyConstraintBridge.emitBooleanAnd(this.value, toFieldVar(y));
            if (result)
                return new Bool(result);
        }
        // Fallback to field multiplication
        return new Bool(this.toField().mul(Bool.toField(y)).value);
    }
    /**
     * @param y a {@link Bool} to OR with this {@link Bool}.
     * @returns a new {@link Bool} that is set to true if either
     * this {@link Bool} or `y` is true.
     */
    or(y) {
        if (this.isConstant() && isConstant(y)) {
            return new Bool(this.toBoolean() || toBoolean(y));
        }
        // Semantic Boolean OR for Sparky backend
        if (getCurrentBackend() === 'sparky' &&
            globalThis.sparkyConstraintBridge?.emitBooleanOr) {
            try {
                const result = globalThis.sparkyConstraintBridge.emitBooleanOr(this.value, toFieldVar(y));
                if (result)
                    return new Bool(result);
                console.log('⚠️ BOOLEAN OR FALLBACK: emitBooleanOr returned null/undefined, falling back to De Morgan');
            }
            catch (error) {
                console.log('⚠️ BOOLEAN OR FALLBACK: emitBooleanOr failed:', error, 'falling back to De Morgan');
            }
        }
        // Fallback to De Morgan's law: 1 - (1 - x)(1 - y) = x + y - xy
        return this.not().and(new Bool(y).not()).not();
    }
    /**
     * Whether this Bool implies another Bool `y`.
     *
     * This is the same as `x.not().or(y)`: if `x` is true, then `y` must be true for the implication to be true.
     *
     * @example
     * ```ts
     * let isZero = x.equals(0);
     * let lessThan10 = x.lessThan(10);
     * assert(isZero.implies(lessThan10), 'x = 0 implies x < 10');
     * ```
     */
    implies(y) {
        return this.not().or(y);
    }
    /**
     * Proves that this {@link Bool} is equal to `y`.
     * @param y a {@link Bool}.
     */
    assertEquals(y, message) {
        try {
            if (this.isConstant() && isConstant(y)) {
                if (this.toBoolean() !== toBoolean(y)) {
                    throw Error(`Bool.assertEquals(): ${this} != ${y}`);
                }
                return;
            }
            this.toField().assertEquals(Bool.toField(y));
        }
        catch (err) {
            throw withMessage(err, message);
        }
    }
    /**
     * Proves that this {@link Bool} is `true`.
     */
    assertTrue(message) {
        try {
            if (this.isConstant() && !this.toBoolean()) {
                throw Error(`Bool.assertTrue(): ${this} != ${true}`);
            }
            this.assertEquals(true);
        }
        catch (err) {
            throw withMessage(err, message);
        }
    }
    /**
     * Proves that this {@link Bool} is `false`.
     */
    assertFalse(message) {
        try {
            if (this.isConstant() && this.toBoolean()) {
                throw Error(`Bool.assertFalse(): ${this} != ${false}`);
            }
            this.assertEquals(false);
        }
        catch (err) {
            throw withMessage(err, message);
        }
    }
    /**
     * Returns true if this {@link Bool} is equal to `y`.
     * @param y a {@link Bool}.
     */
    equals(y) {
        if (this.isConstant() && isConstant(y)) {
            return new Bool(this.toBoolean() === toBoolean(y));
        }
        if (isConstant(y)) {
            if (toBoolean(y))
                return this;
            else
                return this.not();
        }
        if (this.isConstant()) {
            return new Bool(y).equals(this);
        }
        // 1 - (x - y)^2 = 2xy - x - y + 1
        // match snarky logic:
        // 2x * y === x + y - z
        // return 1 - z
        let z = existsOne(() => BigInt(this.toBoolean() !== toBoolean(y)));
        let x = this.toField();
        let y_ = Bool.toField(y);
        assertMul(x.add(x), y_, x.add(y_).sub(z));
        return new Bool(z.value).not();
    }
    /**
     * Returns the size of this type.
     */
    sizeInFields() {
        return 1;
    }
    /**
     * Serializes this {@link Bool} into {@link Field} elements.
     */
    toFields() {
        return Bool.toFields(this);
    }
    /**
     * Serialize the {@link Bool} to a string, e.g. for printing.
     * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
     */
    toString() {
        return this.toBoolean().toString();
    }
    /**
     * Serialize the {@link Bool} to a JSON string.
     * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
     */
    toJSON() {
        return this.toBoolean();
    }
    /**
     * This converts the {@link Bool} to a JS `boolean`.
     * This can only be called on non-witness values.
     */
    toBoolean() {
        if (this.isConstant()) {
            return FieldConst.equal(this.value[1], FieldConst[1]);
        }
        if (!Snarky.run.inProverBlock()) {
            throw Error(readVarMessage('toBoolean', 'b', 'Bool'));
        }
        let value = Snarky.field.readVar(this.value);
        return FieldConst.equal(value, FieldConst[1]);
    }
    static toField(x) {
        return new Field(toFieldVar(x));
    }
    /**
     * Boolean negation.
     */
    static not(x) {
        if (x instanceof Bool) {
            return x.not();
        }
        return new Bool(!x);
    }
    /**
     * Boolean AND operation.
     */
    static and(x, y) {
        if (x instanceof Bool) {
            return x.and(y);
        }
        return new Bool(x).and(y);
    }
    /**
     * Boolean OR operation.
     */
    static or(x, y) {
        if (x instanceof Bool) {
            return x.or(y);
        }
        return new Bool(x).or(y);
    }
    /**
     * Boolean AND operation across a list of booleans, returns `Bool(true)` if all elements in the list are true.
     */
    static allTrue(list) {
        if (list.length === 0) {
            return new Bool(true);
        }
        else {
            let b = toBool(list[0]);
            for (let i = 1; i < list.length; i++) {
                b = b.and(toBool(list[i]));
            }
            return b;
        }
    }
    /**
     * Boolean OR operation across a list of booleans, returns `Bool(true)` if any element in the list is true.
     */
    static anyTrue(list) {
        if (list.length === 0) {
            return new Bool(false);
        }
        else {
            let b = toBool(list[0]);
            for (let i = 1; i < list.length; i++) {
                b = b.or(toBool(list[i]));
            }
            return b;
        }
    }
    /**
     * Asserts if both {@link Bool} are equal.
     */
    static assertEqual(x, y) {
        if (x instanceof Bool) {
            x.assertEquals(y);
            return;
        }
        new Bool(x).assertEquals(y);
    }
    /**
     * Checks two {@link Bool} for equality.
     */
    static equal(x, y) {
        if (x instanceof Bool) {
            return x.equals(y);
        }
        return new Bool(x).equals(y);
    }
    /**
     * Static method to serialize a {@link Bool} into an array of {@link Field} elements.
     */
    static toFields(x) {
        return [Bool.toField(x)];
    }
    /**
     * Static method to serialize a {@link Bool} into its auxiliary data.
     */
    static toAuxiliary(_) {
        return [];
    }
    /**
     * Creates a data structure from an array of serialized {@link Field} elements.
     */
    static fromFields(fields) {
        if (fields.length !== 1) {
            throw Error(`Bool.fromFields(): expected 1 field, got ${fields.length}`);
        }
        return new Bool(fields[0].value);
    }
    /**
     * `Provable<Bool>.toValue()`
     */
    static toValue(x) {
        return x.toBoolean();
    }
    /**
     * `Provable<Bool>.fromValue()`
     */
    static fromValue(b) {
        if (typeof b === 'boolean')
            return new Bool(b);
        return b;
    }
    /**
     * Serialize a {@link Bool} to a JSON string.
     * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
     */
    static toJSON(x) {
        return x.toBoolean();
    }
    /**
     * Deserialize a JSON structure into a {@link Bool}.
     * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
     */
    static fromJSON(b) {
        return new Bool(b);
    }
    /**
     * Returns the size of this type.
     */
    static sizeInFields() {
        return 1;
    }
    static empty() {
        return new Bool(false);
    }
    static toInput(x) {
        return { packed: [[x.toField(), 1]] };
    }
    static toBytes(b) {
        return BoolBinable.toBytes(b);
    }
    static fromBytes(bytes) {
        return BoolBinable.fromBytes(bytes);
    }
    static readBytes(bytes, offset) {
        return BoolBinable.readBytes(bytes, offset);
    }
    static check(x) {
        x.toField().assertBool();
    }
}
Bool.sizeInBytes = 1;
Bool.Unsafe = {
    /**
     * Converts a {@link Field} into a {@link Bool}. This is an **unsafe** operation
     * as it assumes that the field element is either 0 or 1 (which might not be true).
     *
     * Only use this if you have already constrained the Field element to be 0 or 1.
     *
     * @param x a {@link Field}
     */
    fromField(x) {
        return new Bool(x.value);
    },
};
setBoolConstructor(Bool);
const BoolBinable = defineBinable({
    toBytes(b) {
        return [Number(b.toBoolean())];
    },
    readBytes(bytes, offset) {
        return [new Bool(!!bytes[offset]), offset + 1];
    },
});
// internal helper functions
function isConstant(x) {
    if (typeof x === 'boolean') {
        return true;
    }
    return x.isConstant();
}
function toBoolean(x) {
    if (typeof x === 'boolean') {
        return x;
    }
    return x.toBoolean();
}
function toBool(x) {
    if (x instanceof Bool)
        return x;
    return new Bool(x);
}
function toFieldVar(x) {
    if (x instanceof Bool)
        return x.value;
    return FieldVar.constant(BigInt(x));
}
