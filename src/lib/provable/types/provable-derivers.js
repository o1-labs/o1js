import { createDerivers, createHashInput, } from '../../../bindings/lib/provable-generic.js';
// external API
export { provable, provablePure, provableTuple, provableFromClass, provableExtends, };
// internal API
export { HashInput, mapValue, };
const HashInput = createHashInput();
const { provable } = createDerivers();
function provablePure(typeObj) {
    return provable(typeObj, { isPure: true });
}
function provableTuple(types) {
    return provable(types);
}
function provableFromClass(Class, typeObj) {
    let raw = provable(typeObj);
    return {
        sizeInFields: raw.sizeInFields,
        toFields: raw.toFields,
        toAuxiliary: raw.toAuxiliary,
        fromFields(fields, aux) {
            return construct(Class, raw.fromFields(fields, aux));
        },
        check(value) {
            if (Class.check !== undefined) {
                Class.check(value);
            }
            else {
                raw.check(value);
            }
        },
        toValue: raw.toValue,
        fromValue(x) {
            return construct(Class, raw.fromValue(x));
        },
        toInput: raw.toInput,
        toJSON: raw.toJSON,
        fromJSON(x) {
            return construct(Class, raw.fromJSON(x));
        },
        empty() {
            return Class.empty !== undefined ? Class.empty() : construct(Class, raw.empty());
        },
    };
}
function construct(Class, value) {
    let instance = Object.create(Class.prototype);
    return Object.assign(instance, value);
}
function provableExtends(S, base) {
    return {
        sizeInFields() {
            return base.sizeInFields();
        },
        toFields(value) {
            return base.toFields(value);
        },
        toAuxiliary(value) {
            return base.toAuxiliary(value);
        },
        fromFields(fields, aux) {
            return new S(base.fromFields(fields, aux));
        },
        check(value) {
            base.check(value);
        },
        toValue(value) {
            return base.toValue(value);
        },
        fromValue(value) {
            return new S(base.fromValue(value));
        },
        empty() {
            return new S(base.empty());
        },
        toInput(value) {
            return base.toInput(value);
        },
    };
}
function mapValue(provable, there, back) {
    return {
        sizeInFields() {
            return provable.sizeInFields();
        },
        toFields(value) {
            return provable.toFields(value);
        },
        toAuxiliary(value) {
            return provable.toAuxiliary(value);
        },
        fromFields(fields, aux) {
            return provable.fromFields(fields, aux);
        },
        check(value) {
            provable.check(value);
        },
        toValue(value) {
            return there(provable.toValue(value));
        },
        fromValue(value) {
            return provable.fromValue(back(value));
        },
        empty() {
            return provable.empty();
        },
        toInput(value) {
            return provable.toInput(value);
        },
    };
}
