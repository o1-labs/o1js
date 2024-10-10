import { Provable } from './provable.js';
import { Field } from './field.js';
import { Bool } from './bool.js';
import { Gates } from './gates.js';
import { assert } from './gadgets/common.js';
import { not } from './gadgets/bitwise.js';
import { newRuntimeTableId } from './gadgets/lookup.js';
import {
  RuntimeTable,
  RuntimeTableCfg,
} from 'dist/node/bindings/crypto/bindings/kimchi-types.js';

// external API
export { ArrayList };

let tableIdsMap: Record<string, boolean> = {};
let TableIds = {
  get(tag: string): boolean | undefined {
    return tableIdsMap[tag];
  },
  store(tag: string, compiledTag: boolean) {
    tableIdsMap[tag] = compiledTag;
  },
};

/**
 * Function defining an array list of a given provable type `T` with a given
 * capacity.
 */
function ArrayList<T>(
  type: Provable<T, Field>, // Field | Bool
  capacity: number
) {
  /**
   * Creates a null value of the given provable type `T`.
   *
   * @returns
   */
  function Null() {
    return type.fromFields(
      Array(type.sizeInFields()).fill(new Field(0)),
      type.toAuxiliary()
    );
  }

  /**
   * Shorthand for creating a value of the given provable type `T`.
   *
   * @param value
   * @returns
   */
  function Value(value: Field): T {
    return type.fromFields(Array(value), type.toAuxiliary());
  }

  /**
   * Fill an array with null values up to the given length. If the length equals
   * the length of the values, no null values are added.
   *
   * @param values
   * @param length
   * @returns
   */
  function fillWithNull([...values]: T[], length: number): T[] {
    for (let i = values.length; i < length; i++) {
      values[i] = Null();
    }
    return values;
  }

  /**
   * A provable type representing an array list of field elements.
   */
  return class _ArrayList {
    // TODO: higher level management of runtime tables IDs
    _id: number | undefined = undefined; // table identifier
    _data: T[] | undefined = undefined; // contents of the array
    _length: Field | undefined = undefined; // length of the array as Field

    get id(): number {
      assert(this._id !== undefined, 'ArrayList class not initialized.');
      return this.id as number;
    }

    get data(): T[] {
      assert(this._data !== undefined, 'ArrayList class not initialized.');
      return this._data as T[];
    }

    get length(): Field {
      assert(this._length !== undefined, 'ArrayList class not initialized.');
      return this._length as Field;
    }

    get Constructor() {
      return this.constructor as typeof _ArrayList;
    }

    /**
     * Create a new {@link ArrayList} instance from an optional list of
     * {@link Field} elements.
     *
     * @example
     * ```ts
     * let arr = new ArrayList([new Field(1), new Field(2), new Field(3)]);
     * let empty = new ArrayList();
     * ```
     *
     * Note: this is different from a `Field[]` because it is a provable type.
     */
    public constructor(array?: T[]) {
      this._data = fillWithNull(array ?? [], capacity);
      this._length = new Field(array?.length ?? 0);

      this._id = await newRuntimeTableId();
      let idxs = this.data.map((_, i) => new Field(i));

      //Gates.addRuntimeTableConfig(this.id, idxs);
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
     * array list.
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
    public get(index: Field): T {
      let mask = this.mask(index);

      // implemented as quin selector for now
      // TODO: create a runtime table for the array and look up the index

      let acc = Null();
      for (let i = 0; i < this.capacity(); i++) {
        acc = Value(
          type
            .toValue(acc)
            .add(mask[i].toField().mul(type.toValue(this.data[i])))
        );
        // acc = acc.add(mask[i].toField().mul(this.data[i]));
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
    public set(index: Field, value: T): void {
      let mask = this.mask(index);

      // copy the array in a new runtime table updating the value at the index
      this._id = this.id + 1;

      // use value if index matches, otherwise use the existing value
      let array = [];
      for (let i = 0; i < this.capacity(); i++) {
        array.push(
          Value(
            Provable.if(
              mask[i],
              type.toValue(value),
              type.toValue(this.data[i])
            )
          )
        );
      }
      this._data = array;

      // TODO: update the runtime table with the new data
    }

    /**
     * Whether the array list includes the given value, in-circuit.
     * Complexity: O(n)
     *
     * @param value
     * @returns Bool
     */
    public includes(value: Field): Bool {
      let result = Null();
      // TODO: halt earlier if the value is found
      for (let i = 0; i < this.capacity(); i++) {
        result = Value(
          type
            .toValue(result)
            .add(value.equals(type.toValue(this.data[i])).toField())
        );
      }
      return type.toValue(result).equals(new Field(0)).not();
    }

    /**
     * Copies the content of the current array list into a new one, asserting
     * that the two arrays are equal.
     *
     */
    /*public copy(): _ArrayList {
      let array = new _ArrayList(this.data);
      for (let i = 0; i < this.capacity(); i++) {
        this.data[i].assertEquals(array.data[i]);
      }
      return array;
    }*/

    /**
     * Increments the length of the array list by the given amount.
     * The resulting length must be less than or equal to the capacity.
     *
     * @param n
     */
    /* public incrementLength(n: Field): void {
      const newLength = this.length.add(n);
      newLength.assertLessThanOrEqual(new Field(this.capacity()));
      this._length = newLength;
    }*/

    /**
     * Decrements the length of the array list by the given amount.
     * The resulting length must be greater than or equal to zero.
     *
     * @param n
     */
    /*public decrementLength(n: Field): void {
      let newLength = this.length.sub(n);
      // Not using boolean values here for efficiency of the circuit
      let underflow = new Field(1);
      for (let i = 0; i <= this.capacity(); i++) {
        underflow = underflow.sub(new Field(i).equals(newLength).toField());
      }
      // if newLength is in the range [0, capacity] then it did not underflow
      underflow.equals(new Field(0));
      this._length = newLength;
    }*/

    /**
     * Pops the last `n` elements from the array list, decreasing the length.
     * The popped positions are set to null.
     *
     * @param n
     */
    /*public pop(n: Field): void {
      let newLength = this.length.sub(n);

      for (let i = 0; i <= this.capacity(); i++) {
        this.data[i] = Provable.if(
          new Field(i).greaterThan(newLength),
          Null(),
          this.data[i]
        );
      }

      this.decrementLength(n);
    }*/

    /**
     * Pushes a value to the end of the array list, increasing the length by
     * one.
     *
     * @param value
     */
    /*public push(value: Field): void {
      this.incrementLength(new Field(1));

      let mask = this.mask(this.length);

      for (let i = 0; i <= this.capacity(); i++) {
        this.data[i] = Provable.if(mask[i], value, this.data[i]);
      }
    }*/

    /**
     *
     * @returns true or false depending on whether the array list is empty
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
