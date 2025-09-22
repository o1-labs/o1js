/**
 * This module defines the `RuntimeTable` class, which represents a provable table whose entries
 * can be defined at runtime within the SNARK circuit. It allows inserting key-value pairs and
 * checking for their existence.
 */

import { assert } from '../../util/assert.js';
import { Field } from "../field.js";
import { Gates } from "../gates.js";

export {
  RuntimeTable,
};

/**
 * # RuntimeTable
 *
 * A **provable lookup table** whose entries are defined at runtime (during circuit construction).
 * It constrains that certain `(index, value)` pairs *exist* in a table identified by `id`, using
 * efficient **lookup gates** under the hood. Each inner lookup gate can batch up to **3 pairs**.
 *
 * ## When to use
 * - **small/medium, runtime-chosen set** of `(index, value)` pairs and want to prove
 *   **membership** of queried pairs in that set.
 * - **ergonomic batching**: repeated `lookup()` calls automatically group into 3-tuples
 *   so it creates pay fewer gates when possible (instead of writing repetitive `Gates.lookup(...)`
 *   calls and manually handling batching of lookup entries).
 * - **expressiveness**: all runtime tables will be condensed into one long table under the hood, 
 *   so it is highly recommended to use distinct `id`s for unrelated tables to achieve better
 *   separation of concerns and avoid accidental collisions, at no extra cost. 
 *
 * ## When *not* to use
 * - **static and global tables**: Prefer built-ins for fixed-tables that already exist in the system.
 *   (a.k.a. standard 4-bit XOR or 12-bit length range-check tables).
 * - **hiding properties**: lookup tables **constrain membership**, but don’t provide secrecy 
 *   of the values by themselves. If data privacy is needed, consider using the **witness** to hold 
 *   the values and protect from exposure to the verifier.
 * - **huge tables**: runtime lookups are efficient for a limited amount of entries, but their
 *   size is limited by the underlying circuit size (i.e. 2^16). Applications needing more storage
 *   should consider an optimized custom solution.
 * - **mutable data**: runtime tables are write-once only, so once inserted entries in table are
 *   remain fixed. To represent changing data, consider using DynamicArrays.
 * - **unknown bounded size**: runtime lookup tables require all possible `indices` to be preallocated
 *   at construction time. If the set of possible indices is not known in advance, consider using
 *   DynamicArrays instead.
 * 
 * ## Invariants & constraints
 * - `id !== 0 && id !== 1`. (Reserved for XOR and range-check tables.)
 * - `indices` are **unique**. Duplicates are rejected.
 * - `indices` must be **known** at construction time.
 * - `lookup()` **batches** each 3 calls (for the same table) into **one** gate automatically.
 * - `check()` call is required for soundness to flush 1–2 pending pairs before the end of the circuit.
 *
 * ## Complexity
 * - Gate cost for membership checks is ~`ceil(#pairs / 3)` lookup gates per table id,
 *   plus one lookup gate per `insert()` triplet.
 *
 * ## Example
 * ```ts
 * // Define a runtime table with id=5 and allowed indices {10n, 20n, 30n}
 * const rt = new RuntimeTable(5, [10n, 20n, 30n]);
 *
 * // Populate some pairs (you can insert in chunks of up to 3)
 * rt.insert([
 *   [10n, Field.from(123)],
 *   [20n, Field.from(456)],
 *   [30n, Field.from(789)],
 * ]);
 *
 * // Constrain that these pairs exist in the table
 * rt.lookup(10n, Field.from(123));
 * rt.lookup(20n, Field.from(456));
 * // These two calls will be grouped; add a third, or call check() to flush
 * rt.check(); // flush pending lookups (important!)
 * ```
 *
 * ## Gotchas
 * - **Don’t forget `check()`**: If you finish a proof block with 1–2 pending `lookup()` calls,
 *   call `check()` to emit the final lookup gate. Otherwise those constraints won’t land.
 * - **Index validation**: `insert()` and `lookup()` throw if the index isn’t whitelisted in `indices`.
 * - **ID collisions**: Pick distinct `id`s for unrelated runtime tables.
 * - **flag settings**: zkApps with runtime tables must be compiled with the `withRuntimeTables` flag.
 *
 * @remarks
 * Construction registers the table configuration via `Gates.addRuntimeTableConfig(id, indices)`.
 * Subsequent `insert()`/`lookup()` use that configuration to emit lookup gates. Please refrain from
 * using that function directly, as it will be deprecated in the future.
 *
 * @see Gates.lookup
 * @see Gates.addRuntimeTableConfig
 * @see Gadgets.inTable
 * @see DynamicArray for a mutable alternative to store runtime data.
 * @public
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
    readonly indices: Set<bigint>;
    /**
     * Pending pairs to be checked on the runtime table.
     */
    pairs: Array<[bigint, Field]> = [];

    constructor(id: number, indices: bigint[]) {
        // check that id is not 0 or 1, as those are reserved values
        assert(id !== 0 && id !== 1, "Runtime table id must be different than 0 and 1");
 
        // check that all the indices are unique
        let uniqueIndices = new Set(indices);
        assert(uniqueIndices.size === indices.length, "Runtime table indices must be unique");

        // initialize the runtime table
        this.id = id;
        this.indices = uniqueIndices;
        Gates.addRuntimeTableConfig(id, indices);
    }

    /**
     * Inserts key-value pairs into the runtime table.
     * Under the hood, this method uses the `Gates.lookup` function to perform
     * lookups to the table with identifier `this.id`. One single lookup gate
     * can store up to 3 different pairs of index and value.
     * 
     * It throws when trying to insert a pair with an index that is not part of
     * the runtime table.
     *
     * @param pairs Array of pairs [index, value] to insert into the runtime table.
     */
    insert(pairs: [bigint, Field][]) {
        for (let i = 0; i < pairs.length; i += 3) {
            const chunk = pairs.slice(i, i + 3);
            const [idx0, value0] = chunk[0];
            const [idx1, value1] = chunk[1] || [idx0, value0];
            const [idx2, value2] = chunk[2] || [idx0, value0];

            assert(this.indices.has(idx0) && this.indices.has(idx1) && this.indices.has(idx2),
                `Indices must be part of the runtime table with id ${this.id}`);

            Gates.lookup(Field.from(this.id), Field.from(idx0), value0, Field.from(idx1), value1, Field.from(idx2), value2);
        }
    }

    /**
     * In-circuit checks if a key-value pair exists in the runtime table. Note
     * that the same index can be queried several times as long as the value 
     * remains the same.
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
