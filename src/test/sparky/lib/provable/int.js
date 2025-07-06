"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sign = exports.Int64 = exports.UInt64 = exports.UInt32 = exports.UInt8 = void 0;
const wrapped_js_1 = require("./wrapped.js");
const struct_js_1 = require("./types/struct.js");
const provable_js_1 = require("./provable.js");
const RangeCheck = require("./gadgets/range-check.js");
const Bitwise = require("./gadgets/bitwise.js");
const arithmetic_js_1 = require("./gadgets/arithmetic.js");
const field_js_1 = require("./field.js");
const circuit_value_js_1 = require("./types/circuit-value.js");
const comparison_js_1 = require("./gadgets/comparison.js");
const assert_js_1 = require("../util/assert.js");
const types_js_1 = require("../util/types.js");
const bit_slices_js_1 = require("./gadgets/bit-slices.js");
const field_bigint_js_1 = require("../../mina-signer/src/field-bigint.js");
/**
 * A 64 bit unsigned integer with values ranging from 0 to 18,446,744,073,709,551,615.
 */
let UInt64 = (() => {
    let _classSuper = circuit_value_js_1.CircuitValue;
    let _value_decorators;
    let _value_initializers = [];
    let _value_extraInitializers = [];
    return class UInt64 extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _value_decorators = [circuit_value_js_1.prop];
            __esDecorate(null, null, _value_decorators, { kind: "field", name: "value", static: false, private: false, access: { has: obj => "value" in obj, get: obj => obj.value, set: (obj, value) => { obj.value = value; } }, metadata: _metadata }, _value_initializers, _value_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        value = __runInitializers(this, _value_initializers, void 0);
        static NUM_BITS = 64;
        /**
         * Create a {@link UInt64}.
         * The max value of a {@link UInt64} is `2^64 - 1 = UInt64.MAXINT()`.
         *
         * **Warning**: Cannot overflow, an error is thrown if the result is greater than UInt64.MAXINT()
         */
        constructor(x) {
            if (x instanceof UInt64 || x instanceof UInt32)
                x = x.value.value;
            let value = (0, wrapped_js_1.Field)(x);
            super(value);
            __runInitializers(this, _value_extraInitializers);
            // check the range if the argument is a constant
            UInt64.checkConstant(value);
        }
        static Unsafe = {
            /**
             * Create a {@link UInt64} from a {@link Field} without constraining its range.
             *
             * **Warning**: This is unsafe, because it does not prove that the input {@link Field} actually fits in 64 bits.\
             * Only use this if you know what you are doing, otherwise use the safe {@link UInt64.from}.
             */
            fromField(x) {
                return new UInt64(x.value);
            },
        };
        /**
         * Static method to create a {@link UInt64} with value `0`.
         */
        static get zero() {
            return new UInt64(0);
        }
        /**
         * Static method to create a {@link UInt64} with value `1`.
         */
        static get one() {
            return new UInt64(1);
        }
        /**
         * Turns the {@link UInt64} into a string.
         * @returns
         */
        toString() {
            return this.value.toString();
        }
        /**
         * Turns the {@link UInt64} into a BigInt.
         * @returns
         */
        toBigInt() {
            return this.value.toBigInt();
        }
        /**
         * Turns the {@link UInt64} into a {@link UInt32}, asserting that it fits in 32 bits.
         */
        toUInt32() {
            let uint32 = new UInt32(this.value.value);
            UInt32.check(uint32);
            return uint32;
        }
        /**
         * Turns the {@link UInt64} into a {@link UInt32}, clamping to the 32 bits range if it's too large.
         * ```ts
         * UInt64.from(4294967296).toUInt32Clamped().toString(); // "4294967295"
         * ```
         */
        toUInt32Clamped() {
            let max = (1n << 32n) - 1n;
            let field = provable_js_1.Provable.if(this.greaterThan(UInt64.from(max)), wrapped_js_1.Field.from(max), this.value);
            return UInt32.Unsafe.fromField(field);
        }
        static check(x) {
            RangeCheck.rangeCheckN(UInt64.NUM_BITS, x.value);
        }
        static toInput(x) {
            return { packed: [[x.value, 64]] };
        }
        /**
         * Encodes this structure into a JSON-like object.
         */
        static toJSON(x) {
            return x.value.toString();
        }
        /**
         * Decodes a JSON-like object into this structure.
         */
        static fromJSON(x) {
            return this.from(x);
        }
        static checkConstant(x) {
            if (!x.isConstant())
                return x;
            let xBig = x.toBigInt();
            if (xBig < 0n || xBig >= 1n << BigInt(this.NUM_BITS)) {
                throw Error(`UInt64: Expected number between 0 and 2^64 - 1, got ${xBig}`);
            }
            return x;
        }
        /**
         * Creates a new {@link UInt64}.
         */
        static from(x) {
            if (x instanceof UInt64)
                return x;
            return new this(x);
        }
        /**
         * Creates a {@link UInt64} with a value of 18,446,744,073,709,551,615.
         */
        static MAXINT() {
            return new UInt64((1n << 64n) - 1n);
        }
        /**
         * Addition modulo 2^64. Check {@link Gadgets.addMod64} for a detailed description.
         */
        addMod64(y) {
            return new UInt64((0, arithmetic_js_1.addMod64)(this.value, y.value).value);
        }
        /**
         * Integer division with remainder.
         *
         * `x.divMod(y)` returns the quotient and the remainder.
         */
        divMod(y) {
            let x = this.value;
            let y_ = UInt64.from(y).value;
            if (this.value.isConstant() && y_.isConstant()) {
                let xn = x.toBigInt();
                let yn = y_.toBigInt();
                let q = xn / yn;
                let r = xn - q * yn;
                return {
                    quotient: new UInt64(q),
                    rest: new UInt64(r),
                };
            }
            y_ = y_.seal();
            let q = provable_js_1.Provable.witness(wrapped_js_1.Field, () => new wrapped_js_1.Field(x.toBigInt() / y_.toBigInt()));
            RangeCheck.rangeCheckN(UInt64.NUM_BITS, q);
            // TODO: Could be a bit more efficient
            let r = x.sub(q.mul(y_)).seal();
            RangeCheck.rangeCheckN(UInt64.NUM_BITS, r);
            let r_ = new UInt64(r.value);
            let q_ = new UInt64(q.value);
            r_.assertLessThan(new UInt64(y_.value));
            return { quotient: q_, rest: r_ };
        }
        /**
         * Integer division.
         *
         * `x.div(y)` returns the floor of `x / y`, that is, the greatest
         * `z` such that `z * y <= x`.
         *
         */
        div(y) {
            return this.divMod(y).quotient;
        }
        /**
         * Integer remainder.
         *
         * `x.mod(y)` returns the value `z` such that `0 <= z < y` and
         * `x - z` is divisible by `y`.
         */
        mod(y) {
            return this.divMod(y).rest;
        }
        /**
         * Multiplication with overflow checking.
         */
        mul(y) {
            let z = this.value.mul(UInt64.from(y).value);
            RangeCheck.rangeCheckN(UInt64.NUM_BITS, z);
            return new UInt64(z.value);
        }
        /**
         * Addition with overflow checking.
         */
        add(y) {
            let z = this.value.add(UInt64.from(y).value);
            RangeCheck.rangeCheckN(UInt64.NUM_BITS, z);
            return new UInt64(z.value);
        }
        /**
         * Subtraction with underflow checking.
         */
        sub(y) {
            let z = this.value.sub(UInt64.from(y).value);
            RangeCheck.rangeCheckN(UInt64.NUM_BITS, z);
            return new UInt64(z.value);
        }
        /**
         * Bitwise XOR gadget on {@link Field} elements. Equivalent to the [bitwise XOR `^` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR).
         * A XOR gate works by comparing two bits and returning `1` if two bits differ, and `0` if two bits are equal.
         *
         * This gadget builds a chain of XOR gates recursively.
         *
         * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#xor-1)
         *
         * @param x {@link UInt64} element to XOR.
         *
         * @example
         * ```ts
         * let a = UInt64.from(0b0101);
         * let b = UInt64.from(0b0011);
         *
         * let c = a.xor(b);
         * c.assertEquals(0b0110);
         * ```
         */
        xor(x) {
            return new UInt64(Bitwise.xor(this.value, x.value, UInt64.NUM_BITS).value);
        }
        /**
         * Bitwise NOT gate on {@link Field} elements. Similar to the [bitwise
         * NOT `~` operator in JavaScript](https://developer.mozilla.org/en-US/docs/
         * Web/JavaScript/Reference/Operators/Bitwise_NOT).
         *
         * **Note:** The NOT gate operates over 64 bit for UInt64 types.
         *
         * A NOT gate works by returning `1` in each bit position if the
         * corresponding bit of the operand is `0`, and returning `0` if the
         * corresponding bit of the operand is `1`.
         *
         * NOT is implemented as a subtraction of the input from the all one bitmask
         *
         * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#not)
         *
         * @example
         * ```ts
         * // NOTing 4 bits with the unchecked version
         * let a = UInt64.from(0b0101);
         * let b = a.not();
         *
         * console.log(b.toBigInt().toString(2));
         * // 1111111111111111111111111111111111111111111111111111111111111010
         *
         * ```
         *
         */
        not() {
            return new UInt64(Bitwise.not(this.value, UInt64.NUM_BITS, false).value);
        }
        /**
         * A (left and right) rotation operates similarly to the shift operation (`<<` for left and `>>` for right) in JavaScript,
         * with the distinction that the bits are circulated to the opposite end of a 64-bit representation rather than being discarded.
         * For a left rotation, this means that bits shifted off the left end reappear at the right end.
         * Conversely, for a right rotation, bits shifted off the right end reappear at the left end.
         *
         * It’s important to note that these operations are performed considering the big-endian 64-bit representation of the number,
         * where the most significant (64th) bit is on the left end and the least significant bit is on the right end.
         * The `direction` parameter is a string that accepts either `'left'` or `'right'`, determining the direction of the rotation.
         *
         * To safely use `rotate()`, you need to make sure that the value passed in is range-checked to 64 bits;
         * for example, using {@link Gadgets.rangeCheck64}.
         *
         * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#rotation)
         *
         * @param bits amount of bits to rotate this {@link UInt64} element with.
         * @param direction left or right rotation direction.
         *
         *
         * @example
         * ```ts
         * const x = UInt64.from(0b001100);
         * const y = x.rotate(2, 'left');
         * const z = x.rotate(2, 'right'); // right rotation by 2 bits
         * y.assertEquals(0b110000);
         * z.assertEquals(0b000011);
         * ```
         */
        rotate(bits, direction = 'left') {
            return new UInt64(Bitwise.rotate64(this.value, bits, direction).value);
        }
        /**
         * Performs a left shift operation on the provided {@link UInt64} element.
         * This operation is similar to the `<<` shift operation in JavaScript,
         * where bits are shifted to the left, and the overflowing bits are discarded.
         *
         * It’s important to note that these operations are performed considering the big-endian 64-bit representation of the number,
         * where the most significant (64th) bit is on the left end and the least significant bit is on the right end.
         *
         * @param bits Amount of bits to shift the {@link UInt64} element to the left. The amount should be between 0 and 64 (or else the shift will fail).
         *
         * @example
         * ```ts
         * const x = UInt64.from(0b001100); // 12 in binary
         * const y = x.leftShift(2); // left shift by 2 bits
         * y.assertEquals(0b110000); // 48 in binary
         * ```
         */
        leftShift(bits) {
            return new UInt64(Bitwise.leftShift64(this.value, bits).value);
        }
        /**
         * Performs a right shift operation on the provided {@link UInt64} element.
         * This operation is similar to the `>>` shift operation in JavaScript,
         * where bits are shifted to the right, and the overflowing bits are discarded.
         *
         * It’s important to note that these operations are performed considering the big-endian 64-bit representation of the number,
         * where the most significant (64th) bit is on the left end and the least significant bit is on the right end.
         *
         * @param bits Amount of bits to shift the {@link UInt64} element to the right. The amount should be between 0 and 64 (or else the shift will fail).
         *
         * @example
         * ```ts
         * const x = UInt64.from(0b001100); // 12 in binary
         * const y = x.rightShift(2); // right shift by 2 bits
         * y.assertEquals(0b000011); // 3 in binary
         * ```
         */
        rightShift(bits) {
            return new UInt64(Bitwise.rightShift64(this.value, bits).value);
        }
        /**
         * Bitwise AND gadget on {@link UInt64} elements. Equivalent to the [bitwise AND `&` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND).
         * The AND gate works by comparing two bits and returning `1` if both bits are `1`, and `0` otherwise.
         *
         * It can be checked by a double generic gate that verifies the following relationship between the values below.
         *
         * The generic gate verifies:\
         * `a + b = sum` and the conjunction equation `2 * and = sum - xor`\
         * Where:\
         * `a + b = sum`\
         * `a ^ b = xor`\
         * `a & b = and`
         *
         * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#and)
         *
         *
         * @example
         * ```typescript
         * let a = UInt64.from(3);    // ... 000011
         * let b = UInt64.from(5);    // ... 000101
         *
         * let c = a.and(b);    // ... 000001
         * c.assertEquals(1);
         * ```
         */
        and(x) {
            return new UInt64(Bitwise.and(this.value, x.value, UInt64.NUM_BITS).value);
        }
        /**
         * Bitwise OR gadget on {@link UInt64} elements. Equivalent to the [bitwise OR `|` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_OR).
         * The OR gate works by comparing two bits and returning `1` if at least one bit is `1`, and `0` otherwise.
         *
         * @example
         * ```typescript
         * let a = UInt64.from(3);    // ... 000011
         * let b = UInt64.from(5);    // ... 000101
         *
         * let c = a.or(b);    // ... 000111
         * c.assertEquals(7);
         * ```
         */
        or(x) {
            return new UInt64(Bitwise.or(this.value, x.value, UInt64.NUM_BITS).value);
        }
        /**
         * Checks if a {@link UInt64} is less than or equal to another one.
         */
        lessThanOrEqual(y) {
            if (this.value.isConstant() && y.value.isConstant()) {
                return (0, wrapped_js_1.Bool)(this.value.toBigInt() <= y.value.toBigInt());
            }
            return (0, comparison_js_1.lessThanOrEqualGeneric)(this.value, y.value, 1n << 64n, (v) => RangeCheck.rangeCheckN(UInt64.NUM_BITS, v));
        }
        /**
         * Asserts that a {@link UInt64} is less than or equal to another one.
         */
        assertLessThanOrEqual(y, message) {
            if (this.value.isConstant() && y.value.isConstant()) {
                let [x0, y0] = [this.value.toBigInt(), y.value.toBigInt()];
                return (0, assert_js_1.assert)(x0 <= y0, message ?? `UInt64.assertLessThanOrEqual: expected ${x0} <= ${y0}`);
            }
            (0, comparison_js_1.assertLessThanOrEqualGeneric)(this.value, y.value, (v) => RangeCheck.rangeCheckN(UInt64.NUM_BITS, v, message));
        }
        /**
         *
         * Checks if a {@link UInt64} is less than another one.
         */
        lessThan(y) {
            if (this.value.isConstant() && y.value.isConstant()) {
                return (0, wrapped_js_1.Bool)(this.value.toBigInt() < y.value.toBigInt());
            }
            return (0, comparison_js_1.lessThanGeneric)(this.value, y.value, 1n << 64n, (v) => RangeCheck.rangeCheckN(UInt64.NUM_BITS, v));
        }
        /**
         * Asserts that a {@link UInt64} is less than another one.
         */
        assertLessThan(y, message) {
            if (this.value.isConstant() && y.value.isConstant()) {
                let [x0, y0] = [this.value.toBigInt(), y.value.toBigInt()];
                return (0, assert_js_1.assert)(x0 < y0, message ?? `UInt64.assertLessThan: expected ${x0} < ${y0}`);
            }
            (0, comparison_js_1.assertLessThanGeneric)(this.value, y.value, (v) => RangeCheck.rangeCheckN(UInt64.NUM_BITS, v, message));
        }
        /**
         * Checks if a {@link UInt64} is greater than another one.
         */
        greaterThan(y) {
            return y.lessThan(this);
        }
        /**
         * Asserts that a {@link UInt64} is greater than another one.
         */
        assertGreaterThan(y, message) {
            y.assertLessThan(this, message);
        }
        /**
         * Checks if a {@link UInt64} is greater than or equal to another one.
         */
        greaterThanOrEqual(y) {
            return y.lessThanOrEqual(this);
        }
        /**
         * Asserts that a {@link UInt64} is greater than or equal to another one.
         */
        assertGreaterThanOrEqual(y, message) {
            y.assertLessThanOrEqual(this, message);
        }
        static toValue(x) {
            return x.value.toBigInt();
        }
        static fromValue(x) {
            return UInt64.from(x);
        }
        /**
         * Split a UInt64 into 8 UInt8s, in little-endian order.
         */
        toBytes() {
            return types_js_1.TupleN.fromArray(8, (0, bit_slices_js_1.wordToBytes)(this.value, 8));
        }
        /**
         * Split a UInt64 into 8 UInt8s, in big-endian order.
         */
        toBytesBE() {
            return types_js_1.TupleN.fromArray(8, (0, bit_slices_js_1.wordToBytes)(this.value, 8).reverse());
        }
        /**
         * Combine 8 UInt8s into a UInt64, in little-endian order.
         */
        static fromBytes(bytes) {
            (0, assert_js_1.assert)(bytes.length === 8, '8 bytes needed to create a uint64');
            return UInt64.Unsafe.fromField((0, bit_slices_js_1.bytesToWord)(bytes));
        }
        /**
         * Combine 8 UInt8s into a UInt64, in big-endian order.
         */
        static fromBytesBE(bytes) {
            return UInt64.fromBytes([...bytes].reverse());
        }
        /**
         * Returns an array of {@link Bool} elements representing [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of this {@link UInt64} element.
         *
         * If you use the optional `length` argument, proves that the UInt64 element fits in `length` bits.
         * The `length` has to be between 0 and 64 and the method throws if it isn't.
         *
         * **Warning**: The cost of this operation in a zk proof depends on the `length` you specify,
         * which by default is 64 bits. Prefer to pass a smaller `length` if possible.
         *
         * @param length - the number of bits to fit the element. If the element does not fit in `length` bits, the functions throws an error.
         *
         * @return An array of {@link Bool} element representing little endian binary representation of this {@link UInt64}.
         */
        toBits(length = 64) {
            (0, field_js_1.checkBitLength)('UInt64.toBits()', length, 64);
            if (this.isConstant()) {
                let bits = field_bigint_js_1.BinableFp.toBits(this.toBigInt());
                if (bits.slice(length).some((bit) => bit))
                    throw Error(`UInt64.toBits(): ${this} does not fit in ${length} bits`);
                return bits.slice(0, length).map((b) => new wrapped_js_1.Bool(b));
            }
            return this.value.toBits(length);
        }
        /**
         * Convert a bit array into a {@link UInt64} element using [little endian binary representation](https://en.wikipedia.org/wiki/Endianness)
         *
         * The method throws if the given bits do not fit in a single UInt64 element. In this case, no more than 64 bits are allowed.
         *
         * **Important**: If the given `bits` array is an array of `booleans` or {@link Bool} elements that all are `constant`,
         *  the resulting {@link UInt64} element will be a constant as well. Or else, if the given array is a mixture of constants and variables of {@link Bool} type,
         *  the resulting {@link UInt64} will be a variable as well.
         *
         * @param bits - An array of {@link Bool} or `boolean` type.
         *
         * @return A {@link UInt64} element matching the [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of the given `bits` array.
         */
        static fromBits(bits) {
            const length = bits.length;
            (0, field_js_1.checkBitLength)('UInt64.fromBits()', length, 64);
            return UInt64.Unsafe.fromField(wrapped_js_1.Field.fromBits(bits));
        }
    };
})();
exports.UInt64 = UInt64;
/**
 * A 32 bit unsigned integer with values ranging from 0 to 4,294,967,295.
 */
