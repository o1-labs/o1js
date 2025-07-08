/*
 * Array type inspired by zksecurity's implementation at
 * https://github.com/zksecurity/mina-attestations and
 * gretke's at https://github.com/gretzke/zkApp-data-types
 */
import { type From, type InferValue } from '../../bindings/lib/provable-generic.js';
import { pad, zip } from '../util/arrays.js';

import { Bool } from './bool.js';
import { Field } from './field.js';
import { arrayGet } from './gadgets/basic.js';
import { assert } from './gadgets/common.js';
import { Option } from './option.js';
import { Provable } from './provable.js';
import { type InferProvable, provable as struct } from './types/provable-derivers.js';
import { ProvableHashable, ProvableType } from './types/provable-intf.js';

// external API
export { DynamicArray };

type DynamicArray<T = any, V = any> = DynamicArrayBase<T, V>;

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
function DynamicArray<
  ElementType extends ProvableType,
  ProvableValue extends InferProvable<ElementType> = InferProvable<ElementType>,
  Value extends InferValue<ElementType> = InferValue<ElementType>,
>(
  type: ElementType,
  {
    capacity,
  }: {
    capacity: number;
  }
): typeof DynamicArrayBase<ProvableValue, Value> & {
  provable: ProvableHashable<DynamicArrayBase<ProvableValue, Value>, Value[]>;

  /**
   * Create a new DynamicArray from an array of values.
   *
   * Note: Both the actual length and the values beyond the original ones will
   * be constant.
   */
  from(
    v: (ProvableValue | Value)[] | DynamicArrayBase<ProvableValue, Value>
  ): DynamicArrayBase<ProvableValue, Value>;
} {
  let innerType: Provable<ProvableValue, Value> = ProvableType.get(type);

  // assert capacity bounds
  assert(capacity >= 0, 'DynamicArray(): capacity must be >= 0');
  assert(capacity < 2 ** 16, 'DynamicArray(): capacity must be < 2^16');

  class DynamicArray_ extends DynamicArrayBase<ProvableValue, Value> {
    get innerType() {
      return innerType;
    }
    static get capacity() {
      return capacity;
    }
    static get provable() {
      return provableArray;
    }

    static from(input: (ProvableValue | Value)[] | DynamicArrayBase<ProvableValue, Value>) {
      return provableArray.fromValue(input);
    }
  }
  const provableArray = provable<ProvableValue, Value>(innerType, DynamicArray_);

  return DynamicArray_;
}

class DynamicArrayBase<ProvableValue = any, Value = any> {
  /**
   * The internal array, which includes the actual values, padded up to
   * `capacity` with unconstrained values.
   */
  array: ProvableValue[];

  /**
   * Length of the array. Guaranteed to be in [0, capacity].
   */
  length: Field;

  // properties to override in subclass
  get innerType(): Provable<ProvableValue, Value> {
    throw Error('Inner type must be defined in a subclass');
  }
  static get capacity(): number {
    throw Error('Capacity must be defined in a subclass');
  }

  // derived property
  get capacity(): number {
    return (this.constructor as typeof DynamicArrayBase).capacity;
  }

