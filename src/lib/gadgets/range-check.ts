import { type Field } from '../field.js';
import * as Gates from '../gates.js';

export { rangeCheck64 };

function rangeCheck64(x: Field) {
  if (x.isConstant()) {
    if (x.toBigInt() >= 1n << 64n) {
      throw Error(`rangeCheck64: expected field to fit in 64 bits, got ${x}`);
    }
  } else {
    Gates.rangeCheck64(x);
  }
}
