/*
 * Array type inspired by zksecurity's implementation at
 * https://github.com/zksecurity/mina-attestations and
 * gretke's at https://github.com/gretzke/zkApp-data-types
 */

import {
  Bool,
  Field,
  type InferProvable,
  Option,
  Provable,
  provable as struct,
  type ProvableHashable,
} from 'o1js';
import { ProvableType } from './types/provable-intf.js';
import { assert } from './gadgets/common.js';
import { type From, type InferValue } from '../../bindings/lib/provable-generic.js';
import { zip, pad } from '../util/arrays.js';
import { arrayGet } from './gadgets/basic.js';

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
  A extends ProvableType,
  T extends InferProvable<A> = InferProvable<A>,
  V extends InferValue<A> = InferValue<A>,
>(
  type: A,
  {
    capacity,
  }: {
    capacity: number;
  }
): typeof DynamicArrayBase<T, V> & {
  provable: ProvableHashable<DynamicArrayBase<T, V>, V[]>;

  /**
   * Create a new DynamicArray from an array of values.
   *
   * Note: Both the actual length and the values beyond the original ones will
   * be constant.
   */
  from(v: (T | V)[] | DynamicArrayBase<T, V>): DynamicArrayBase<T, V>;
} {
  let innerType: Provable<T, V> = ProvableType.get(type);

  // assert capacity bounds
  assert(capacity >= 0, 'capacity must be >= 0');
  assert(capacity < 2 ** 16, 'capacity must be < 2^16');

  class DynamicArray_ extends DynamicArrayBase<T, V> {
    get innerType() {
      return innerType;
    }
    static get capacity() {
      return capacity;
    }
    static get provable() {
      return provableArray;
    }

    static from(input: (T | V)[] | DynamicArrayBase<T, V>) {
      return provableArray.fromValue(input);
    }
  }
  const provableArray = provable<T, V>(innerType, DynamicArray_);

  return DynamicArray_;
}

class DynamicArrayBase<T = any, V = any> {
  /**
   * The internal array, which includes the actual values, padded up to
   * `capacity` with unconstrained values.
   */
  array: T[];

  /**
   * Length of the array. Guaranteed to be in [0, capacity].
   */
  length: Field;

