import { FieldConst, FieldVar } from './field.js';

export { MlForeignFieldVar, MlForeignFieldConst };

type MlForeignField<F> = [_: 0, x0: F, x1: F, x2: F];
type MlForeignFieldVar = MlForeignField<FieldVar>;
type MlForeignFieldConst = MlForeignField<FieldConst>;

class ForeignField {
  value: MlForeignFieldVar;

  constructor(x: ForeignField | MlForeignFieldVar | bigint | number | string) {
    if (x instanceof ForeignField) {
      this.value = x.value;
      return;
    }
    // ForeignFieldVar
    if (Array.isArray(x)) {
      this.value = x;
      return;
    }
    let x0 = BigInt(x);
  }
}

let limbBits = 88n;
let limbMax = (1n << limbBits) - 1n;

function to3Limbs(x: bigint): [bigint, bigint, bigint] {
  let l0 = x & limbMax;
  x >>= limbBits;
  let l1 = x & limbMax;
  let l2 = x >> limbBits;
  return [l0, l1, l2];
}
