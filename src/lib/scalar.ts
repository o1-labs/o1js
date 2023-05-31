import { Scalar as Fq } from '../provable/curve-bigint.js';
import { FieldConst, FieldVar } from './field.js';

export { Scalar, ScalarConst, unshift };

type BoolVar = FieldVar;
type ScalarConst = Uint8Array;

const ScalarConst = {
  fromBigint: constFromBigint,
  toBigint: constToBigint,
};

let shift = Fq(1n + 2n ** 255n);
let oneHalf = Fq.inverse(2n)!;

class Scalar {
  bits: BoolVar[];
  constantValue?: ScalarConst;

  constructor(bits: BoolVar[], constantValue?: ScalarConst) {
    this.bits = bits;
    this.constantValue = constantValue ?? toConstantScalar(bits);
  }
}

function toConstantScalar(bits: BoolVar[]) {
  let constantBits = Array<boolean>(bits.length);
  for (let i = 0; i < bits.length; i++) {
    let bool = bits[i];
    if (!FieldVar.isConstant(bool)) return undefined;
    constantBits[i] = FieldConst.equal(bool[1], FieldConst[1]);
  }
  let sShifted = Fq.fromBits(constantBits);
  let s = unshift(sShifted);
  return constFromBigint(s);
}

function unshift(s: Fq): Fq {
  return Fq.mul(Fq.sub(s, shift), oneHalf);
}

function constToBigint(x: ScalarConst): Fq {
  return Fq.fromBytes([...x]);
}
function constFromBigint(x: Fq) {
  return Uint8Array.from(Fq.toBytes(x));
}
