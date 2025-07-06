"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.witnessFields = exports.witnessAsync = exports.witness = void 0;
const provable_intf_js_1 = require("./provable-intf.js");
const provable_context_js_1 = require("../core/provable-context.js");
const exists_js_1 = require("../core/exists.js");
const types_js_1 = require("../../util/types.js");
const field_constructor_js_1 = require("../core/field-constructor.js");
function witness(type, compute) {
    const provable = provable_intf_js_1.ProvableType.get(type);
    let ctx = provable_context_js_1.snarkContext.get();
    // outside provable code, we just call the callback and return its cloned result
    if (!(0, provable_context_js_1.inCheckedComputation)() || ctx.inWitnessBlock) {
        return clone(provable, provable.fromValue(compute()));
    }
    let proverValue = undefined;
    let fields;
    let id = provable_context_js_1.snarkContext.enter({ ...ctx, inWitnessBlock: true });
    try {
        fields = (0, exists_js_1.exists)(provable.sizeInFields(), () => {
            let value = provable.fromValue(compute());
            proverValue = value;
            let fields = provable.toFields(value);
            return fields.map((x) => x.toBigInt());
        });
    }
    finally {
        provable_context_js_1.snarkContext.leave(id);
    }
    // rebuild the value from its fields (which are now variables) and aux data
    let aux = provable.toAuxiliary(proverValue);
    let value = provable.fromFields(fields, aux);
    // add type-specific constraints
    provable.check(value);
    return value;
}
exports.witness = witness;
async function witnessAsync(type, compute) {
    const provable = provable_intf_js_1.ProvableType.get(type);
    let ctx = provable_context_js_1.snarkContext.get();
    // outside provable code, we just call the callback and return its cloned result
    if (!(0, provable_context_js_1.inCheckedComputation)() || ctx.inWitnessBlock) {
        let value = await compute();
        return clone(provable, provable.fromValue(value));
    }
    let proverValue = undefined;
    let fields;
    // call into `existsAsync` to witness the raw field elements
    let id = provable_context_js_1.snarkContext.enter({ ...ctx, inWitnessBlock: true });
    try {
        fields = await (0, exists_js_1.existsAsync)(provable.sizeInFields(), async () => {
            let value = provable.fromValue(await compute());
            proverValue = value;
            let fields = provable.toFields(value);
            return fields.map((x) => x.toBigInt());
        });
    }
    finally {
        provable_context_js_1.snarkContext.leave(id);
    }
    // rebuild the value from its fields (which are now variables) and aux data
    let aux = provable.toAuxiliary(proverValue);
    let value = provable.fromFields(fields, aux);
    // add type-specific constraints
    provable.check(value);
    return value;
}
exports.witnessAsync = witnessAsync;
function witnessFields(size, compute) {
    // outside provable code, we just call the callback and return its cloned result
    if (!(0, provable_context_js_1.inCheckedComputation)() || provable_context_js_1.snarkContext.get().inWitnessBlock) {
        let fields = compute().map((x) => (0, field_constructor_js_1.createField)(x));
        return types_js_1.TupleN.fromArray(size, fields);
    }
    // call into `exists` to witness the field elements
    return (0, exists_js_1.exists)(size, () => {
        let fields = compute().map((x) => (typeof x === 'bigint' ? x : x.toBigInt()));
        return types_js_1.TupleN.fromArray(size, fields);
    });
}
exports.witnessFields = witnessFields;
function clone(type, value) {
    let fields = type.toFields(value);
    let aux = type.toAuxiliary?.(value) ?? [];
    return type.fromFields(fields, aux);
}
