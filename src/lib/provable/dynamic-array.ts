import { Provable, ToFieldable } from './provable.js';
import { Field } from './field.js';
import { Bool } from './bool.js';
import { Gates } from './gates.js';
import { assert } from './gadgets/common.js';
import { not } from './gadgets/bitwise.js';
import {
  RuntimeTable,
  RuntimeTableCfg,
} from 'dist/node/bindings/crypto/bindings/kimchi-types.js';

// external API
export { DynamicArray };

/**
 * Function defining a dynamic array of a given provable type `T` with a given
 * capacity.
 */
function DynamicArray<T extends ToFieldable>(
  type: Field, // Field | Bool
  capacity: number
) {
  /**
   * Creates a null value of the given provable type `T`.
   *
   * @returns
   */
  function Null() {
    return Field.fromFields(
      Array(Field.sizeInFields()).fill(new Field(0))
      //Field.toAuxiliary()
    );
  }

  /**
   * Fill an array with null values up to the given length. If the length equals
   * the length of the values, no null values are added.
   *
   * @param values
   * @param length
   * @returns
   */
  function fillWithNull([...values]: Field[], length: number): Field[] {
    for (let i = values.length; i < length; i++) {
      values[i] = Null();
    }
    return values;
  }

  /**
   * A provable type representing a dynamic array of field elements.
   */
  return class _DynamicArray {
    // TODO: higher level management of runtime tables IDs
    _id: number | undefined = undefined; // table identifier
    _data: Field[] | undefined = undefined; // contents of the array
    _length: Field | undefined = undefined; // length of the array as Field

    get id(): number {
      assert(this._id !== undefined, 'DynamicArray class not initialized.');
      return this.id as number;
    }

    get data(): Field[] {
      assert(this._data !== undefined, 'DynamicArray class not initialized.');
      return this._data as Field[];
    }

    get length(): Field {
      assert(this._length !== undefined, 'DynamicArray class not initialized.');
      return this._length as Field;
    }

    get Constructor() {
      return this.constructor as typeof _DynamicArray;
    }

    /**
     * Create a new {@link DynamicArray} instance from an optional list of
     * {@link Field} elements.
     *
     * @example
     * ```ts
     * let arr = new DynamicArray([new Field(1), new Field(2), new Field(3)]);
     * let empty = new DynamicArray();
     * ```
     *
     * Note: this is different from a `Field[]` because it is a provable type.
     */
    public constructor(array?: Field[]) {
      this._data = fillWithNull(array ?? [], capacity);
      this._length = new Field(array?.length ?? 0);

      // generate a random positive integer id that fits in int32 for ocaml and
      // is not any of the reserved ids for fixed lookup tables
      // TODO: register all the IDs used to avoid repetition
      this._id = Math.floor(Math.random() * Math.pow(2, 15) + 10);
      let idxs = this.data.map((_, i) => new Field(i));

      Gates.addRuntimeTableConfig(this.id, idxs);
      // TODO: add the data to the runtime table
    }

    /**
     *
     * @returns the maximum length of the array
     */
    public capacity(): number {
      return capacity;
    }

    /**
     * In-circuit assertion that the given index is within the bounds of the
     * dynamic array.
     *
     * @param index
     */
    #assertIndexWithinBounds(index: Field): void {
      // assert index < length
      index.lessThan(new Field(this.capacity())).assertTrue();
    }

    /**
     * Returns a provable mask indicating the index of the array of the same
     * maximum length as the array.
     *
     * @param index
     * @returns
     */
    public mask(index: Field): Bool[] {
      // check that the index is less than the length of the array
      this.#assertIndexWithinBounds(index);
      const mask = [];
      for (let i = 0; i < this.capacity(); i++) {
        mask.push(index.equals(new Field(i)));
      }
      return mask;
    }

    /**
     * Look up a value in the array at the given index.
     * O(n) complexity for now.
     *
     * @param index
     * @returns the value at the given index in the array
     *
     * NOTE: if the index is out of bounds, the circuit will fail.
     */
    public get(index: Field): Field {
      let mask = this.mask(index);

      // implemented as quin selector for now
      // TODO: create a runtime table for the array and look up the index

      let acc = Null();
      for (let i = 0; i < this.capacity(); i++) {
        acc = acc.add(mask[i].toField().mul(this.data[i]));
      }

      return acc;
    }

    /**
     * Set a value in the array at the given index.
     * O(n) complexity for now.
     *
     * @param index
     * @param value
     *
     * NOTE: if the index is out of bounds, the circuit will fail.
     */
    public set(index: Field, value: Field): void {
      let mask = this.mask(index);

      // copy the array in a new runtime table updating the value at the index
      this._id = this.id + 1;

      // use value if index matches, otherwise use the existing value
      let array = [];
      for (let i = 0; i < this.capacity(); i++) {
        array.push(Provable.if(mask[i], value, this.data[i]));
      }
      this._data = array;

      // TODO: update the runtime table with the new data
    }

    /**
     * Whether the dynamic array includes the given value, in-circuit.
     * Complexity: O(n)
     *
     * @param value
     * @returns Bool
     */
    public includes(value: Field): Bool {
      let result = Null();
      // TODO: halt earlier if the value is found
      for (let i = 0; i < this.capacity(); i++) {
        result = result.add(value.equals(this.data[i]).toField());
      }
      return result.equals(new Field(0)).not();
    }

    /**
     * Copies the content of the current dynamic array into a new one, asserting
     * that the two arrays are equal.
     *
     */
    public copy(): _DynamicArray {
      let array = new _DynamicArray(this.data);
      for (let i = 0; i < this.capacity(); i++) {
        this.data[i].assertEquals(array.data[i]);
      }
      return array;
    }

    /**
     * Increments the length of the dynamic array by the given amount.
     * The resulting length must be less than or equal to the capacity.
     *
     * @param n
     */
    public incrementLength(n: Field): void {
      const newLength = this.length.add(n);
      newLength.assertLessThanOrEqual(new Field(this.capacity()));
      this._length = newLength;
    }

    /**
     * Decrements the length of the dynamic array by the given amount.
     * The resulting length must be greater than or equal to zero.
     *
     * @param n
     */
    public decrementLength(n: Field): void {
      let newLength = this.length.sub(n);
      // Not using boolean values here for efficiency of the circuit
      let underflow = new Field(1);
      for (let i = 0; i <= this.capacity(); i++) {
        underflow = underflow.sub(new Field(i).equals(newLength).toField());
      }
      // if newLength is in the range [0, capacity] then it did not underflow
      underflow.equals(new Field(0));
      this._length = newLength;
    }

    /**
     * Pops the last `n` elements from the dynamic array, decreasing the length.
     * The popped positions are set to null.
     *
     * @param n
     */
    public pop(n: Field): void {
      let newLength = this.length.sub(n);

      for (let i = 0; i <= this.capacity(); i++) {
        this.data[i] = Provable.if(
          new Field(i).greaterThan(newLength),
          Null(),
          this.data[i]
        );
      }

      this.decrementLength(n);
    }

    /**
     * Pushes a value to the end of the dynamic array, increasing the length by
     * one.
     *
     * @param value
     */
    public push(value: Field): void {
      this.incrementLength(new Field(1));

      let mask = this.mask(this.length);

      for (let i = 0; i <= this.capacity(); i++) {
        this.data[i] = Provable.if(mask[i], value, this.data[i]);
      }
    }

    /**
     *
     * @returns true or false depending on whether the dynamic array is empty
     */
    public empty(): Bool {
      return this.length.equals(new Field(0));
    }

    // TODO:
    // - concat
    // - slice
    // - insert
    // - map
    // - shift_left
    // - shift_right
  };
}
