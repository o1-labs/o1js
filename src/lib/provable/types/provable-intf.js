import { createField } from '../core/field-constructor.js';
export { ProvableType, };
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
        return provable.fromFields(Array(provable.sizeInFields()).fill(createField(0)), provable.toAuxiliary());
    },
};
