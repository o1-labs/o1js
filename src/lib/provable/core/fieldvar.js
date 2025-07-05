import { Fp } from '../../../bindings/crypto/finite-field.js';
// internal API
export { FieldType, FieldVar, FieldConst };
function constToBigint(x) {
    return x[1];
}
function constFromBigint(x) {
    return [0, Fp.mod(x)];
}
const FieldConst = {
    fromBigint: constFromBigint,
    toBigint: constToBigint,
    equal(x, y) {
        return x[1] === y[1];
    },
    [0]: constFromBigint(0n),
    [1]: constFromBigint(1n),
    [-1]: constFromBigint(-1n),
};
var FieldType;
(function (FieldType) {
    FieldType[FieldType["Constant"] = 0] = "Constant";
    FieldType[FieldType["Var"] = 1] = "Var";
    FieldType[FieldType["Add"] = 2] = "Add";
    FieldType[FieldType["Scale"] = 3] = "Scale";
})(FieldType || (FieldType = {}));
const FieldVar = {
    // constructors
    Constant(x) {
        return [FieldType.Constant, x];
    },
    Var(x) {
        return [FieldType.Var, x];
    },
    Add(x, y) {
        return [FieldType.Add, x, y];
    },
    Scale(c, x) {
        return [FieldType.Scale, c, x];
    },
    constant(x) {
        let x0 = typeof x === 'bigint' ? FieldConst.fromBigint(x) : x;
        return [FieldType.Constant, x0];
    },
    add(x, y) {
        if (FieldVar.isConstant(x) && x[1][1] === 0n)
            return y;
        if (FieldVar.isConstant(y) && y[1][1] === 0n)
            return x;
        if (FieldVar.isConstant(x) && FieldVar.isConstant(y)) {
            return FieldVar.constant(Fp.add(x[1][1], y[1][1]));
        }
        return [FieldType.Add, x, y];
    },
    scale(c, x) {
        let c0 = typeof c === 'bigint' ? FieldConst.fromBigint(c) : c;
        if (c0[1] === 0n)
            return FieldVar.constant(0n);
        if (c0[1] === 1n)
            return x;
        if (FieldVar.isConstant(x)) {
            return FieldVar.constant(Fp.mul(c0[1], x[1][1]));
        }
        if (FieldVar.isScale(x)) {
            return [FieldType.Scale, FieldConst.fromBigint(Fp.mul(c0[1], x[1][1])), x[2]];
        }
        return [FieldType.Scale, c0, x];
    },
    // type guards
    isConstant(x) {
        return x[0] === FieldType.Constant;
    },
    isVar(x) {
        return x[0] === FieldType.Var;
    },
    isAdd(x) {
        return x[0] === FieldType.Add;
    },
    isScale(x) {
        return x[0] === FieldType.Scale;
    },
    [0]: [FieldType.Constant, FieldConst[0]],
    [1]: [FieldType.Constant, FieldConst[1]],
    [-1]: [FieldType.Constant, FieldConst[-1]],
};
