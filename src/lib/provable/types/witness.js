import { ProvableType } from './provable-intf.js';
import { inCheckedComputation, snarkContext } from '../core/provable-context.js';
import { exists, existsAsync } from '../core/exists.js';
import { TupleN } from '../../util/types.js';
import { createField } from '../core/field-constructor.js';
export { witness, witnessAsync, witnessFields };
function witness(type, compute) {
    const provable = ProvableType.get(type);
    let ctx = snarkContext.get();
    // outside provable code, we just call the callback and return its cloned result
    if (!inCheckedComputation() || ctx.inWitnessBlock) {
        return clone(provable, provable.fromValue(compute()));
    }
    let proverValue = undefined;
    let fields;
    let id = snarkContext.enter({ ...ctx, inWitnessBlock: true });
    try {
        fields = exists(provable.sizeInFields(), () => {
            let value = provable.fromValue(compute());
            proverValue = value;
            let fields = provable.toFields(value);
            return fields.map((x) => x.toBigInt());
        });
    }
    finally {
        snarkContext.leave(id);
    }
    // rebuild the value from its fields (which are now variables) and aux data
    let aux = provable.toAuxiliary(proverValue);
    let value = provable.fromFields(fields, aux);
    // add type-specific constraints
    provable.check(value);
    return value;
}
async function witnessAsync(type, compute) {
    const provable = ProvableType.get(type);
    let ctx = snarkContext.get();
    // outside provable code, we just call the callback and return its cloned result
    if (!inCheckedComputation() || ctx.inWitnessBlock) {
        let value = await compute();
        return clone(provable, provable.fromValue(value));
    }
    let proverValue = undefined;
    let fields;
    // call into `existsAsync` to witness the raw field elements
    let id = snarkContext.enter({ ...ctx, inWitnessBlock: true });
    try {
        fields = await existsAsync(provable.sizeInFields(), async () => {
            let value = provable.fromValue(await compute());
            proverValue = value;
            let fields = provable.toFields(value);
            return fields.map((x) => x.toBigInt());
        });
    }
    finally {
        snarkContext.leave(id);
    }
    // rebuild the value from its fields (which are now variables) and aux data
    let aux = provable.toAuxiliary(proverValue);
    let value = provable.fromFields(fields, aux);
    // add type-specific constraints
    provable.check(value);
    return value;
}
function witnessFields(size, compute) {
    // outside provable code, we just call the callback and return its cloned result
    if (!inCheckedComputation() || snarkContext.get().inWitnessBlock) {
        let fields = compute().map((x) => createField(x));
        return TupleN.fromArray(size, fields);
    }
    // call into `exists` to witness the field elements
    return exists(size, () => {
        let fields = compute().map((x) => (typeof x === 'bigint' ? x : x.toBigInt()));
        return TupleN.fromArray(size, fields);
    });
}
function clone(type, value) {
    let fields = type.toFields(value);
    let aux = type.toAuxiliary?.(value) ?? [];
    return type.fromFields(fields, aux);
}
