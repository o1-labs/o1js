import { Field } from '../field.js';
import { Gates } from '../gates.js';

export { rangeCheck3x12, inTable };

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
 * In-circuit check that up to 3 pairs of index and value are in the runtime
 * table given by the identifier. Each given pair is a tuple composed of a
 * bigint and a Field.
 *
 * @param id
 * @param pair0
 * @param pair1
 * @param pair2
 */
function inTable(
  id: number,
  pair0: [bigint, Field],
  pair1?: [bigint, Field] | undefined,
  pair2?: [bigint, Field] | undefined
) {
  let [idx0, v0] = pair0;
  let [idx1, v1] = pair1 === undefined ? pair0 : pair1;
  let [idx2, v2] = pair2 === undefined ? pair0 : pair2;

  Gates.lookup(Field.from(id), Field.from(idx0), v0, Field.from(idx1), v1, Field.from(idx2), v2);
}
