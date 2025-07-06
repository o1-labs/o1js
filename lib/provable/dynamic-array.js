"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _DynamicArrayBase_instances, _DynamicArrayBase_indexMasks, _DynamicArrayBase_indicesInRange, _DynamicArrayBase_dummies, _DynamicArrayBase_indexMask, _DynamicArrayBase_dummyMask;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicArray = void 0;
/*
 * Array type inspired by zksecurity's implementation at
 * https://github.com/zksecurity/mina-attestations and
 * gretke's at https://github.com/gretzke/zkApp-data-types
 */
const bool_js_1 = require("./bool.js");
const field_js_1 = require("./field.js");
const provable_js_1 = require("./provable.js");
const provable_derivers_js_1 = require("./types/provable-derivers.js");
const option_js_1 = require("./option.js");
const provable_intf_js_1 = require("./types/provable-intf.js");
const common_js_1 = require("./gadgets/common.js");
const arrays_js_1 = require("../util/arrays.js");
const basic_js_1 = require("./gadgets/basic.js");
/**
 * Dynamic-length array type that has a
 * - constant maximum capacity, but
 * - dynamic actual length
 *
 * ```ts
 * const Bytes = DynamicArray(UInt8, { capacity: 32 });
 * ```
 *
 * `capacity` can be any number from 0 to 2^16-1.
 *
 * **Details**: Internally, this is represented as a static-sized array, plus a
 * Field element that represents the length.
 * The _only_ requirement on these is that the length is less or equal capacity.
 * In particular, there are no provable guarantees maintained on the content of
 * the static-sized array beyond the actual length. Instead, our methods ensure
 * integrity of array operations _within_ the actual length.
 */