let UInt32 = (() => {
    let _classSuper = circuit_value_js_1.CircuitValue;
    let _value_decorators;
    let _value_initializers = [];
    let _value_extraInitializers = [];
    return class UInt32 extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _value_decorators = [circuit_value_js_1.prop];
            __esDecorate(null, null, _value_decorators, { kind: "field", name: "value", static: false, private: false, access: { has: obj => "value" in obj, get: obj => obj.value, set: (obj, value) => { obj.value = value; } }, metadata: _metadata }, _value_initializers, _value_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        value = __runInitializers(this, _value_initializers, void 0);
        static NUM_BITS = 32;
        /**
         * Create a {@link UInt32}.
         * The max value of a {@link UInt32} is `2^32 - 1 = UInt32.MAXINT()`.
         *
         * **Warning**: Cannot overflow, an error is thrown if the result is greater than UInt32.MAXINT()
         */
        constructor(x) {
            if (x instanceof UInt32)
                x = x.value.value;
            let value = (0, wrapped_js_1.Field)(x);
            super(value);
            __runInitializers(this, _value_extraInitializers);
            // check the range if the argument is a constant
            UInt32.checkConstant(value);
        }
        static Unsafe = {
            /**
             * Create a {@link UInt32} from a {@link Field} without constraining its range.
             *
             * **Warning**: This is unsafe, because it does not prove that the input {@link Field} actually fits in 32 bits.\
             * Only use this if you know what you are doing, otherwise use the safe {@link UInt32.from}.
             */
            fromField(x) {
                return new UInt32(x.value);
            },
        };
        /**
         * Static method to create a {@link UInt32} with value `0`.
         */
        static get zero() {
            return new UInt32(0);
        }
        /**
         * Static method to create a {@link UInt32} with value `0`.
         */
        static get one() {
            return new UInt32(1);
        }
        /**
         * Turns the {@link UInt32} into a string.
         */
        toString() {
            return this.value.toString();
        }
        /**
         * Turns the {@link UInt32} into a BigInt.
         */
        toBigint() {
            return this.value.toBigInt();
        }
        /**
         * Turns the {@link UInt32} into a {@link UInt64}.
         */
        toUInt64() {
            // this is safe, because the UInt32 range is included in the UInt64 range
            return new UInt64(this.value.value);
        }
        static check(x) {
            RangeCheck.rangeCheck32(x.value);
        }
        static toInput(x) {
            return { packed: [[x.value, 32]] };
        }
        /**
         * Encodes this structure into a JSON-like object.
         */
        static toJSON(x) {
            return x.value.toString();
        }
        /**
         * Decodes a JSON-like object into this structure.
         */
        static fromJSON(x) {
            return this.from(x);
        }
        static checkConstant(x) {
            if (!x.isConstant())
                return x;
            let xBig = x.toBigInt();
            if (xBig < 0n || xBig >= 1n << BigInt(this.NUM_BITS)) {
                throw Error(`UInt32: Expected number between 0 and 2^32 - 1, got ${xBig}`);
            }
            return x;
        }
        // this checks the range if the argument is a constant
        /**
         * Creates a new {@link UInt32}.
         */
        static from(x) {
            if (x instanceof UInt32)
                return x;
            return new this(x);
        }
        /**
         * Creates a {@link UInt32} with a value of 4,294,967,295.
         */
        static MAXINT() {
            return new UInt32((1n << 32n) - 1n);
        }
        /**
         * Addition modulo 2^32. Check {@link Gadgets.addMod32} for a detailed description.
         */
        addMod32(y) {
            return new UInt32((0, arithmetic_js_1.addMod32)(this.value, y.value).value);
        }
        /**
         * Integer division with remainder.
         *
         * `x.divMod(y)` returns the quotient and the remainder.
         */
        divMod(y) {
            let x = this.value;
            let y_ = UInt32.from(y).value;
            if (x.isConstant() && y_.isConstant()) {
                let xn = x.toBigInt();
                let yn = y_.toBigInt();
                let q = xn / yn;
                let r = xn - q * yn;
                return {
                    quotient: new UInt32(new wrapped_js_1.Field(q.toString()).value),
                    rest: new UInt32(new wrapped_js_1.Field(r.toString()).value),
                };
            }
            y_ = y_.seal();
            let q = provable_js_1.Provable.witness(wrapped_js_1.Field, () => new wrapped_js_1.Field(x.toBigInt() / y_.toBigInt()));
            RangeCheck.rangeCheck32(q);
            // TODO: Could be a bit more efficient
            let r = x.sub(q.mul(y_)).seal();
            RangeCheck.rangeCheck32(r);
            let r_ = new UInt32(r.value);
            let q_ = new UInt32(q.value);
            r_.assertLessThan(new UInt32(y_.value));
            return { quotient: q_, rest: r_ };
        }
        /**
         * Integer division.
         *
         * `x.div(y)` returns the floor of `x / y`, that is, the greatest
         * `z` such that `x * y <= x`.
         *
         */
        div(y) {
            return this.divMod(y).quotient;
        }
        /**
         * Integer remainder.
         *
         * `x.mod(y)` returns the value `z` such that `0 <= z < y` and
         * `x - z` is divisible by `y`.
         */
        mod(y) {
            return this.divMod(y).rest;
        }
        /**
         * Multiplication with overflow checking.
         */
        mul(y) {
            let z = this.value.mul(UInt32.from(y).value);
            RangeCheck.rangeCheck32(z);
            return new UInt32(z.value);
        }
        /**
         * Addition with overflow checking.
         */
        add(y) {
            let z = this.value.add(UInt32.from(y).value);
            RangeCheck.rangeCheck32(z);
            return new UInt32(z.value);
        }
        /**
         * Subtraction with underflow checking.
         */
        sub(y) {
            let z = this.value.sub(UInt32.from(y).value);
            RangeCheck.rangeCheck32(z);
            return new UInt32(z.value);
        }
        /**
         * Bitwise XOR gadget on {@link UInt32} elements. Equivalent to the [bitwise XOR `^` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR).
         * A XOR gate works by comparing two bits and returning `1` if two bits differ, and `0` if two bits are equal.
         *
         * This gadget builds a chain of XOR gates recursively.
         *
         * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#xor-1)
         *
         * @param x {@link UInt32} element to compare.
         *
         * @example
         * ```ts
         * let a = UInt32.from(0b0101);
         * let b = UInt32.from(0b0011);
         *
         * let c = a.xor(b);
         * c.assertEquals(0b0110);
         * ```
         */
        xor(x) {
            return new UInt32(Bitwise.xor(this.value, x.value, UInt32.NUM_BITS).value);
        }
        /**
         * Bitwise NOT gate on {@link UInt32} elements. Similar to the [bitwise
         * NOT `~` operator in JavaScript](https://developer.mozilla.org/en-US/docs/
         * Web/JavaScript/Reference/Operators/Bitwise_NOT).
         *
         * **Note:** The NOT gate operates over 32 bit for UInt32 types.
         *
         * A NOT gate works by returning `1` in each bit position if the
         * corresponding bit of the operand is `0`, and returning `0` if the
         * corresponding bit of the operand is `1`.
         *
         * NOT is implemented as a subtraction of the input from the all one bitmask.
         *
         * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#not)
         *
         * @example
         * ```ts
         * // NOTing 4 bits with the unchecked version
         * let a = UInt32.from(0b0101);
         * let b = a.not();
         *
         * console.log(b.toBigInt().toString(2));
         * // 11111111111111111111111111111010
         * ```
         *
         */
        not() {
            return new UInt32(Bitwise.not(this.value, UInt32.NUM_BITS, false).value);
        }
        /**
         * A (left and right) rotation operates similarly to the shift operation (`<<` for left and `>>` for right) in JavaScript,
         * with the distinction that the bits are circulated to the opposite end of a 64-bit representation rather than being discarded.
         * For a left rotation, this means that bits shifted off the left end reappear at the right end.
         * Conversely, for a right rotation, bits shifted off the right end reappear at the left end.
         *
         * It’s important to note that these operations are performed considering the big-endian 64-bit representation of the number,
         * where the most significant (64th) bit is on the left end and the least significant bit is on the right end.
         * The `direction` parameter is a string that accepts either `'left'` or `'right'`, determining the direction of the rotation.
         *
         * To safely use `rotate()`, you need to make sure that the value passed in is range-checked to 64 bits;
         * for example, using {@link Gadgets.rangeCheck64}.
         *
         * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#rotation)
         *
         * @param bits amount of bits to rotate this {@link UInt32} element with.
         * @param direction left or right rotation direction.
         *
         *
         * @example
         * ```ts
         * const x = UInt32.from(0b001100);
         * const y = x.rotate(2, 'left');
         * const z = x.rotate(2, 'right'); // right rotation by 2 bits
         * y.assertEquals(0b110000);
         * z.assertEquals(0b000011);
         * ```
         */
        rotate(bits, direction = 'left') {
            return new UInt32(Bitwise.rotate32(this.value, bits, direction).value);
        }
        /**
         * Performs a left shift operation on the provided {@link UInt32} element.
         * This operation is similar to the `<<` shift operation in JavaScript,
         * where bits are shifted to the left, and the overflowing bits are discarded.
         *
         * It’s important to note that these operations are performed considering the big-endian 32-bit representation of the number,
         * where the most significant (32th) bit is on the left end and the least significant bit is on the right end.
         *
         * The operation expects the input to be range checked to 32 bit.
         *
         * @param bits Amount of bits to shift the {@link UInt32} element to the left. The amount should be between 0 and 32 (or else the shift will fail).
         *
         * @example
         * ```ts
         * const x = UInt32.from(0b001100); // 12 in binary
         * const y = x.leftShift(2); // left shift by 2 bits
         * y.assertEquals(0b110000); // 48 in binary
         * ```
         */
        leftShift(bits) {
            return new UInt32(Bitwise.leftShift32(this.value, bits).value);
        }
        /**
         * Performs a left right operation on the provided {@link UInt32} element.
         * This operation is similar to the `>>` shift operation in JavaScript,
         * where bits are shifted to the right, and the overflowing bits are discarded.
         *
         * It’s important to note that these operations are performed considering the big-endian 32-bit representation of the number,
         * where the most significant (32th) bit is on the left end and the least significant bit is on the right end.
         *
         * @param bits Amount of bits to shift the {@link UInt32} element to the right. The amount should be between 0 and 32 (or else the shift will fail).
         *
         * The operation expects the input to be range checked to 32 bit.
         *
         * @example
         * ```ts
         * const x = UInt32.from(0b001100); // 12 in binary
         * const y = x.rightShift(2); // left shift by 2 bits
         * y.assertEquals(0b000011); // 48 in binary
         * ```
         */
        rightShift(bits) {
            return new UInt32(Bitwise.rightShift64(this.value, bits).value);
        }
        /**
         * Bitwise AND gadget on {@link UInt32} elements. Equivalent to the [bitwise AND `&` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND).
         * The AND gate works by comparing two bits and returning `1` if both bits are `1`, and `0` otherwise.
         *
         * It can be checked by a double generic gate that verifies the following relationship between the values below.
         *
         * The generic gate verifies:\
         * `a + b = sum` and the conjunction equation `2 * and = sum - xor`\
         * Where:\
         * `a + b = sum`\
         * `a ^ b = xor`\
         * `a & b = and`
         *
         * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#and)
         *
         *
         * @example
         * ```typescript
         * let a = UInt32.from(3);    // ... 000011
         * let b = UInt32.from(5);    // ... 000101
         *
         * let c = a.and(b);    // ... 000001
         * c.assertEquals(1);
         * ```
         */
        and(x) {
            return new UInt32(Bitwise.and(this.value, x.value, UInt32.NUM_BITS).value);
        }
        /**
         * Bitwise OR gadget on {@link UInt32} elements. Equivalent to the [bitwise OR `|` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_OR).
         * The OR gate works by comparing two bits and returning `1` if at least one bit is `1`, and `0` otherwise.
         *
         * @example
         * ```typescript
         * let a = UInt32.from(3);    // ... 000011
         * let b = UInt32.from(5);    // ... 000101
         *
         * let c = a.or(b);    // ... 000111
         * c.assertEquals(7);
         * ```
         */
        or(x) {
            return new UInt32(Bitwise.or(this.value, x.value, UInt32.NUM_BITS).value);
        }
        /**
         * Checks if a {@link UInt32} is less than or equal to another one.
         */
        lessThanOrEqual(y) {
            if (this.value.isConstant() && y.value.isConstant()) {
                return (0, wrapped_js_1.Bool)(this.value.toBigInt() <= y.value.toBigInt());
            }
            return (0, comparison_js_1.lessThanOrEqualGeneric)(this.value, y.value, 1n << 32n, (v) => RangeCheck.rangeCheckN(UInt32.NUM_BITS, v));
        }
        /**
         * Asserts that a {@link UInt32} is less than or equal to another one.
         */
        assertLessThanOrEqual(y, message) {
            if (this.value.isConstant() && y.value.isConstant()) {
                let [x0, y0] = [this.value.toBigInt(), y.value.toBigInt()];
                return (0, assert_js_1.assert)(x0 <= y0, message ?? `UInt32.assertLessThanOrEqual: expected ${x0} <= ${y0}`);
            }
            (0, comparison_js_1.assertLessThanOrEqualGeneric)(this.value, y.value, (v) => RangeCheck.rangeCheckN(UInt32.NUM_BITS, v, message));
        }
        /**
         * Checks if a {@link UInt32} is less than another one.
         */
        lessThan(y) {
            if (this.value.isConstant() && y.value.isConstant()) {
                return (0, wrapped_js_1.Bool)(this.value.toBigInt() < y.value.toBigInt());
            }
            return (0, comparison_js_1.lessThanGeneric)(this.value, y.value, 1n << 32n, (v) => RangeCheck.rangeCheckN(UInt32.NUM_BITS, v));
        }
        /**
         * Asserts that a {@link UInt32} is less than another one.
         */
        assertLessThan(y, message) {
            if (this.value.isConstant() && y.value.isConstant()) {
                let [x0, y0] = [this.value.toBigInt(), y.value.toBigInt()];
                return (0, assert_js_1.assert)(x0 < y0, message ?? `UInt32.assertLessThan: expected ${x0} < ${y0}`);
            }
            (0, comparison_js_1.assertLessThanGeneric)(this.value, y.value, (v) => RangeCheck.rangeCheckN(UInt32.NUM_BITS, v, message));
        }
        /**
         * Checks if a {@link UInt32} is greater than another one.
         */
        greaterThan(y) {
            return y.lessThan(this);
        }
        /**
         * Asserts that a {@link UInt32} is greater than another one.
         */
        assertGreaterThan(y, message) {
            y.assertLessThan(this, message);
        }
        /**
         * Checks if a {@link UInt32} is greater than or equal to another one.
         */
        greaterThanOrEqual(y) {
            return y.lessThanOrEqual(this);
        }
        /**
         * Asserts that a {@link UInt32} is greater than or equal to another one.
         */
        assertGreaterThanOrEqual(y, message) {
            y.assertLessThanOrEqual(this, message);
        }
        static toValue(x) {
            return x.value.toBigInt();
        }
        static fromValue(x) {
            return UInt32.from(x);
        }
        /**
         * Split a UInt32 into 4 UInt8s, in little-endian order.
         */
        toBytes() {
            return types_js_1.TupleN.fromArray(4, (0, bit_slices_js_1.wordToBytes)(this.value, 4));
        }
        /**
         * Split a UInt32 into 4 UInt8s, in big-endian order.
         */
        toBytesBE() {
            return types_js_1.TupleN.fromArray(4, (0, bit_slices_js_1.wordToBytes)(this.value, 4).reverse());
        }
        /**
         * Combine 4 UInt8s into a UInt32, in little-endian order.
         */
        static fromBytes(bytes) {
            (0, assert_js_1.assert)(bytes.length === 4, '4 bytes needed to create a uint32');
            return UInt32.Unsafe.fromField((0, bit_slices_js_1.bytesToWord)(bytes));
        }
        /**
         * Combine 4 UInt8s into a UInt32, in big-endian order.
         */
        static fromBytesBE(bytes) {
            return UInt32.fromBytes([...bytes].reverse());
        }
        /**
         * Returns an array of {@link Bool} elements representing [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of this {@link UInt32} element.
         *
         * If you use the optional `length` argument, proves that the UInt32 element fits in `length` bits.
         * The `length` has to be between 0 and 32 and the method throws if it isn't.
         *
         * **Warning**: The cost of this operation in a zk proof depends on the `length` you specify,
         * which by default is 32 bits. Prefer to pass a smaller `length` if possible.
         *
         * @param length - the number of bits to fit the element. If the element does not fit in `length` bits, the functions throws an error.
         *
         * @return An array of {@link Bool} element representing little endian binary representation of this {@link UInt32}.
         */
        toBits(length = 32) {
            (0, field_js_1.checkBitLength)('UInt32.toBits()', length, 32);
            if (this.isConstant()) {
                let bits = field_bigint_js_1.BinableFp.toBits(this.toBigint());
                if (bits.slice(length).some((bit) => bit))
                    throw Error(`UInt32.toBits(): ${this} does not fit in ${length} bits`);
                return bits.slice(0, length).map((b) => new wrapped_js_1.Bool(b));
            }
            return this.value.toBits(length);
        }
        /**
         * Convert a bit array into a {@link UInt32} element using [little endian binary representation](https://en.wikipedia.org/wiki/Endianness)
         *
         * The method throws if the given bits do not fit in a single UInt32 element. In this case, no more than 32 bits are allowed.
         *
         * **Important**: If the given `bits` array is an array of `booleans` or {@link Bool} elements that all are `constant`,
         *  the resulting {@link UInt32} element will be a constant as well. Or else, if the given array is a mixture of constants and variables of {@link Bool} type,
         *  the resulting {@link UInt32} will be a variable as well.
         *
         * @param bits - An array of {@link Bool} or `boolean` type.
         *
         * @return A {@link UInt32} element matching the [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of the given `bits` array.
         */
        static fromBits(bits) {
            const length = bits.length;
            (0, field_js_1.checkBitLength)('UInt32.fromBits()', length, 32);
            return UInt32.Unsafe.fromField(wrapped_js_1.Field.fromBits(bits));
        }
    };
})();
exports.UInt32 = UInt32;
let Sign = (() => {
    let _classSuper = circuit_value_js_1.CircuitValue;
    let _value_decorators;
    let _value_initializers = [];
    let _value_extraInitializers = [];
    return class Sign extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _value_decorators = [circuit_value_js_1.prop];
            __esDecorate(null, null, _value_decorators, { kind: "field", name: "value", static: false, private: false, access: { has: obj => "value" in obj, get: obj => obj.value, set: (obj, value) => { obj.value = value; } }, metadata: _metadata }, _value_initializers, _value_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        value = __runInitializers(this, _value_initializers, void 0); // +/- 1
        static get one() {
            return new Sign((0, wrapped_js_1.Field)(1));
        }
        static get minusOne() {
            return new Sign((0, wrapped_js_1.Field)(-1));
        }
        static check(x) {
            // x^2 === 1  <=>  x === 1 or x === -1
            x.value.square().assertEquals(1);
        }
        static empty() {
            return Sign.one;
        }
        static toInput(x) {
            return { packed: [[x.isPositive().toField(), 1]] };
        }
        static toJSON(x) {
            if (x.toString() === '1')
                return 'Positive';
            if (x.neg().toString() === '1')
                return 'Negative';
            throw Error(`Invalid Sign: ${x}`);
        }
        static fromJSON(x) {
            return (x === 'Positive' ? new Sign((0, wrapped_js_1.Field)(1)) : new Sign((0, wrapped_js_1.Field)(-1)));
        }
        neg() {
            return new Sign(this.value.neg());
        }
        mul(y) {
            return new Sign(this.value.mul(y.value));
        }
        isPositive() {
            return this.value.equals(1);
        }
        isNegative() {
            return this.value.equals(-1);
        }
        toString() {
            return this.value.toString();
        }
        static toValue(x) {
            return x.value.toBigInt();
        }
        static fromValue(x) {
            if (x instanceof Sign)
                return x;
            return new Sign((0, wrapped_js_1.Field)(x));
        }
        constructor() {
            super(...arguments);
            __runInitializers(this, _value_extraInitializers);
        }
    };
})();
exports.Sign = Sign;
/**
 * A 64 bit signed integer with values ranging from -18,446,744,073,709,551,615 to 18,446,744,073,709,551,615.
 */