  get Constructor() {
    return this.constructor as typeof DynamicArrayBase;
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
  constructor(array?: ProvableValue[], length?: Field) {
    const NULL = ProvableType.synthesize(this.innerType);

    const a = array ?? [];
    const l = length ?? new Field(a.length);

    assert(a.length <= this.capacity, 'DynamicArray(): array must not exceed capacity');
    if (length?.isConstant()) {
      assert(
        l.toBigInt() <= BigInt(a.length),
        'DynamicArray(): length must be at most as long as the array'
      );
    }

    this.array = pad(a, this.capacity, NULL);
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
  assertIndexInRange(i: Field, message?: string): void {
    let errorMessage = message ?? `assertIndexInRange(): index must be in range [0, length]`;
    if (!this.#indicesInRange.has(i)) {
      if (i.isConstant() && this.length.isConstant()) {
        assert(i.toBigInt() < this.length.toBigInt(), errorMessage);
      }
      i.assertLessThan(this.length, errorMessage);
      this.#indicesInRange.add(i);
    }
  }

  /**
   * Gets value at index i, and proves that the index is in the array.
   * It uses an internal cache to avoid duplication of constraints when the
   * same index is used multiple times.
   */
  get(i: Field): ProvableValue {
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
  getOption(i: Field): Option<ProvableValue> {
    let type = this.innerType;
    let isContained = i.lessThan(this.length);
    let value = this.getOrUnconstrained(i);
    const OptionT = Option(type);
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
  getOrUnconstrained(i: Field): ProvableValue {
    let type = this.innerType;
    let NULL = ProvableType.synthesize(type);
    let ai = Provable.witness(type, () => this.array[Number(i)] ?? NULL);
    let aiFields = type.toFields(ai);

    // assert a is correct on every field column with arrayGet()
    let fields = this.array.map((t) => type.toFields(t));

    // this allows each array entry to be larger than a single field element
    for (let j = 0; j < type.sizeInFields(); j++) {
      let column = fields.map((x) => x[j]!);
      arrayGet(column, i).assertEquals(aiFields[j]!);
    }
    return ai;
  }

  /**
   * Sets a value at index i and proves that the index is in the array.
   */
  set(i: Field, value: ProvableValue, message?: string): void {
    let errorMessage = message ?? `set(): index must be in range [0, length]`;
    this.assertIndexInRange(i, errorMessage);
    this.setOrDoNothing(i, value);
  }

  /**
   * Sets a value at index i, or does nothing if the index is not in the array
   */
  setOrDoNothing(i: Field, value: ProvableValue): void {
    zip(this.array, this.#indexMask(i)).forEach(([t, equalsIJ], i) => {
      this.array[i] = Provable.if(equalsIJ, this.innerType, value, t);
    });
  }

  /**
   * Map every element of the array to a new value.
   *
   * **Warning**: The callback will be passed unconstrained dummy values.
   */
  map<MapType extends ProvableType>(
    type: MapType,
    f: (t: ProvableValue) => From<MapType>
  ): DynamicArray<InferProvable<MapType>, InferValue<MapType>> {
    let Array = DynamicArray(type, { capacity: this.capacity });
    let provable = ProvableType.get(type);
    let array = this.array.map((x) => provable.fromValue(f(x)));
    let newArray = new Array(array, this.length);

    // new array has same length/capacity, so it can use the same cached masks
    newArray.#indexMasks = this.#indexMasks;
    newArray.#indicesInRange = this.#indicesInRange;
    newArray.#dummies = this.#dummies;
    return newArray;
  }

  /**
   * Iterate over all elements of the array.
   *
   * The callback will be passed an element and a boolean `isDummy` indicating
   * whether the value is part of the actual array. Optionally, an index can be
   * passed as a third argument (used in `forEachReversed`)
   */
  forEach(f: (t: ProvableValue, isDummy: Bool, i?: number) => void): void {
    zip(this.array, this.#dummyMask()).forEach(([t, isDummy], i) => f(t, isDummy, i));
  }

  /**
   * Iterate over all elements of the array, in reverse order.
   *
   * The callback will be passed an element and a boolean `isDummy` indicating whether the value is part of the actual array.
   *
   * Note: the indices are also passed in reverse order, i.e. we always have `t = this.array[i]`.
   */
  forEachReverse(f: (t: ProvableValue, isDummy: Bool, i: number) => void) {
    zip(this.array, this.#dummyMask())
      .reverse()
      .forEach(([t, isDummy], i) => {
        f(t, isDummy, this.capacity - 1 - i);
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
  growCapacityTo(capacity: number, message?: string): DynamicArray<ProvableValue, Value> {
    let errorMessage =
      message ??
      `growCapacityTo: new capacity ${capacity} must be greater than current capacity ${this.capacity}`;
    assert(capacity >= this.capacity, errorMessage);
    let NewArray = DynamicArray(this.innerType, { capacity });
    let NULL = ProvableType.synthesize(this.innerType);
    let array = pad(this.array, capacity, NULL);
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
  growCapacityBy(increment: number): DynamicArray<ProvableValue> {
    return this.growCapacityTo(this.capacity + increment);
  }

  /**
   * Increments the length of the current array by n elements, checking that the
   * new length is within the capacity, failing with the error message otherwise.
   *
   * @param n - the number of elements to increase the length by
   * @param message - optional error message to use in case the assertion fails
   */
  increaseLengthBy(n: Field, message?: string): void {
    let errorMessage =
      message ??
      `increaseLengthBy: cannot increase length because provided n would exceed capacity ${this.capacity}.`;

    let newLength = this.length.add(n).seal();
    newLength.assertLessThanOrEqual(new Field(this.capacity), errorMessage);
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
  decreaseLengthBy(n: Field, message?: string): void {
    let errorMessage =
      message ??
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
  setLengthTo(n: Field, message?: string): void {
    let errorMessage =
      message ?? `setLengthTo: cannot set length to n because it exceeds capacity ${this.capacity}`;
    n.assertLessThanOrEqual(new Field(this.capacity), errorMessage);
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
  push(value: ProvableValue, message?: string): void {
    let errorMessage =
      message ?? `push(): cannot push value because it would exceed capacity ${this.capacity}.`;
    let oldLength = this.length;
    this.increaseLengthBy(new Field(1), errorMessage);
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
  pop(n?: Field, message?: string): void {
    let errorMessage = message ?? `pop(): cannot pop n elements because the length is smaller`;

    let dec = n !== undefined ? n : new Field(1);
    this.decreaseLengthBy(dec, errorMessage);

    let NULL: ProvableValue = ProvableType.synthesize(this.innerType);
    if (n !== undefined) {
      // set the last n elements to NULL
      for (let i = 0; i < this.capacity; i++) {
        this.array[i] = Provable.if(
          new Field(i).lessThanOrEqual(this.length),
          this.innerType,
          this.array[i],
          NULL
        );
      }
    } else {
      // set the last element to NULL
      this.setOrDoNothing(this.length, NULL);
    }
  }

  /**
   * In-circuit check whether the array is empty.
   *
   * @returns true or false depending on whether the dynamic array is empty
   */
  isEmpty(): Bool {
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
  shiftLeft(n: Field, message?: string): void {
    let errorMessage =
      message ?? `shiftLeft(): cannot shift left because provided n would exceed current length.`;
    let NULL = ProvableType.synthesize(this.innerType);
    for (let i = 0; i < this.capacity; i++) {
      let offset = new Field(i).add(n);
      this.array[i] = Provable.if(
        offset.lessThan(this.length),
        this.innerType,
        this.getOrUnconstrained(offset),
        NULL
      );
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
  shiftRight(n: Field, message?: string): void {
    let errorMessage =
      message ??
      `shiftRight(): cannot shift right because provided n would exceed capacity ${this.capacity}`;
    this.increaseLengthBy(n, errorMessage);
    let NULL = ProvableType.synthesize(this.innerType);

    for (let i = this.capacity - 1; i >= 0; i--) {
      let offset = new Field(i).sub(n);
      this.array[i] = Provable.if(
        new Field(i).lessThan(n),
        this.innerType,
        NULL,
        this.getOrUnconstrained(offset)
      );
    }
  }

  /**
   * Copies the current dynamic array, returning a new instance with the same
   * values and length.
   *
   * @returns a new DynamicArray instance with the same values as the current.
   *
   */
  copy(): this {
    let newArr = new (<any>this.constructor)();
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
  slice(start?: Field, end?: Field): DynamicArray<ProvableValue, Value> {
    start ??= new Field(0);
    end ??= this.length;
    let sliced = this.copy();
    sliced.shiftLeft(start, `slice(): provided start is greater than current length`);
    sliced.pop(this.length.sub(end), `slice(): provided end is greater than current length`);
    return sliced;
  }

  /**
   * Returns a new array with the elements reversed.
   */
  reverse(): DynamicArray<ProvableValue, Value> {
    let Array = DynamicArray(this.innerType, { capacity: this.capacity });
    // first, copy the inner array of length capacity and reverse it
    let array = this.array.slice().reverse();

    // now, slice off the padding that is now at the beginning of the array
    let capacity = new Field(this.capacity);
    return new Array(array, capacity).slice(capacity.sub(this.length).seal());
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
  concat(other: DynamicArray<ProvableValue, Value>): DynamicArray<ProvableValue, Value> {
    let res = this.growCapacityTo(this.capacity + other.capacity);
    let offset = new Field(0).sub(new Field(this.length));
    for (let i = 0; i < res.capacity; i++) {
      res.array[i] = Provable.if(
        new Field(i).lessThan(this.length),
        this.innerType,
        this.getOrUnconstrained(new Field(i)),
        other.getOrUnconstrained(offset)
      );
      offset = offset.add(new Field(1));
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
  insert(index: Field, value: ProvableValue, message?: string): void {
    let errorMessage =
      message ??
      `insert(): cannot insert value at index because it would exceed capacity ${this.capacity}.`;
    const right = this.slice(index, this.length);
    this.increaseLengthBy(new Field(1), errorMessage);
    this.set(index, value);
    for (let i = 0; i < this.capacity; i++) {
      let offset = new Field(i).sub(index).sub(new Field(1));
      this.array[i] = Provable.if(
        new Field(i).lessThanOrEqual(index),
        this.innerType,
        this.getOrUnconstrained(new Field(i)),
        right.getOrUnconstrained(offset)
      );
    }
  }

  /**
   * Checks whether the dynamic array includes a value.
   *
   * @param value - the value to check for inclusion in the array
   * @returns
   */
  includes(value: ProvableValue): Bool {
    let type = this.innerType;
    let isIncluded = this.array.map((t) => Provable.equal(type, t, value));
    let isSome = isIncluded.reduce((acc, curr) => acc.or(curr), new Bool(false));
    return isSome;
  }

  // cached variables to not duplicate constraints if we do something like
  // array.get(i), array.set(i, ..) on the same index
  #indexMasks: Map<Field, Bool[]> = new Map();
  #indicesInRange: Set<Field> = new Set();
  #dummies?: Bool[];

  /**
   * Compute i.equals(j) for all indices j in the static-size array.
   *
   * j = 0           n
   *     0 0 1 0 0 0 0
   *         ^
   *         i
   */
  #indexMask(i: Field): Bool[] {
    let mask = this.#indexMasks.get(i);
    mask ??= this.array.map((_, j) => i.equals(j));
    this.#indexMasks.set(i, mask);
    return mask;
  }

  /**
   * Tells us which elements are dummies = not actually in the array.
   *
   * 0 0 0 1 1 1 1 1 1
   *       ^
   *       length
   */
  #dummyMask(): Bool[] {
    if (this.#dummies !== undefined) return this.#dummies;
    let isLength = this.#indexMask(this.length);
    let wasLength = new Bool(false);

    let mask = isLength.map((isLength) => {
      wasLength = wasLength.or(isLength);
      return wasLength;
    });
    this.#dummies = mask;
    return mask;
  }

  /**
   * Converts the current instance of the dynamic array to a plain array of values.
   *
   * @returns An array of values representing the elements in the dynamic array.
   */
  toValue(): Value[] {
    return (this.constructor as any as { provable: Provable<any, Value[]> }).provable.toValue(this);
  }
}

/**
 * Base class of all DynamicArray subclasses
 */
DynamicArray.Base = DynamicArrayBase;

function provable<ProvableValue, Value>(
  type: Provable<ProvableValue, Value>,
  Class: typeof DynamicArrayBase<ProvableValue, Value>
): ProvableHashable<DynamicArrayBase<ProvableValue, Value>, Value[]> {
  let capacity = Class.capacity;
  let NULL = ProvableType.synthesize(type);

  let PlainArray = struct({
    array: Provable.Array(type, capacity),
    length: Field,
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
      if (value instanceof DynamicArrayBase) return value;
      let array = value.map((t) => type.fromValue(t));
      let padded = pad(array, capacity, NULL);
      return new Class(padded, new Field(value.length));
    },

    toCanonical(value) {
      return value;
    },

    // check has to validate length in addition to the other checks
    check(value) {
      PlainArray.check(value);
      value.length.lessThanOrEqual(new Field(capacity)).assertTrue();
    },

    empty() {
      return new Class();
    },
  };
}