function DynamicArray(type, { capacity, }) {
    let innerType = provable_intf_js_1.ProvableType.get(type);
    // assert capacity bounds
    (0, common_js_1.assert)(capacity >= 0, 'DynamicArray(): capacity must be >= 0');
    (0, common_js_1.assert)(capacity < 2 ** 16, 'DynamicArray(): capacity must be < 2^16');
    class DynamicArray_ extends DynamicArrayBase {
        get innerType() {
            return innerType;
        }
        static get capacity() {
            return capacity;
        }
        static get provable() {
            return provableArray;
        }
        static from(input) {
            return provableArray.fromValue(input);
        }
    }
    const provableArray = provable(innerType, DynamicArray_);
    return DynamicArray_;
}
exports.DynamicArray = DynamicArray;
class DynamicArrayBase {
    // properties to override in subclass
    get innerType() {
        throw Error('Inner type must be defined in a subclass');
    }
    static get capacity() {
        throw Error('Capacity must be defined in a subclass');
    }
    // derived property
    get capacity() {
        return this.constructor.capacity;
    }
    get Constructor() {
        return this.constructor;
    }
    /**
     * Create a new {@link DynamicArrayBase} instance from an optional list of
     * {@link ProvableValue} elements, and optional length.
     *
     * - If no parameters are passed, it creates an empty array of length 0.
     * - If only `array` is passed, it creates a new array with the elements
     *   of the array.
     * - If only `length` is passed, it creates a dummy array of the given length
     *   filled with NULL values.
     * - If both `array` and `length` are passed, it creates a new array with the
     *   elements of the array, and the length of the dynamic array is set to the
     *   `length` passed, which should be less or equal than the length of the
     *   `array` passed (this is to allow for arrays with dummy values at the end).
     * - In any case, if `length` is larger than the capacity, it throws.
     *
     * @example
     * ```ts
     * let arr = new DynamicArray([new Field(1), new Field(2), new Field(3)]);
     * let empty = new DynamicArray();
     * ```
     *
     * Note: this is different from `ProvableValue[]` because it is a provable type.
     */
    constructor(array, length) {
        _DynamicArrayBase_instances.add(this);
        // cached variables to not duplicate constraints if we do something like
        // array.get(i), array.set(i, ..) on the same index
        _DynamicArrayBase_indexMasks.set(this, new Map());
        _DynamicArrayBase_indicesInRange.set(this, new Set());
        _DynamicArrayBase_dummies.set(this, void 0);
        const NULL = provable_intf_js_1.ProvableType.synthesize(this.innerType);
        const a = array ?? [];
        const l = length ?? new field_js_1.Field(a.length);
        (0, common_js_1.assert)(a.length <= this.capacity, 'DynamicArray(): array must not exceed capacity');
        if (length?.isConstant()) {
            (0, common_js_1.assert)(l.toBigInt() <= BigInt(a.length), 'DynamicArray(): length must be at most as long as the array');
        }
        this.array = (0, arrays_js_1.pad)(a, this.capacity, NULL);
        this.length = l;
    }
    /**
     * In-circuit assertion that the given index is within the bounds of the
     * dynamic array.
     * Asserts 0 <= i < this.length, using a cached check that's not
     * duplicated when doing it on the same variable multiple times, failing
     * with an error message otherwise.
     *
     * @param i - the index to check
     * @param message - optional error message to use in case the assertion fails
     */
    assertIndexInRange(i, message) {
        let errorMessage = message ?? `assertIndexInRange(): index must be in range [0, length]`;
        if (!__classPrivateFieldGet(this, _DynamicArrayBase_indicesInRange, "f").has(i)) {
            if (i.isConstant() && this.length.isConstant()) {
                (0, common_js_1.assert)(i.toBigInt() < this.length.toBigInt(), errorMessage);
            }
            i.assertLessThan(this.length, errorMessage);
            __classPrivateFieldGet(this, _DynamicArrayBase_indicesInRange, "f").add(i);
        }
    }
    /**
     * Gets value at index i, and proves that the index is in the array.
     * It uses an internal cache to avoid duplication of constraints when the
     * same index is used multiple times.
     */
    get(i) {
        this.assertIndexInRange(i);
        return this.getOrUnconstrained(i);
    }
    /**
     * Gets a value at index i, as an option that is None if the index is not in
     * the array.
     *
     * Note: The correct type for `i` is actually UInt16 which doesn't exist. The
     * method is not complete (but sound) for i >= 2^16. This means that if the
     * index is larger than 2^16, the constraints could be satisfiable but the
     * result is not correct (because the capacity can at most be 2^16).
     */
    getOption(i) {
        let type = this.innerType;
        let isContained = i.lessThan(this.length);
        let value = this.getOrUnconstrained(i);
        const OptionT = (0, option_js_1.Option)(type);
        return OptionT.fromValue({ isSome: isContained, value });
    }
    /**
     * Gets a value at index i, ASSUMING that the index is in the array.
     *
     * If the index is in fact not in the array, the return value is completely
     * unconstrained.
     *
     * **Warning**: Only use this if you already know/proved by other means that
     * the index is within bounds.
     */
    getOrUnconstrained(i) {
        let type = this.innerType;
        let NULL = provable_intf_js_1.ProvableType.synthesize(type);
        let ai = provable_js_1.Provable.witness(type, () => this.array[Number(i)] ?? NULL);
        let aiFields = type.toFields(ai);
        // assert a is correct on every field column with arrayGet()
        let fields = this.array.map((t) => type.toFields(t));
        // this allows each array entry to be larger than a single field element
        for (let j = 0; j < type.sizeInFields(); j++) {
            let column = fields.map((x) => x[j]);
            (0, basic_js_1.arrayGet)(column, i).assertEquals(aiFields[j]);
        }
        return ai;
    }
    /**
     * Sets a value at index i and proves that the index is in the array.
     */
    set(i, value, message) {
        let errorMessage = message ?? `set(): index must be in range [0, length]`;
        this.assertIndexInRange(i, errorMessage);
        this.setOrDoNothing(i, value);
    }
    /**
     * Sets a value at index i, or does nothing if the index is not in the array
     */
    setOrDoNothing(i, value) {
        (0, arrays_js_1.zip)(this.array, __classPrivateFieldGet(this, _DynamicArrayBase_instances, "m", _DynamicArrayBase_indexMask).call(this, i)).forEach(([t, equalsIJ], i) => {
            this.array[i] = provable_js_1.Provable.if(equalsIJ, this.innerType, value, t);
        });
    }
    /**
     * Map every element of the array to a new value.
     *
     * **Warning**: The callback will be passed unconstrained dummy values.
     */
    map(type, f) {
        let Array = DynamicArray(type, { capacity: this.capacity });
        let provable = provable_intf_js_1.ProvableType.get(type);
        let array = this.array.map((x) => provable.fromValue(f(x)));
        let newArray = new Array(array, this.length);
        // new array has same length/capacity, so it can use the same cached masks
        __classPrivateFieldSet(newArray, _DynamicArrayBase_indexMasks, __classPrivateFieldGet(this, _DynamicArrayBase_indexMasks, "f"), "f");
        __classPrivateFieldSet(newArray, _DynamicArrayBase_indicesInRange, __classPrivateFieldGet(this, _DynamicArrayBase_indicesInRange, "f"), "f");
        __classPrivateFieldSet(newArray, _DynamicArrayBase_dummies, __classPrivateFieldGet(this, _DynamicArrayBase_dummies, "f"), "f");
        return newArray;
    }
    /**
     * Iterate over all elements of the array.
     *
     * The callback will be passed an element and a boolean `isDummy` indicating
     * whether the value is part of the actual array.
     */
    forEach(f) {
        (0, arrays_js_1.zip)(this.array, __classPrivateFieldGet(this, _DynamicArrayBase_instances, "m", _DynamicArrayBase_dummyMask).call(this)).forEach(([t, isDummy]) => {
            f(t, isDummy);
        });
    }
    /**
     * Return a version of the same array with a larger capacity.
     *
     * **Warning**: Does not modify the array, but returns a new one.
     *
     * **Note**: this doesn't cost constraints, but currently doesn't preserve any
     * cached constraints.
     *
     * @param capacity - the new capacity of the array
     */
    growCapacityTo(capacity, message) {
        let errorMessage = message ??
            `growCapacityTo: new capacity ${capacity} must be greater than current capacity ${this.capacity}`;
        (0, common_js_1.assert)(capacity >= this.capacity, errorMessage);
        let NewArray = DynamicArray(this.innerType, { capacity });
        let NULL = provable_intf_js_1.ProvableType.synthesize(this.innerType);
        let array = (0, arrays_js_1.pad)(this.array, capacity, NULL);
        return new NewArray(array, this.length);
    }
    /**
     * Return a version of the same array with a larger capacity.
     *
     * **Warning**: Does not modify the array, but returns a new one.
     *
     * **Note**: this doesn't cost constraints, but currently doesn't preserve any
     * cached constraints.
     *
     * @param increment - the amount to increase the capacity by
     */
    growCapacityBy(increment) {
        return this.growCapacityTo(this.capacity + increment);
    }
    /**
     * Increments the length of the current array by n elements, checking that the
     * new length is within the capacity, failing with the error message otherwise.
     *
     * @param n - the number of elements to increase the length by
     * @param message - optional error message to use in case the assertion fails
     */
    increaseLengthBy(n, message) {
        let errorMessage = message ??
            `increaseLengthBy: cannot increase length because provided n would exceed capacity ${this.capacity}.`;
        let newLength = this.length.add(n).seal();
        newLength.assertLessThanOrEqual(new field_js_1.Field(this.capacity), errorMessage);
        this.length = newLength;
    }
    /**
     * Decrements the length of the current array by `n` elements, checking that
     * the `n` is less or equal than the current length, failing with the error
     * message otherwise.
     *
     * @param n - the number of elements to decrease the length by
     * @param message - optional error message to use in case the assertion fails
     */
    decreaseLengthBy(n, message) {
        let errorMessage = message ??
            `decreaseLengthBy: cannot decrease length because provided n is larger than current array length`;
        let oldLength = this.length;
        n.assertLessThanOrEqual(this.length, errorMessage);
        this.length = oldLength.sub(n).seal();
    }
    /**
     * Sets the length of the current array to a new value, checking that the
     * new length is less or equal than the capacity.
     *
     * An optional error message can be provided to be used in case the inner
     * assertion fails.
     *
     * @param newLength - the new length to set the array to
     * @param message - optional error message
     *
     * **Warning**: This does not change (add nor remove) the values of the array.
     */
    setLengthTo(n, message) {
        let errorMessage = message ?? `setLengthTo: cannot set length to n because it exceeds capacity ${this.capacity}`;
        n.assertLessThanOrEqual(new field_js_1.Field(this.capacity), errorMessage);
        this.length = n;
    }
    /**
     * Push a value, without changing the capacity.
     *
     * Proves that the new length is still within the capacity, fails otherwise.
     *
     * To grow the capacity along with the actual length, you can use:
     *
     * ```ts
     * array = array.growCapacityhBy(1);
     * array.push(value);
     * ```
     *
     * @param value - the value to push into the array
     * @param message - optional error message to use in case the assertion fails
     */
    push(value, message) {
        let errorMessage = message ?? `push(): cannot push value because it would exceed capacity ${this.capacity}.`;
        let oldLength = this.length;
        this.increaseLengthBy(new field_js_1.Field(1), errorMessage);
        this.setOrDoNothing(oldLength, value);
    }
    /**
     * Removes the last `n` elements from the dynamic array, decreasing the length
     * by n. If no amount is provided, only one element is popped. The popped
     * positions are set to NULL values.
     *
     * @param n - the number of elements to pop (one if not provided)
     * @param message - optional error message to use in case the assertion fails
     */
    pop(n, message) {
        let errorMessage = message ?? `pop(): cannot pop n elements because the length is smaller`;
        let dec = n !== undefined ? n : new field_js_1.Field(1);
        this.decreaseLengthBy(dec, errorMessage);
        let NULL = provable_intf_js_1.ProvableType.synthesize(this.innerType);
        if (n !== undefined) {
            // set the last n elements to NULL
            for (let i = 0; i < this.capacity; i++) {
                this.array[i] = provable_js_1.Provable.if(new field_js_1.Field(i).lessThanOrEqual(this.length), this.innerType, this.array[i], NULL);
            }
        }
        else {
            // set the last element to NULL
            this.setOrDoNothing(this.length, NULL);
        }
    }
    /**
     * In-circuit check whether the array is empty.
     *
     * @returns true or false depending on whether the dynamic array is empty
     */
    isEmpty() {
        return this.length.equals(0);
    }
    /**
     * Shifts all elements of the array to the left by `n` positions, reducing
     * the length by `n`, which must be less than or equal to the current length
     * (failing with an error message otherwise).
     *
     * @param n - the number of positions to shift left
     * @param message - optional error message to use in case the assertion fails
     */
    shiftLeft(n, message) {
        let errorMessage = message ?? `shiftLeft(): cannot shift left because provided n would exceed current length.`;
        let NULL = provable_intf_js_1.ProvableType.synthesize(this.innerType);
        for (let i = 0; i < this.capacity; i++) {
            let offset = new field_js_1.Field(i).add(n);
            this.array[i] = provable_js_1.Provable.if(offset.lessThan(this.length), this.innerType, this.getOrUnconstrained(offset), NULL);
        }
        this.decreaseLengthBy(n, errorMessage);
    }
    /**
     * Shifts all elements of the array to the right by `n` positions, increasing
     * the length by `n`, which must result in less than or equal to the capacity
     * (failing with an error message otherwise). The new elements on the left are
     * set to NULL values.
     *
     * @param n - the number of positions to shift right
     * @param message - optional error message to use in case the assertion fails
     */
    shiftRight(n, message) {
        let errorMessage = message ??
            `shiftRight(): cannot shift right because provided n would exceed capacity ${this.capacity}`;
        this.increaseLengthBy(n, errorMessage);
        let NULL = provable_intf_js_1.ProvableType.synthesize(this.innerType);
        for (let i = this.capacity - 1; i >= 0; i--) {
            let offset = new field_js_1.Field(i).sub(n);
            this.array[i] = provable_js_1.Provable.if(new field_js_1.Field(i).lessThan(n), this.innerType, NULL, this.getOrUnconstrained(offset));
        }
    }
    /**
     * Copies the current dynamic array, returning a new instance with the same
     * values and length.
     *
     * @returns a new DynamicArray instance with the same values as the current.
     *
     */
    copy() {
        let newArr = new this.constructor();
        newArr.array = this.array.slice();
        newArr.length = this.length;
        return newArr;
    }
    /**
     * Creates a new dynamic array with the values of the current array from
     * index `start` (included) to index `end` (excluded). If `start` is not
     * provided, it defaults to 0. If `end` is not provided, it defaults to the
     * length of the array.
     *
     * @param start - the starting index of the slice (inclusive)
     * @param end - the ending index of the slice (exclusive)
     *
     * @returns a new DynamicArray instance with the sliced values
     */
    slice(start, end) {
        start ?? (start = new field_js_1.Field(0));
        end ?? (end = this.length);
        let sliced = this.copy();
        sliced.shiftLeft(start, `slice(): provided start is greater than current length`);
        sliced.pop(this.length.sub(end), `slice(): provided end is greater than current length`);
        return sliced;
    }
    /**
     * Concatenates the current array with another dynamic array, returning a new
     * dynamic array with the values of both arrays. The capacity of the new array
     * is the sum of the capacities of the two arrays.
     *
     * @param other - the dynamic array to concatenate
     *
     * @returns a new DynamicArray instance with the concatenated values
     */
    concat(other) {
        let res = this.growCapacityTo(this.capacity + other.capacity);
        let offset = new field_js_1.Field(0).sub(new field_js_1.Field(this.length));
        for (let i = 0; i < res.capacity; i++) {
            res.array[i] = provable_js_1.Provable.if(new field_js_1.Field(i).lessThan(this.length), this.innerType, this.getOrUnconstrained(new field_js_1.Field(i)), other.getOrUnconstrained(offset));
            offset = offset.add(new field_js_1.Field(1));
        }
        res.length = this.length.add(other.length);
        return res;
    }
    /**
     * Inserts a value at index i, shifting all elements after that position to
     * the right by one. The length of the array is increased by one, which must
     * result in less than or equal to the capacity.
     *
     * @param i - the index at which to insert the value
     * @param value - the value to insert
     * @param message - optional error message to use in case the assertion fails
     */
    insert(index, value, message) {
        let errorMessage = message ??
            `insert(): cannot insert value at index because it would exceed capacity ${this.capacity}.`;
        const right = this.slice(index, this.length);
        this.increaseLengthBy(new field_js_1.Field(1), errorMessage);
        this.set(index, value);
        for (let i = 0; i < this.capacity; i++) {
            let offset = new field_js_1.Field(i).sub(index).sub(new field_js_1.Field(1));
            this.array[i] = provable_js_1.Provable.if(new field_js_1.Field(i).lessThanOrEqual(index), this.innerType, this.getOrUnconstrained(new field_js_1.Field(i)), right.getOrUnconstrained(offset));
        }
    }
    /**
     * Checks whether the dynamic array includes a value.
     *
     * @param value - the value to check for inclusion in the array
     * @returns
     */
    includes(value) {
        let type = this.innerType;
        let isIncluded = this.array.map((t) => provable_js_1.Provable.equal(type, t, value));
        let isSome = isIncluded.reduce((acc, curr) => acc.or(curr), new bool_js_1.Bool(false));
        return isSome;
    }
    /**
     * Converts the current instance of the dynamic array to a plain array of values.
     *
     * @returns An array of values representing the elements in the dynamic array.
     */
    toValue() {
        return this.constructor.provable.toValue(this);
    }
}
_DynamicArrayBase_indexMasks = new WeakMap(), _DynamicArrayBase_indicesInRange = new WeakMap(), _DynamicArrayBase_dummies = new WeakMap(), _DynamicArrayBase_instances = new WeakSet(), _DynamicArrayBase_indexMask = function _DynamicArrayBase_indexMask(i) {
    let mask = __classPrivateFieldGet(this, _DynamicArrayBase_indexMasks, "f").get(i);
    mask ?? (mask = this.array.map((_, j) => i.equals(j)));
    __classPrivateFieldGet(this, _DynamicArrayBase_indexMasks, "f").set(i, mask);
    return mask;
}, _DynamicArrayBase_dummyMask = function _DynamicArrayBase_dummyMask() {
    if (__classPrivateFieldGet(this, _DynamicArrayBase_dummies, "f") !== undefined)
        return __classPrivateFieldGet(this, _DynamicArrayBase_dummies, "f");
    let isLength = __classPrivateFieldGet(this, _DynamicArrayBase_instances, "m", _DynamicArrayBase_indexMask).call(this, this.length);
    let wasLength = new bool_js_1.Bool(false);
    let mask = isLength.map((isLength) => {
        wasLength = wasLength.or(isLength);
        return wasLength;
    });
    __classPrivateFieldSet(this, _DynamicArrayBase_dummies, mask, "f");
    return mask;
};
/**
 * Base class of all DynamicArray subclasses
 */