let Int64 = (() => {
    let _classSuper = circuit_value_js_1.CircuitValue;
    let _magnitude_decorators;
    let _magnitude_initializers = [];
    let _magnitude_extraInitializers = [];
    let _sgn_decorators;
    let _sgn_initializers = [];
    let _sgn_extraInitializers = [];
    return class Int64 extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _magnitude_decorators = [circuit_value_js_1.prop];
            _sgn_decorators = [circuit_value_js_1.prop];
            __esDecorate(null, null, _magnitude_decorators, { kind: "field", name: "magnitude", static: false, private: false, access: { has: obj => "magnitude" in obj, get: obj => obj.magnitude, set: (obj, value) => { obj.magnitude = value; } }, metadata: _metadata }, _magnitude_initializers, _magnitude_extraInitializers);
            __esDecorate(null, null, _sgn_decorators, { kind: "field", name: "sgn", static: false, private: false, access: { has: obj => "sgn" in obj, get: obj => obj.sgn, set: (obj, value) => { obj.sgn = value; } }, metadata: _metadata }, _sgn_initializers, _sgn_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        // * in the range [-2^64+1, 2^64-1], unlike a normal int64
        // * under- and overflowing is disallowed, similar to UInt64, unlike a normal int64
        magnitude = __runInitializers(this, _magnitude_initializers, void 0); // absolute value
        sgn = (__runInitializers(this, _magnitude_extraInitializers), __runInitializers(this, _sgn_initializers, void 0)); // +/- 1
        // Some thoughts regarding the representation as field elements:
        // toFields returns the in-circuit representation, so the main objective is to minimize the number of constraints
        // that result from this representation. Therefore, I think the only candidate for an efficient 1-field representation
        // is the one where the Int64 is the field: toFields = Int64 => [Int64.magnitude.mul(Int64.sign)]. Anything else involving
        // bit packing would just lead to very inefficient circuit operations.
        //
        // So, is magnitude * sign ("1-field") a more efficient representation than (magnitude, sign) ("2-field")?
        // Several common operations like add, mul, etc, operate on 1-field so in 2-field they result in one additional multiplication
        // constraint per operand. However, the check operation (constraining to 64 bits + a sign) which is called at the introduction
        // of every witness, and also at the end of add, mul, etc, operates on 2-field. So here, the 1-field representation needs
        // to add an additional magnitude * sign = Int64 multiplication constraint, which will typically cancel out most of the gains
        // achieved by 1-field elsewhere.
        // There are some notable operations for which 2-field is definitely better:
        //
        // * div and mod (which do integer division with rounding on the magnitude)
        // * converting the Int64 to a Currency.Amount.Signed (for the zkapp balance), which has the exact same (magnitude, sign) representation we use here.
        //
        // The second point is one of the main things an Int64 is used for, and was the original motivation to use 2 fields.
        // Overall, I think the existing implementation is the optimal one.
        /**
         * @deprecated Use {@link Int64.create} for safe creation.
         *
         * WARNING: This constructor allows for ambiguous representation of zero (both +0 and -0).
         * This can lead to unexpected behavior in operations like {@link isPositive()} and {@link mod()}.
         *
         * Security Implications:
         * 1. A malicious prover could choose either positive or negative zero.
         * 2. Arithmetic operations that result in 0 may allow an attacker to arbitrarily choose the sign.
         * 3. This ambiguity could be exploited in protocols using Int64s for calculations like PNL tracking.
         *
         * Recommended Fix:
         * Use Int64.create() which enforces a canonical representation of zero, or
         * explicitly handle the zero case in operations like mod().
         *
         * @param magnitude - The magnitude of the integer as a UInt64.
         * @param [sgn=Sign.one] - The sign of the integer. Default is positive (Sign.one).
         */
        constructor(magnitude, sgn = Sign.one) {
            super(magnitude, sgn);
            __runInitializers(this, _sgn_extraInitializers);
        }
        /**
         * Safely creates a new Int64 instance, enforcing canonical representation of zero.
         * This is the recommended way to create Int64 instances.
         *
         * @param magnitude - The magnitude of the integer as a UInt64
         * @param sign - The sign of the integer.
         * @returns A new Int64 instance with a canonical representation.
         *
         * @example
         * ```ts
         * const x = Int64.create(0); // canonical representation of zero
         * ```
         */
        static create(magnitude, sign = Sign.one) {
            const mag = UInt64.from(magnitude);
            const isZero = mag.equals(UInt64.zero);
            const canonicalSign = provable_js_1.Provable.if(isZero, Sign.one, sign);
            return new Int64(mag, canonicalSign);
        }
        /**
         * Creates a new {@link Int64} from a {@link Field}.
         *
         * Does check if the {@link Field} is within range.
         */
        static fromFieldUnchecked(x) {
            let TWO64 = 1n << 64n;
            let xBigInt = x.toBigInt();
            let isValidPositive = xBigInt < TWO64; // covers {0,...,2^64 - 1}
            let isValidNegative = wrapped_js_1.Field.ORDER - xBigInt < TWO64; // {-2^64 + 1,...,-1}
            if (!isValidPositive && !isValidNegative)
                throw Error(`Int64: Expected a value between (-2^64, 2^64), got ${x}`);
            let magnitude = (isValidPositive ? x : x.neg()).toConstant();
            let sign = isValidPositive ? Sign.one : Sign.minusOne;
            return Int64.create(UInt64.Unsafe.fromField(magnitude), sign);
        }
        // this doesn't check ranges because we assume they're already checked on UInts
        /**
         * Creates a new {@link Int64} from a {@link Field}.
         *
         * **Does not** check if the {@link Field} is within range.
         */
        static fromUnsigned(x) {
            return Int64.create(x instanceof UInt32 ? x.toUInt64() : x);
        }
        // this checks the range if the argument is a constant
        /**
         * Creates a new {@link Int64}.
         *
         * Check the range if the argument is a constant.
         */
        static from(x) {
            if (x instanceof Int64)
                return x;
            if (x instanceof UInt64 || x instanceof UInt32) {
                return Int64.fromUnsigned(x);
            }
            return Int64.fromFieldUnchecked((0, wrapped_js_1.Field)(x));
        }
        static Unsafe = {
            fromObject(obj) {
                return circuit_value_js_1.CircuitValue.fromObject.call(Int64, obj);
            },
        };
        fromObject(obj) {
            return Int64.create(UInt64.from(obj.magnitude), Sign.fromValue(obj.sgn));
        }
        /**
         * Turns the {@link Int64} into a BigInt.
         */
        toBigint() {
            let abs = this.magnitude.toBigInt();
            let sgn = this.sgn.isPositive().toBoolean() ? 1n : -1n;
            return sgn * abs;
        }
        /**
         * Turns the {@link Int64} into a string.
         */
        toString() {
            return this.toBigint().toString();
        }
        isConstant() {
            return this.magnitude.value.isConstant() && this.sgn.isConstant();
        }
        // --- circuit-compatible operations below ---
        // the assumption here is that all Int64 values that appear in a circuit are already checked as valid
        // this is because Provable.witness calls .check, which calls .check on each prop, i.e. UInt64 and Sign
        // so we only have to do additional checks if an operation on valid inputs can have an invalid outcome (example: overflow)
        /**
         * Static method to create a {@link Int64} with value `0`.
         */
        static get zero() {
            return Int64.create(UInt64.zero);
        }
        /**
         * Static method to create a {@link Int64} with value `1`.
         */
        static get one() {
            return Int64.create(UInt64.one);
        }
        /**
         * Static method to create a {@link Int64} with value `-1`.
         */
        static get minusOne() {
            return Int64.create(UInt64.one).neg();
        }
        /**
         * Returns the {@link Field} value.
         */
        toField() {
            return this.magnitude.value.mul(this.sgn.value);
        }
        /**
         * Static method to create a {@link Int64} from a {@link Field}.
         */
        static fromField(x) {
            // constant case - just return unchecked value
            if (x.isConstant())
                return Int64.fromFieldUnchecked(x);
            // variable case - create a new checked witness and prove consistency with original field
            let xInt = provable_js_1.Provable.witness(Int64, () => Int64.fromFieldUnchecked(x));
            xInt.toField().assertEquals(x); // sign(x) * |x| === x
            return xInt;
        }
        /**
         * Negates the current Int64 value.
         *
         * This method returns a new Int64 instance with the opposite sign of the current value.
         * If the current value is zero, it returns zero.
         *
         * @returns A new Int64 instance with the negated value.
         *
         * @example
         * ```ts
         * Int64.from(5).neg();
         * ```
         *
         * @see {@link Int64.from} for creating Int64 instances
         * @see {@link Int64.zero} for the zero constant
         *
         * @throws {Error} Implicitly, if the internal Provable.if condition fails
         */
        neg() {
            return provable_js_1.Provable.if(this.magnitude.value.equals(0), Int64.zero, new Int64(this.magnitude, this.sgn.neg()));
        }
        /**
         * Addition with overflow checking.
         */
        add(y) {
            let y_ = Int64.from(y);
            return Int64.fromField(this.toField().add(y_.toField()));
        }
        /**
         * Subtraction with underflow checking.
         */
        sub(y) {
            let y_ = Int64.from(y);
            return Int64.fromField(this.toField().sub(y_.toField()));
        }
        /**
         * Multiplication with overflow checking.
         */
        mul(y) {
            let y_ = Int64.from(y);
            return Int64.fromField(this.toField().mul(y_.toField()));
        }
        /**
         * Integer division with canonical zero representation.
         *
         * @param y - The divisor. Can be an Int64, number, string, bigint, UInt64, or UInt32.
         * @returns A new Int64 representing the quotient, with canonical zero representation.
         *
         * `x.div(y)` returns the floor of `x / y`, that is, the greatest
         * *`z`* such that *`z * y <= x`.
         * On negative numbers, this rounds towards zero.
         *
         * This method guarantees that all results, including zero, have a consistent
         * representation, eliminating potential ambiguities in zero handling.
         */
        div(y) {
            let y_ = Int64.from(y);
            let { quotient } = this.magnitude.divMod(y_.magnitude);
            let sign = this.sgn.mul(y_.sgn);
            return Int64.create(quotient, sign);
        }
        /**
         * Calculates the integer remainder of this Int64 divided by the given value.
         *
         * The result `z` satisfies the following conditions:
         * 1. 0 <= z < |y|
         * 2. x - z is divisible by y
         *
         * Note: This method follows the "truncate toward zero" convention for negative numbers.
         *
         * @param y - The divisor. Will be converted to UInt64 if not already.
         * @returns A new Int64 instance representing the remainder.
         *
         * @example
         * ```ts
         * const x1 = Int64.from(17);
         * const y1 = UInt64.from(5);
         * console.log(x1.mod(y1).toString()); // Output: 2
         * ```
         *
         * @throws {Error} Implicitly, if y is zero or negative.
         */
        mod(y) {
            let y_ = UInt64.from(y);
            let rest = this.magnitude.divMod(y_).rest.value;
            let isNonNegative = this.isNonNegative();
            rest = provable_js_1.Provable.if(isNonNegative.or(rest.equals(0)), rest, y_.value.sub(rest));
            return new Int64(new UInt64(rest.value));
        }
        /**
         * Checks if two values are equal.
         */
        equals(y) {
            let y_ = Int64.from(y);
            return this.toField().equals(y_.toField());
        }
        /**
         * Asserts that two values are equal.
         */
        assertEquals(y, message) {
            let y_ = Int64.from(y);
            this.toField().assertEquals(y_.toField(), message);
        }
        /**
         * Checks if the value is strictly positive (x > 0).
         *
         * @returns True if the value is greater than zero, false otherwise.
         *
         * @remarks
         * This method considers zero as non-positive. It ensures consistency
         * with the mathematical definition of "positive" as strictly greater than zero.
         * This differs from some other methods which may treat zero as non-negative.
         */
        isPositive() {
            return this.magnitude.equals(UInt64.zero).not().and(this.sgn.isPositive());
        }
        /**
         * Checks if the value is non-negative (x >= 0).
         */
        isNonNegative() {
            return this.sgn.isPositive();
        }
        // then it will be the correct logic; right now it would be misleading
        /**
         * Checks if the value is negative (x < 0).
         */
        isNegative() {
            return this.sgn.isNegative();
        }
        static check({ magnitude, sgn }) {
            // check that the magnitude is in range
            UInt64.check(magnitude);
            // check that the sign is valid
            Sign.check(sgn);
            // check unique representation of 0: we can't have magnitude = 0 and sgn = -1
            // magnitude + sign != -1 (this check works because magnitude >= 0)
            magnitude.value.add(sgn.value).assertNotEquals(-1, 'Int64: 0 must have positive sign');
        }
    };
})();
exports.Int64 = Int64;
/**
 * A 8 bit unsigned integer with values ranging from 0 to 255.
 */
