import { Field } from '../field.js';
import { Gates } from '../gates.js';

export { three12Bit };

function three12Bit(v0: Field, v1: Field, v2: Field) {
  // Checks that all three input values exist in the RANGE_CHECK_TABLE (tableId: 1) and are equal to 0.
  Gates.lookup(
    Field.from(1),
    v0,
    Field.from(0),
    v1,
    Field.from(0),
    v2,
    Field.from(0)
  );
}
