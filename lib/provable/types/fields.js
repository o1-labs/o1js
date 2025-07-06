"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fields = exports.modifiedField = void 0;
const field_constructor_js_1 = require("../core/field-constructor.js");
// provable for a single field element
const ProvableField = {
    sizeInFields: () => 1,
    toFields: (x) => [x],
    toAuxiliary: () => [],
    fromFields: ([x]) => x,
    check: () => { },
    toValue: (x) => x.toBigInt(),
    fromValue: (x) => (0, field_constructor_js_1.createField)(x),
    toInput: (x) => ({ fields: [x] }),
    toJSON: (x) => (0, field_constructor_js_1.getField)().toJSON(x),
    fromJSON: (x) => (0, field_constructor_js_1.getField)().fromJSON(x),
    empty: () => (0, field_constructor_js_1.createField)(0),
};
function modifiedField(methods) {
    return Object.assign({}, ProvableField, methods);
}
exports.modifiedField = modifiedField;
// provable for a fixed-size array of field elements
let id = (t) => t;
function fields(length) {
    return {
        sizeInFields: () => length,
        toFields: id,
        toAuxiliary: () => [],
        fromFields: id,
        check: () => { },
        toValue: (x) => x.map((y) => y.toBigInt()),
        fromValue: (x) => x.map(field_constructor_js_1.createField),
        toInput: (x) => ({ fields: x }),
        toJSON: (x) => x.map((0, field_constructor_js_1.getField)().toJSON),
        fromJSON: (x) => x.map((0, field_constructor_js_1.getField)().fromJSON),
        empty: () => {
            let zero = (0, field_constructor_js_1.createField)(0);
            return new Array(length).fill(zero);
        },
    };
}
exports.fields = fields;
