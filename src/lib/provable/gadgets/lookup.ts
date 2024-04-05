import { Field } from '../field.js';
import { Gates } from '../gates.js';

export { rangeCheck3x12 };

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
