import { exampleFields } from '../../bindings/crypto/finite-field-examples.js';
import { provablePure } from '../circuit_value.js';
import { Field } from '../field.js';
import { Provable } from '../provable.js';
import { TupleN } from '../util/types.js';
import { Field3, ForeignField, bigint3 } from './foreign-field.js';
import { multiRangeCheck } from './range-check.js';

type Point = { x: Field3; y: Field3 };
type point = { x: bigint3; y: bigint3; infinity: boolean };

function add({ x: x1, y: y1 }: Point, { x: x2, y: y2 }: Point, f: bigint) {
  // m = (y2 - y1)/(x2 - x1)
  let m = ForeignField.div(
    // TODO bounds checks
    ForeignField.sub(y2, y1, f),
    ForeignField.sub(x2, x1, f),
    f
  );
  // x3 = m^2 - x1 - x2
  let m2 = ForeignField.mul(m, m, f);
  let x3 = ForeignField.sumChain([m2, x1, x2], [-1n, -1n], f);
  // y3 = m*(x1 - x3) - y1
  let y3 = ForeignField.sub(
    ForeignField.mul(m, ForeignField.sub(x1, x3, f), f),
    y1,
    f
  );
}

const Field3_ = provablePure([Field, Field, Field] as TupleN<typeof Field, 3>);

let cs = Provable.constraintSystem(() => {
  let x1 = Provable.witness(Field3_, () => ForeignField.from(0n));
  let x2 = Provable.witness(Field3_, () => ForeignField.from(0n));
  let y1 = Provable.witness(Field3_, () => ForeignField.from(0n));
  let y2 = Provable.witness(Field3_, () => ForeignField.from(0n));
  multiRangeCheck(...x1);
  multiRangeCheck(...x2);
  multiRangeCheck(...y1);
  multiRangeCheck(...y2);

  let g = { x: x1, y: y1 };
  let h = { x: x2, y: y2 };

  add(g, h, exampleFields.secp256k1.modulus);
});

console.log(cs);
