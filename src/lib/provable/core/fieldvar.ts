import { Fp } from '../../../bindings/crypto/finite-field.js';

// internal API
export { FieldType, FieldVar, FieldConst, ConstantFieldVar, VarFieldVar };

type FieldConst = [0, bigint];

function constToBigint(x: FieldConst): bigint {
  return x[1];
}
function constFromBigint(x: bigint): FieldConst {
  return [0, Fp.mod(x)];
}

const FieldConst = {
  fromBigint: constFromBigint,
  toBigint: constToBigint,
  equal(x: FieldConst, y: FieldConst) {
    return x[1] === y[1];
  },
  [0]: constFromBigint(0n),
  [1]: constFromBigint(1n),
  [-1]: constFromBigint(-1n),
};

enum FieldType {
  Constant,
  Var,
  Add,
  Scale,
}

/**
 * `FieldVar` is the core data type in snarky. It is eqivalent to `Cvar.t` in OCaml.
 * It represents a field element that is part of provable code - either a constant or a variable.
 *
 * **Variables** end up filling the witness columns of a constraint system.
 * Think of a variable as a value that has to be provided by the prover, and that has to satisfy all the
 * constraints it is involved in.
 *
 * **Constants** end up being hard-coded into the constraint system as gate coefficients.
 * Think of a constant as a value that is known publicly, at compile time, and that defines the constraint system.
 *
 * Both constants and variables can be combined into an AST using the Add and Scale combinators.
 */
type FieldVar =
  | [FieldType.Constant, FieldConst]
  | [FieldType.Var, number]
  | [FieldType.Add, FieldVar, FieldVar]
  | [FieldType.Scale, FieldConst, FieldVar];

type ConstantFieldVar = [FieldType.Constant, FieldConst];
type VarFieldVar = [FieldType.Var, number];

const FieldVar = {
  // constructors
  Constant(x: FieldConst): ConstantFieldVar {
    return [FieldType.Constant, x];
  },
  Var(x: number): VarFieldVar {
    return [FieldType.Var, x];
  },
  Add(x: FieldVar, y: FieldVar): [FieldType.Add, FieldVar, FieldVar] {
    return [FieldType.Add, x, y];
  },
  Scale(c: FieldConst, x: FieldVar): [FieldType.Scale, FieldConst, FieldVar] {
    return [FieldType.Scale, c, x];
  },

  constant(x: bigint | FieldConst): ConstantFieldVar {
    let x0 = typeof x === 'bigint' ? FieldConst.fromBigint(x) : x;
    return [FieldType.Constant, x0];
  },
  add(x: FieldVar, y: FieldVar): FieldVar {
    if (FieldVar.isConstant(x) && x[1][1] === 0n) return y;
    if (FieldVar.isConstant(y) && y[1][1] === 0n) return x;
    if (FieldVar.isConstant(x) && FieldVar.isConstant(y)) {
      return FieldVar.constant(Fp.add(x[1][1], y[1][1]));
    }
    return [FieldType.Add, x, y];
  },
  scale(c: bigint | FieldConst, x: FieldVar): FieldVar {
    let c0 = typeof c === 'bigint' ? FieldConst.fromBigint(c) : c;
    if (c0[1] === 0n) return FieldVar.constant(0n);
    if (c0[1] === 1n) return x;
    if (FieldVar.isConstant(x)) {
      return FieldVar.constant(Fp.mul(c0[1], x[1][1]));
    }
    if (FieldVar.isScale(x)) {
      return [
        FieldType.Scale,
        FieldConst.fromBigint(Fp.mul(c0[1], x[1][1])),
        x[2],
      ];
    }
    return [FieldType.Scale, c0, x];
  },

  // type guards
  isConstant(x: FieldVar): x is ConstantFieldVar {
    return x[0] === FieldType.Constant;
  },
  isVar(x: FieldVar): x is VarFieldVar {
    return x[0] === FieldType.Var;
  },
  isAdd(x: FieldVar): x is [FieldType.Add, FieldVar, FieldVar] {
    return x[0] === FieldType.Add;
  },
  isScale(x: FieldVar): x is [FieldType.Scale, FieldConst, FieldVar] {
    return x[0] === FieldType.Scale;
  },

  [0]: [FieldType.Constant, FieldConst[0]] satisfies ConstantFieldVar,
  [1]: [FieldType.Constant, FieldConst[1]] satisfies ConstantFieldVar,
  [-1]: [FieldType.Constant, FieldConst[-1]] satisfies ConstantFieldVar,
};
