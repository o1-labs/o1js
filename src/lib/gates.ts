import { Snarky } from '../snarky.js';
import { FieldVar, FieldConst, type Field } from './field.js';
import { MlArray } from './ml/base.js';

export { rangeCheck64, rot };

/**
 * Asserts that x is at most 64 bits
 */
function rangeCheck64(x: Field) {
  let [, x0, x2, x4, x6, x8, x10, x12, x14] = Snarky.exists(8, () => {
    let xx = x.toBigInt();
    // crumbs (2-bit limbs)
    return [
      0,
      getBits(xx, 0, 2),
      getBits(xx, 2, 2),
      getBits(xx, 4, 2),
      getBits(xx, 6, 2),
      getBits(xx, 8, 2),
      getBits(xx, 10, 2),
      getBits(xx, 12, 2),
      getBits(xx, 14, 2),
    ];
  });
  // 12-bit limbs
  let [, x16, x28, x40, x52] = Snarky.exists(4, () => {
    let xx = x.toBigInt();
    return [
      0,
      getBits(xx, 16, 12),
      getBits(xx, 28, 12),
      getBits(xx, 40, 12),
      getBits(xx, 52, 12),
    ];
  });
  Snarky.gates.rangeCheck0(
    x.value,
    [0, FieldVar[0], FieldVar[0], x52, x40, x28, x16],
    [0, x14, x12, x10, x8, x6, x4, x2, x0],
    // not using compact mode
    FieldConst[0]
  );
}

function rot(
  field: Field,
  rotated: Field,
  excess: Field,
  limbs: [Field, Field, Field, Field],
  crumbs: [Field, Field, Field, Field, Field, Field, Field, Field],
  two_to_rot: Field
) {
  Snarky.gates.rot(
    field.value,
    rotated.value,
    excess.value,
    MlArray.to(limbs.map((x) => x.value)),
    MlArray.to(crumbs.map((x) => x.value)),
    FieldConst.fromBigint(two_to_rot.toBigInt())
  );
}

function getBits(x: bigint, start: number, length: number) {
  return FieldConst.fromBigint(
    (x >> BigInt(start)) & ((1n << BigInt(length)) - 1n)
  );
}