DynamicArray.Base = DynamicArrayBase;
function provable(type, Class) {
    let capacity = Class.capacity;
    let NULL = provable_intf_js_1.ProvableType.synthesize(type);
    let PlainArray = (0, provable_derivers_js_1.provable)({
        array: provable_js_1.Provable.Array(type, capacity),
        length: field_js_1.Field,
    });
    return {
        ...PlainArray,
        // make fromFields return a class instance
        fromFields(fields, aux) {
            let raw = PlainArray.fromFields(fields, aux);
            return new Class(raw.array, raw.length);
        },
        // convert to/from plain array that has the correct length
        toValue(value) {
            let length = Number(value.length);
            return value.array.map((t) => type.toValue(t)).slice(0, length);
        },
        fromValue(value) {
            if (value instanceof DynamicArrayBase)
                return value;
            let array = value.map((t) => type.fromValue(t));
            let padded = (0, arrays_js_1.pad)(array, capacity, NULL);
            return new Class(padded, new field_js_1.Field(value.length));
        },
        toCanonical(value) {
            return value;
        },
        // check has to validate length in addition to the other checks
        check(value) {
            PlainArray.check(value);
            value.length.lessThanOrEqual(new field_js_1.Field(capacity)).assertTrue();
        },
        empty() {
            return new Class();
        },
    };
}
