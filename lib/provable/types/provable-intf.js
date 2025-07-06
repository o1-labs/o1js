"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvableType = void 0;
const field_constructor_js_1 = require("../core/field-constructor.js");
const ProvableType = {
    get(type) {
        return ((typeof type === 'object' || typeof type === 'function') &&
            type !== null &&
            'provable' in type
            ? type.provable
            : type);
    },
    /**
     * Create some value of type `T` from its provable type description.
     */
    synthesize(type) {
        let provable = ProvableType.get(type);
        return provable.fromFields(Array(provable.sizeInFields()).fill((0, field_constructor_js_1.createField)(0)), provable.toAuxiliary());
    },
};
exports.ProvableType = ProvableType;