class UInt8 extends (0, struct_js_1.Struct)({
    value: wrapped_js_1.Field,
}) {
    static NUM_BITS = 8;
    /**
     * Create a {@link UInt8} from a bigint or number.
     * The max value of a {@link UInt8} is `2^8 - 1 = 255`.
     *
     * **Warning**: Cannot overflow past 255, an error is thrown if the result is greater than 255.
     */
    constructor(x) {
        if (x instanceof UInt8)
            x = x.value.value;
        super({ value: (0, wrapped_js_1.Field)(x) });
        UInt8.checkConstant(this.value);
    }
    static Unsafe = {
        /**
         * Create a {@link UInt8} from a {@link Field} without constraining its range.
         *
         * **Warning**: This is unsafe, because it does not prove that the input {@link Field} actually fits in 8 bits.\
         * Only use this if you know what you are doing, otherwise use the safe {@link UInt8.from}.
         */
        fromField(x) {
            return new UInt8(x.value);
        },
    };
    /**
     * Static method to create a {@link UInt8} with value `0`.
     */
    static get zero() {
        return new UInt8(0);
    }
    /**
     * Static method to create a {@link UInt8} with value `1`.
     */
    static get one() {
        return new UInt8(1);
    }
    /**
     * Add a {@link UInt8} to another {@link UInt8} without allowing overflow.
     *
     * @example
     * ```ts
     * const x = UInt8.from(3);
     * const sum = x.add(5);
     * sum.assertEquals(8);
     * ```
     *
     * @throws if the result is greater than 255.
     */
    add(y) {
        let z = this.value.add(UInt8.from(y).value);
        RangeCheck.rangeCheck8(z);
        return UInt8.Unsafe.fromField(z);
    }
    /**
     * Subtract a {@link UInt8} from another {@link UInt8} without allowing underflow.
     *
     * @example
     * ```ts
     * const x = UInt8.from(8);
     * const difference = x.sub(5);
     * difference.assertEquals(3);
     * ```
     *
     * @throws if the result is less than 0.
     */
    sub(y) {
        let z = this.value.sub(UInt8.from(y).value);
        RangeCheck.rangeCheck8(z);
        return UInt8.Unsafe.fromField(z);
    }
    /**
     * Multiply a {@link UInt8} by another {@link UInt8} without allowing overflow.
     *
     * @example
     * ```ts
     * const x = UInt8.from(3);
     * const product = x.mul(5);
     * product.assertEquals(15);
     * ```
     *
     * @throws if the result is greater than 255.
     */
    mul(y) {
        let z = this.value.mul(UInt8.from(y).value);
        RangeCheck.rangeCheck8(z);
        return UInt8.Unsafe.fromField(z);
    }
    /**
     * Divide a {@link UInt8} by another {@link UInt8}.
     * This is integer division that rounds down.
     *
     * @example
     * ```ts
     * const x = UInt8.from(7);
     * const quotient = x.div(2);
     * quotient.assertEquals(3);
     * ```
     */
    div(y) {
        return this.divMod(y).quotient;
    }
    /**
     * Get the remainder a {@link UInt8} of division of another {@link UInt8}.
     *
     * @example
     * ```ts
     * const x = UInt8.from(50);
     * const mod = x.mod(30);
     * mod.assertEquals(20);
     * ```
     */
    mod(y) {
        return this.divMod(y).remainder;
    }
    /**
     * Get the quotient and remainder of a {@link UInt8} divided by another {@link UInt8}:
     *
     * `x == y * q + r`, where `0 <= r < y`.
     *
     * @param y - a {@link UInt8} to get the quotient and remainder of another {@link UInt8}.
     *
     * @return The quotient `q` and remainder `r`.
     */
    divMod(y) {
        let x = this.value;
        let y_ = UInt8.from(y).value.seal();
        if (this.value.isConstant() && y_.isConstant()) {
            let xn = x.toBigInt();
            let yn = y_.toBigInt();
            let q = xn / yn;
            let r = xn - q * yn;
            return { quotient: UInt8.from(q), remainder: UInt8.from(r) };
        }
        // prove that x === q * y + r, where 0 <= r < y
        let q = provable_js_1.Provable.witness(wrapped_js_1.Field, () => (0, wrapped_js_1.Field)(x.toBigInt() / y_.toBigInt()));
        let r = x.sub(q.mul(y_)).seal();
        // q, r being 16 bits is enough for them to be 8 bits,
        // thanks to the === x check and the r < y check below
        RangeCheck.rangeCheck16(q);
        RangeCheck.rangeCheck16(r);
        let remainder = UInt8.Unsafe.fromField(r);
        let quotient = UInt8.Unsafe.fromField(q);
        remainder.assertLessThan(y);
        return { quotient, remainder };
    }
    /**
     * Bitwise XOR gadget on {@link Field} elements. Equivalent to the [bitwise XOR `^` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR).
     * A XOR gate works by comparing two bits and returning `1` if two bits differ, and `0` if two bits are equal.
     *
     * This gadget builds a chain of XOR gates recursively.
     *
     * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#xor-1)
     *
     * @param x {@link UInt8} element to XOR.
     *
     * @example
     * ```ts
     * let a = UInt8.from(0b0101);
     * let b = UInt8.from(0b0011);
     *
     * let c = a.xor(b);
     * c.assertEquals(0b0110);
     * ```
     */
    xor(x) {
        return new UInt8(Bitwise.xor(this.value, x.value, UInt8.NUM_BITS).value);
    }
    /**
     * Bitwise NOT gate on {@link Field} elements. Similar to the [bitwise
     * NOT `~` operator in JavaScript](https://developer.mozilla.org/en-US/docs/
     * Web/JavaScript/Reference/Operators/Bitwise_NOT).
     *
     * **Note:** The NOT gate operates over 8 bit for UInt8 types.
     *
     * A NOT gate works by returning `1` in each bit position if the
     * corresponding bit of the operand is `0`, and returning `0` if the
     * corresponding bit of the operand is `1`.
     *
     * NOT is implemented as a subtraction of the input from the all one bitmask
     *
     * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#not)
     *
     * @example
     * ```ts
     * // NOTing 4 bits with the unchecked version
     * let a = UInt8.from(0b0101);
     * let b = a.not();
     *
     * console.log(b.toBigInt().toString(2));
     * // 11111010
     *
     * ```
     *
     */
    not() {
        return new UInt8(Bitwise.not(this.value, UInt8.NUM_BITS, false).value);
    }
    /**
     * Bitwise AND gadget on {@link UInt8} elements. Equivalent to the [bitwise AND `&` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND).
     * The AND gate works by comparing two bits and returning `1` if both bits are `1`, and `0` otherwise.
     *
     * It can be checked by a double generic gate that verifies the following relationship between the values below.
     *
     * The generic gate verifies:\
     * `a + b = sum` and the conjunction equation `2 * and = sum - xor`\
     * Where:\
     * `a + b = sum`\
     * `a ^ b = xor`\
     * `a & b = and`
     *
     * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#and)
     *
     *
     * @example
     * ```typescript
     * let a = UInt8.from(3);    // ... 000011
     * let b = UInt8.from(5);    // ... 000101
     *
     * let c = a.and(b);    // ... 000001
     * c.assertEquals(1);
     * ```
     */
    and(x) {
        return new UInt8(Bitwise.and(this.value, x.value, UInt8.NUM_BITS).value);
    }
    /**
     * Bitwise OR gadget on {@link UInt8} elements. Equivalent to the [bitwise OR `|` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_OR).
     * The OR gate works by comparing two bits and returning `1` if at least one bit is `1`, and `0` otherwise.
     *
     * @example
     * ```typescript
     * let a = UInt8.from(3);    // ... 000011
     * let b = UInt8.from(5);    // ... 000101
     *
     * let c = a.or(b);    // ... 000111
     * c.assertEquals(7);
     * ```
     */
    or(x) {
        return new UInt8(Bitwise.or(this.value, x.value, UInt8.NUM_BITS).value);
    }
    /**
     * Check if this {@link UInt8} is less than or equal to another {@link UInt8} value.
     * Returns a {@link Bool}.
     *
     * @example
     * ```ts
     * UInt8.from(3).lessThanOrEqual(UInt8.from(5));
     * ```
     */
    lessThanOrEqual(y) {
        let y_ = UInt8.from(y);
        if (this.value.isConstant() && y_.value.isConstant()) {
            return (0, wrapped_js_1.Bool)(this.toBigInt() <= y_.toBigInt());
        }
        return (0, comparison_js_1.lessThanOrEqualGeneric)(this.value, y_.value, 1n << 8n, RangeCheck.rangeCheck8);
    }
    /**
     * Check if this {@link UInt8} is less than another {@link UInt8} value.
     * Returns a {@link Bool}.
     *
     * @example
     * ```ts
     * UInt8.from(2).lessThan(UInt8.from(3));
     * ```
     */
    lessThan(y) {
        let y_ = UInt8.from(y);
        if (this.value.isConstant() && y_.value.isConstant()) {
            return (0, wrapped_js_1.Bool)(this.toBigInt() < y_.toBigInt());
        }
        return (0, comparison_js_1.lessThanGeneric)(this.value, y_.value, 1n << 8n, RangeCheck.rangeCheck8);
    }
    /**
     * Assert that this {@link UInt8} is less than another {@link UInt8} value.
     *
     * **Important**: If an assertion fails, the code throws an error.
     *
     * @param y - the {@link UInt8} value to compare & assert with this {@link UInt8}.
     * @param message - a string error message to print if the assertion fails, optional.
     */
    assertLessThan(y, message) {
        let y_ = UInt8.from(y);
        if (this.value.isConstant() && y_.value.isConstant()) {
            let [x0, y0] = [this.value.toBigInt(), y_.value.toBigInt()];
            return (0, assert_js_1.assert)(x0 < y0, message ?? `UInt8.assertLessThan: expected ${x0} < ${y0}`);
        }
        try {
            // 2^16 < p - 2^8, so we satisfy the assumption of `assertLessThanGeneric`
            (0, comparison_js_1.assertLessThanGeneric)(this.value, y_.value, RangeCheck.rangeCheck16);
        }
        catch (err) {
            throw (0, field_js_1.withMessage)(err, message);
        }
    }
    /**
     * Assert that this {@link UInt8} is less than or equal to another {@link UInt8} value.
     *
     * **Important**: If an assertion fails, the code throws an error.
     *
     * @param y - the {@link UInt8} value to compare & assert with this {@link UInt8}.
     * @param message - a string error message to print if the assertion fails, optional.
     */
    assertLessThanOrEqual(y, message) {
        let y_ = UInt8.from(y);
        if (this.value.isConstant() && y_.value.isConstant()) {
            let [x0, y0] = [this.value.toBigInt(), y_.value.toBigInt()];
            return (0, assert_js_1.assert)(x0 <= y0, message ?? `UInt8.assertLessThanOrEqual: expected ${x0} <= ${y0}`);
        }
        try {
            // 2^16 < p - 2^8, so we satisfy the assumption of `assertLessThanOrEqualGeneric`
            (0, comparison_js_1.assertLessThanOrEqualGeneric)(this.value, y_.value, RangeCheck.rangeCheck16);
        }
        catch (err) {
            throw (0, field_js_1.withMessage)(err, message);
        }
    }
    /**
     * Check if this {@link UInt8} is greater than another {@link UInt8}.
     * Returns a {@link Bool}.
     *
     * @example
     * ```ts
     * // 5 > 3
     * UInt8.from(5).greaterThan(3);
     * ```
     */
    greaterThan(y) {
        return UInt8.from(y).lessThan(this);
    }
    /**
     * Check if this {@link UInt8} is greater than or equal another {@link UInt8} value.
     * Returns a {@link Bool}.
     *
     * @example
     * ```ts
     * // 3 >= 3
     * UInt8.from(3).greaterThanOrEqual(3);
     * ```
     */
    greaterThanOrEqual(y) {
        return UInt8.from(y).lessThanOrEqual(this);
    }
    /**
     * Assert that this {@link UInt8} is greater than another {@link UInt8} value.
     *
     * **Important**: If an assertion fails, the code throws an error.
     *
     * @param y - the {@link UInt8} value to compare & assert with this {@link UInt8}.
     * @param message - a string error message to print if the assertion fails, optional.
     */
    assertGreaterThan(y, message) {
        UInt8.from(y).assertLessThan(this, message);
    }
    /**
     * Assert that this {@link UInt8} is greater than or equal to another {@link UInt8} value.
     *
     * **Important**: If an assertion fails, the code throws an error.
     *
     * @param y - the {@link UInt8} value to compare & assert with this {@link UInt8}.
     * @param message - a string error message to print if the assertion fails, optional.
     */
    assertGreaterThanOrEqual(y, message) {
        UInt8.from(y).assertLessThanOrEqual(this, message);
    }
    /**
     * Assert that this {@link UInt8} is equal another {@link UInt8} value.
     *
     * **Important**: If an assertion fails, the code throws an error.
     *
     * @param y - the {@link UInt8} value to compare & assert with this {@link UInt8}.
     * @param message - a string error message to print if the assertion fails, optional.
     */
    assertEquals(y, message) {
        let y_ = UInt8.from(y);
        this.value.assertEquals(y_.value, message);
    }
    /**
     * Serialize the {@link UInt8} to a string, e.g. for printing.
     *
     * **Warning**: This operation is not provable.
     */
    toString() {
        return this.value.toString();
    }
    /**
     * Serialize the {@link UInt8} to a number.
     *
     * **Warning**: This operation is not provable.
     */
    toNumber() {
        return Number(this.value.toBigInt());
    }
    /**
     * Serialize the {@link UInt8} to a bigint.
     *
     * **Warning**: This operation is not provable.
     */
    toBigInt() {
        return this.value.toBigInt();
    }
    /**
     * {@link Provable.check} for {@link UInt8}.
     * Proves that the input is in the [0, 255] range.
     */
    static check(x) {
        if (x instanceof wrapped_js_1.Field)
            x = { value: x };
        RangeCheck.rangeCheck8(x.value);
    }
    static toInput(x) {
        return { packed: [[x.value, 8]] };
    }
    /**
     * Turns a {@link UInt8} into a {@link UInt32}.
     */
    toUInt32() {
        return new UInt32(this.value.value);
    }
    /**
     * Turns a {@link UInt8} into a {@link UInt64}.
     */
    toUInt64() {
        return new UInt64(this.value.value);
    }
    /**
     * Creates a {@link UInt8} with a value of 255.
     */
    static MAXINT() {
        return new UInt8((1n << BigInt(UInt8.NUM_BITS)) - 1n);
    }
    /**
     * Creates a new {@link UInt8}.
     */
    static from(x) {
        if (x instanceof UInt8)
            return x;
        if (x instanceof UInt64 || x instanceof UInt32 || x instanceof wrapped_js_1.Field) {
            // if the input could be larger than 8 bits, we have to prove that it is not
            let xx = x instanceof wrapped_js_1.Field ? { value: x } : x;
            UInt8.check(xx);
            return new UInt8(xx.value.value);
        }
        return new UInt8(x);
    }
    static fromValue(
    // we need all the { value } inputs to correctly extend the Struct
    x) {
        if (typeof x === 'number')
            return UInt8.from(x);
        if (x instanceof UInt8)
            return x;
        return UInt8.Unsafe.fromField((0, wrapped_js_1.Field)(x.value));
    }
    static checkConstant(x) {
        if (!x.isConstant())
            return;
        RangeCheck.rangeCheck8(x);
    }
    isConstant() {
        return this.value.isConstant();
    }
    /**
     * Returns an array of {@link Bool} elements representing [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of this {@link UInt8} element.
     *
     * If you use the optional `length` argument, proves that the UInt8 element fits in `length` bits.
     * The `length` has to be between 0 and 8 and the method throws if it isn't.
     *
     * **Warning**: The cost of this operation in a zk proof depends on the `length` you specify,
     * which by default is 8 bits. Prefer to pass a smaller `length` if possible.
     *
     * @param length - the number of bits to fit the element. If the element does not fit in `length` bits, the functions throws an error.
     *
     * @return An array of {@link Bool} element representing little endian binary representation of this {@link UInt8}.
     */
    toBits(length = 8) {
        (0, field_js_1.checkBitLength)('UInt8.toBits()', length, 8);
        if (this.isConstant()) {
            let bits = field_bigint_js_1.BinableFp.toBits(this.toBigInt());
            if (bits.slice(length).some((bit) => bit))
                throw Error(`UInt8.toBits(): ${this} does not fit in ${length} bits`);
            return bits.slice(0, length).map((b) => new wrapped_js_1.Bool(b));
        }
        return this.value.toBits(length);
    }
    /**
     * Convert a bit array into a {@link UInt8} element using [little endian binary representation](https://en.wikipedia.org/wiki/Endianness)
     *
     * The method throws if the given bits do not fit in a single UInt8 element. In this case, no more than 8 bits are allowed.
     *
     * **Important**: If the given `bits` array is an array of `booleans` or {@link Bool} elements that all are `constant`,
     *  the resulting {@link UInt8} element will be a constant as well. Or else, if the given array is a mixture of constants and variables of {@link Bool} type,
     *  the resulting {@link UInt8} will be a variable as well.
     *
     * @param bits - An array of {@link Bool} or `boolean` type.
     *
     * @return A {@link UInt8} element matching the [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of the given `bits` array.
     */
    static fromBits(bits) {
        const length = bits.length;
        (0, field_js_1.checkBitLength)('UInt8.fromBits()', length, 8);
        return UInt8.Unsafe.fromField(wrapped_js_1.Field.fromBits(bits));
    }
}
exports.UInt8 = UInt8;
