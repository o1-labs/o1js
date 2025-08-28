/**
 * This module defines the `RuntimeTable` class, which represents a runtime table used in zk-SNARKs.
 */

import { Field } from "../field.js";
import { Gates } from "../gates.js";

export {
  RuntimeTable,
};

/**
 * The `RuntimeTable` class represents a provable table whose entries can be defined
 * at runtime. It allows inserting key-value pairs and checking for their existence.
 */
class RuntimeTable {
    /** 
     * Unique identifier for the runtime table. 
     * Must be different than 0 and 1, as those values are reserved
     * for the XOR and range-check tables, respectively.
     */
    readonly id: number;
    /**
     * Indices that define the structure of the runtime table.
     * They can be consecutive or not, but they must be unique.
     */
    readonly indices: bigint[];
    /**
     * Pending pairs to be checked on the runtime table.
     */
    pairs: Array<[bigint, Field]> = [];

    constructor(id: number, indices: bigint[]) {
      this.id = id;
      this.indices = indices;
      Gates.addRuntimeTableConfig(id, indices);
    }

    /**
     * Inserts key-value pairs into the runtime table.
     * Under the hood, this method uses the `Gates.lookup` function to perform
     * lookups to the table with identifier `this.id`. One single lookup gate
     * can store up to 3 different pairs of index and value. 
     *
     * @param pairs Array of pairs [index, value] to insert into the runtime table.
     */
    insert(pairs: [bigint, Field][]) {
        for (let i = 0; i < pairs.length; i += 3) {
            const chunk = pairs.slice(i, i + 3);
            const [idx0, value0] = chunk[0];
            const [idx1, value1] = chunk[1] || [idx0, value0];
            const [idx2, value2] = chunk[2] || [idx0, value0];
            Gates.lookup(Field.from(this.id), Field.from(idx0), value0, Field.from(idx1), value1, Field.from(idx2), value2);
        }
    }

    /**
     * Checks if a key-value pair exists in the runtime table. Note that the same
     * index can be queried several times as long as the value remains the same.
     * 
     * Every three calls to this method for the same identifier will be grouped 
     * into a single lookup gate for efficiency.
     * 
     * @param idx The index of the key to check.
     * @param value The value to check.
     */
    lookup(idx: bigint, value: Field) {
        if (this.pairs.length == 2) {
            let [idx0, value0] = this.pairs[0];
            let [idx1, value1] = this.pairs[1];
            Gates.lookup(Field.from(this.id), Field.from(idx0), value0, Field.from(idx1), value1, Field.from(idx), value);
            this.pairs = [];
        } else {
            this.pairs.push([idx, value]);
        }
    }

    /**
     * Finalizes any pending checks by creating a Lookup when necessary.
     * This function must be called after all `lookup()` calls of the table
     * to ensure that all pending checks are looked up in the circuit.
     */
    check() {
        // If there are any pending checks, perform one lookup with them.
        // Because the lookup gate takes 3 pairs, we add redundancy if needed.
        if (this.pairs.length > 0) {
            let [idx0, value0] = this.pairs[0];
            let [idx1, value1] = this.pairs.length > 1 ? this.pairs[1] : [idx0, value0];
            let [idx2, value2] = this.pairs.length > 2 ? this.pairs[2] : [idx0, value0];
            Gates.lookup(Field.from(this.id), Field.from(idx0), value0, Field.from(idx1), value1, Field.from(idx2), value2);
            this.pairs = [];
        }
    }
}