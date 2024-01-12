import { Snarky } from "../snarky.js";
import { assert } from "./errors.js";
import { FieldConst, FieldType, FieldVar, readVarMessage, withMessage } from "./field.js";
import { inCheckedComputation } from "./provable-context.js";

export { FieldBn254 }

type ConstantFieldVar = [FieldType.Constant, FieldConst];
type ConstantField = FieldBn254 & { value: ConstantFieldVar };

class FieldBn254 {
    value: FieldVar;

    constructor(x: FieldVar | FieldConst) {
        if (typeof x[1] === 'bigint') {
            // FieldConst
            this.value = FieldVar.constant(x as FieldConst);
        } else {
            // FieldVar
            this.value = x as FieldVar;
        }
    }

    assertEquals(y: FieldBn254, message?: string) {
        try {
            Snarky.fieldBn254.assertEqual(this.value, y.value);
        } catch (err) {
            throw withMessage(err, message);
        }
    }

    isConstant(): this is { value: ConstantFieldVar } {
        return this.value[0] === FieldType.Constant;
    }

    #toConstant(name: string): ConstantField {
        return toConstantField(this, name, 'x', 'field element');
    }

    toConstant(): ConstantField {
        return this.#toConstant('toConstant');
    }
}

function toConstantField(
    x: FieldBn254,
    methodName: string,
    varName = 'x',
    varDescription = 'field element'
): ConstantField {
    // if this is a constant, return it
    if (x.isConstant()) return x;

    // a non-constant can only appear inside a checked computation. everything else is a bug.
    assert(
        inCheckedComputation(),
        'variables only exist inside checked computations'
    );

    // if we are inside an asProver or witness block, read the variable's value and return it as constant
    if (Snarky.run.inProverBlock()) {
        let value = Snarky.field.readVar(x.value);
        return new FieldBn254(value) as ConstantField;
    }

    // otherwise, calling `toConstant()` is likely a mistake. throw a helpful error message.
    throw Error(readVarMessage(methodName, varName, varDescription));
}