  // properties to override in subclass
  get innerType(): Provable<T, V> {
    throw Error('Inner type must be defined in a subclass.');
  }
  static get capacity(): number {
    throw Error('Capacity must be defined in a subclass.');
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
   * {@link T} elements, and optional length.
   *
   * If the length is provided, then it must match the actual length of the
   * array. If the length is not provided, it will be set to the actual length
   * of the array. But if the length is provided, then the size of the array
   * must be at least as large as the length (this is to allow for arrays with
   * dummy values at the end). Either way, the length must be less than or equal
   * to the capacity.
   *
   * @example
   * ```ts
   * let arr = new DynamicArray([new Field(1), new Field(2), new Field(3)]);
   * let empty = new DynamicArray();
   * ```
   *
   * Note: this is different from `T[]` because it is a provable type.
   */
  constructor(array?: T[], length?: Field) {
    let a: T[] = array ?? [];
    assert(a.length <= this.capacity, 'input length must fit in capacity');

    let l = length ?? new Field(a.length);
    assert(
      BigInt(a.length) >= l.toBigInt(),
      'length of the array should be at least the length provided'
    );

    let NULL = ProvableType.synthesize(this.innerType);
    this.array = pad(a, this.capacity, NULL);
    this.length = l;
  }

  /**
   * In-circuit assertion that the given index is within the bounds of the
   * dynamic array.
   * Asserts 0 <= i < this.length, using a cached check that's not
   * duplicated when doing it on the same variable multiple times.
   */
  assertIndexInRange(i: Field): void {
    if (!this._indicesInRange.has(i)) {
      if (i.isConstant() && this.length.isConstant()) {
        assert(i.toBigInt() < this.length.toBigInt(), 'assertIndexInRange');
      }
      i.lessThan(this.length).assertTrue();
      this._indicesInRange.add(i);
    }
  }

  /**
   * Gets value at index i, and proves that the index is in the array.
   */
  get(i: Field): T {
    this.assertIndexInRange(i);
    return this.getOrUnconstrained(i);
  }

  /**
   * Gets a value at index i, as an option that is None if the index is not in
   * the array.
   *
   * Note: The correct type for `i` is actually UInt16 which doesn't exist. The
   * method is not complete (but sound) for i >= 2^16.
   */
  getOption(i: Field): Option<T> {
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
  getOrUnconstrained(i: Field): T {
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
  set(i: Field, value: T): void {
    this.assertIndexInRange(i);
    this.setOrDoNothing(i, value);
  }

  /**
   * Sets a value at index i, or does nothing if the index is not in the array
   */
  setOrDoNothing(i: Field, value: T): void {
    zip(this.array, this._indexMask(i)).forEach(([t, equalsIJ], i) => {
      this.array[i] = Provable.if(equalsIJ, this.innerType, value, t);
    });
  }

  /**
   * Map every element of the array to a new value.
   *
   * **Warning**: The callback will be passed unconstrained dummy values.
   */
  map<S extends ProvableType>(
    type: S,
    f: (t: T) => From<S>
  ): DynamicArray<InferProvable<S>, InferValue<S>> {
    let Array = DynamicArray(type, { capacity: this.capacity });
    let provable = ProvableType.get(type);
    let array = this.array.map((x) => provable.fromValue(f(x)));
    let newArray = new Array(array, this.length);

    // new array has same length/capacity, so it can use the same cached masks
    newArray._indexMasks = this._indexMasks;
    newArray._indicesInRange = this._indicesInRange;
    newArray._dummies = this._dummies;
    return newArray;
  }

  /**
   * Iterate over all elements of the array.
   *
   * The callback will be passed an element and a boolean `isDummy` indicating
   * whether the value is part of the actual array.
   */
  forEach(f: (t: T, isDummy: Bool) => void) {
    zip(this.array, this._dummyMask()).forEach(([t, isDummy]) => {
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
   */
  growCapacityTo(capacity: number): DynamicArray<T, V> {
    assert(capacity >= this.capacity, 'new capacity must be greater or equal');
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
   */
  growCapacityBy(increment: number): DynamicArray<T> {
    return this.growCapacityTo(this.capacity + increment);
  }

  /**
   * Increments the length of the current array by n elements, checking that the
   * new length is within the capacity.
   */
  increaseLengthBy(n: Field): void {
    let newLength = this.length.add(n).seal();
    newLength.lessThanOrEqual(new Field(this.capacity)).assertTrue();
    this.length = newLength;
  }

  /**
   * Decrements the length of the current array by n elements, checking that the
   * n is less or equal than the current length.
   */
  decreaseLengthBy(n: Field): void {
    let oldLength = this.length;
    n.assertLessThanOrEqual(this.length);
    this.length = oldLength.sub(n).seal();
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
   */
  push(value: T): void {
    let oldLength = this.length;
    this.increaseLengthBy(new Field(1));
    this.setOrDoNothing(oldLength, value);
  }

  /**
   * Removes the last `n` elements from the dynamic array, decreasing the length
   * by n. If no amount is provided, only one element is popped. The popped
   * positions are set to NULL values.
   *
   * @param n
   */
  pop(n?: Field): void {
    let dec = n !== undefined ? n : new Field(1);
    this.decreaseLengthBy(dec);

    let NULL: T = ProvableType.synthesize(this.innerType);
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
    return this.length.equals(new Field(0));
  }

  /**
   * Shifts all elements of the array to the left by n positions, reducing the
   * length by n, which must be less than or equal to the current length.
   *
   * @param n
   */
  shiftLeft(n: Field): void {
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
    this.decreaseLengthBy(n);
  }

  /**
   * Shifts all elements of the array to the right by n positions, increasing
   * the length by n, which must result in less than or equal to the capacity.
   * The new elements on the left are set to NULL values.
   *
   * @param n
   */
  shiftRight(n: Field): void {
    this.increaseLengthBy(n);
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
   * @returns a  new DynamicArray instance with the same values as the current
   */
  copy(): this {
    let newArr = new (<any>this.constructor)();
    newArr.array = this.array.slice();
    newArr.length = this.length;
    // TODO: assert equality of the two arrays?
    return newArr;
  }

  /**
   * Creates a new dynamic array with the values of the current array from
   * index `start` (included) to index `end` (excluded). If `start` is not
   * provided, it defaults to 0. If `end` is not provided, it defaults to the
   * length of the array.
   *
   * @param start
   * @param end
   * @returns
   */
  slice(start?: Field, end?: Field): DynamicArray<T, V> {
    start ??= new Field(0);
    end ??= this.length;
    let sliced = this.copy();
    sliced.shiftLeft(start);
    sliced.pop(this.length.sub(end));
    return sliced;
  }

  /**
   * Concatenates the current array with another dynamic array, returning a new
   * dynamic array with the values of both arrays. The capacity of the new array
   * is the sum of the capacities of the two arrays.
   *
   * @param other
   * @returns
   */
  concat(other: DynamicArray<T, V>): DynamicArray<T, V> {
    let res = this.growCapacityTo(this.capacity + other.capacity);
    let offset = new Field(0).sub(new Field(this.length));
    for (let i = 0; i < res.capacity; i++) {
      res.array[i] = Provable.if(
        new Field(i).lessThan(this.length),
        this.innerType,
        this.getOrUnconstrained(new Field(i)),
        other.getOrUnconstrained(offset)
      );
      offset = offset.add(Field(1));
    }
    res.length = this.length.add(other.length);
    return res;
  }

  /**
   * Inserts a value at index i, shifting all elements after that position to
   * the right by one. The length of the array is increased by one, which must
   * result in less than or equal to the capacity.
   *
   * @param i
   * @param value
   */
  insert(index: Field, value: T): void {
    const right = this.slice(index, this.length);
    this.increaseLengthBy(new Field(1));
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

  // TODO: when we can check .equals on arrays eleemnts we can implement:
  // - includes

  // cached variables to not duplicate constraints if we do something like
  // array.get(i), array.set(i, ..) on the same index
  _indexMasks: Map<Field, Bool[]> = new Map();
  _indicesInRange: Set<Field> = new Set();
  _dummies?: Bool[];

  /**
   * Compute i.equals(j) for all indices j in the static-size array.
   *
   * j = 0           n
   *     0 0 1 0 0 0 0
   *         ^
   *         i
   */
  _indexMask(i: Field): Bool[] {
    let mask = this._indexMasks.get(i);
    mask ??= this.array.map((_, j) => i.equals(j));
    this._indexMasks.set(i, mask);
    return mask;
  }

  /**
   * Tells us which elements are dummies = not actually in the array.
   *
   * 0 0 0 1 1 1 1 1 1
   *       ^
   *       length
   */
  _dummyMask(): Bool[] {
    if (this._dummies !== undefined) return this._dummies;
    let isLength = this._indexMask(this.length);
    let wasLength = new Bool(false);

    let mask = isLength.map((isLength) => {
      wasLength = wasLength.or(isLength);
      return wasLength;
    });
    this._dummies = mask;
    return mask;
  }

  toValue(): V[] {
    return (this.constructor as any as { provable: Provable<any, V[]> }).provable.toValue(this);
  }
}

/**
 * Base class of all DynamicArray subclasses
 */
DynamicArray.Base = DynamicArrayBase;

function provable<T, V>(
  type: Provable<T, V>,
  Class: typeof DynamicArrayBase<T, V>
): ProvableHashable<DynamicArrayBase<T, V>, V[]> {
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
      return new Class(raw.array);
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
      let raw = PlainArray.empty();
      return new Class(raw.array);
    },
  };
}
