import { Field } from '../field.js';
import { Gates } from '../gates.js';

export { rangeCheck3x12, newRuntimeTableId };

function rangeCheck3x12(v0: Field, v1: Field, v2: Field) {
  // Checks that all three input values exist in the RANGE_CHECK_TABLE (tableId: 1)
  // v0, v1, v2 are used as the table keys
  // The table "values" (inputs no 3, 5, 7) are 0 because the table only has one column
  Gates.lookup(
    // table id
    Field.from(1),
    v0,
    Field.from(0),
    v1,
    Field.from(0),
    v2,
    Field.from(0)
  );
}

/**
 * Global state containing the last used table ID.
 *
 * In Kimchi, there are two fixed lookup tables whose IDs are the following:
 * - 0 : reserved for a 4-bit Xor table
 * - 1 : reserved for a 12-bit range check table
 * This means, runtime table IDs should start from 2 to avoid collisions.
 */
let id = 1;
let lock = Promise.resolve(id);

/**
 * Increments the runtime table ID and returns the new value asynchronously.
 * Uses promises to allow for different parts of a program to create runtime
 * tables without compromising the uniqueness of the IDs.
 */
async function newRuntimeTableId() {
  lock = lock.then(async () => {
    id += 1; // Increment the global variable
    return Promise.resolve(id);
  });
  return lock;
}



