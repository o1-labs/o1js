export { primitiveTypes, primitiveTypeMap, EmptyNull, EmptyUndefined, EmptyVoid, };
const emptyType = {
    sizeInFields: () => 0,
    toFields: () => [],
    toAuxiliary: () => [],
    fromFields: () => null,
    check: () => { },
    toInput: () => ({}),
    toJSON: () => null,
    fromJSON: () => null,
    empty: () => null,
    toValue: () => null,
    fromValue: () => null,
};
const undefinedType = {
    ...emptyType,
    fromFields: () => undefined,
    toJSON: () => null,
    fromJSON: () => undefined,
    empty: () => undefined,
    toValue: () => undefined,
    fromValue: () => undefined,
};
let primitiveTypes = new Set(['number', 'string', 'null']);
function EmptyNull() {
    return emptyType;
}
function EmptyUndefined() {
    return undefinedType;
}
function EmptyVoid() {
    return undefinedType;
}
const primitiveTypeMap = {
    number: {
        ...emptyType,
        toAuxiliary: (value = 0) => [value],
        toJSON: (value) => value,
        fromJSON: (value) => value,
        fromFields: (_, [value]) => value,
        empty: () => 0,
        toValue: (value) => value,
        fromValue: (value) => value,
    },
    string: {
        ...emptyType,
        toAuxiliary: (value = '') => [value],
        toJSON: (value) => value,
        fromJSON: (value) => value,
        fromFields: (_, [value]) => value,
        empty: () => '',
        toValue: (value) => value,
        fromValue: (value) => value,
    },
    null: emptyType,
};
