import { primitiveTypeMap, primitiveTypes, } from './generic.js';
export { ProvableFromLayout, SignableFromLayout, genericLayoutFold };
function SignableFromLayout(TypeMap, customTypes) {
    const Field = TypeMap.Field;
    function layoutFold(spec, typeData, value) {
        return genericLayoutFold(TypeMap, customTypes, spec, typeData, value);
    }
    function signableFromLayout(typeData) {
        return {
            toJSON(value) {
                return toJSON(typeData, value);
            },
            fromJSON(json) {
                return fromJSON(typeData, json);
            },
            toInput(value) {
                return toInput(typeData, value);
            },
            empty() {
                return empty(typeData);
            },
        };
    }
    function toJSON(typeData, value) {
        return layoutFold({
            map(type, value) {
                return type.toJSON(value);
            },
            reduceArray(array) {
                return array;
            },
            reduceObject(_, object) {
                return object;
            },
            reduceFlaggedOption({ isSome, value }) {
                return isSome ? value : null;
            },
            reduceOrUndefined(value) {
                return value ?? null;
            },
        }, typeData, value);
    }
    function fromJSON(typeData, json) {
        let { checkedTypeName } = typeData;
        if (checkedTypeName) {
            // there's a custom type!
            return customTypes[checkedTypeName].fromJSON(json);
        }
        if (typeData.type === 'array') {
            let arrayTypeData = typeData;
            return json.map((json) => fromJSON(arrayTypeData.inner, json));
        }
        if (typeData.type === 'option') {
            let optionTypeData = typeData;
            switch (optionTypeData.optionType) {
                case 'closedInterval':
                case 'flaggedOption': {
                    let isSome = TypeMap.Bool.fromJSON(json !== null);
                    let value;
                    if (json !== null) {
                        value = fromJSON(optionTypeData.inner, json);
                    }
                    else {
                        value = empty(optionTypeData.inner);
                        if (optionTypeData.optionType === 'closedInterval') {
                            let innerInner = optionTypeData.inner.entries.lower;
                            let innerType = TypeMap[innerInner.type];
                            value.lower = innerType.fromJSON(optionTypeData.rangeMin);
                            value.upper = innerType.fromJSON(optionTypeData.rangeMax);
                        }
                    }
                    return { isSome, value };
                }
                case 'orUndefined': {
                    return json === null ? undefined : fromJSON(optionTypeData.inner, json);
                }
                default:
                    throw Error('bug');
            }
        }
        if (typeData.type === 'object') {
            let { keys, entries } = typeData;
            let values = {};
            for (let i = 0; i < keys.length; i++) {
                let typeEntry = entries[keys[i]];
                values[keys[i]] = fromJSON(typeEntry, json[keys[i]]);
            }
            return values;
        }
        if (primitiveTypes.has(typeData.type)) {
            return primitiveTypeMap[typeData.type].fromJSON(json);
        }
        return TypeMap[typeData.type].fromJSON(json);
    }
    function empty(typeData) {
        return layoutFold({
            map(type) {
                return type.empty();
            },
            reduceArray(array) {
                return array;
            },
            reduceObject(_, object) {
                return object;
            },
            reduceFlaggedOption({ isSome, value }, typeData) {
                if (typeData.optionType === 'closedInterval') {
                    let innerInner = typeData.inner.entries.lower;
                    let innerType = TypeMap[innerInner.type];
                    value.lower = innerType.fromJSON(typeData.rangeMin);
                    value.upper = innerType.fromJSON(typeData.rangeMax);
                }
                return { isSome, value };
            },
            reduceOrUndefined() {
                return undefined;
            },
        }, typeData, undefined);
    }
    function toInput(typeData, value) {
        return layoutFold({
            map(type, value) {
                return type.toInput(value);
            },
            reduceArray(array) {
                let acc = { fields: [], packed: [] };
                for (let { fields, packed } of array) {
                    if (fields)
                        acc.fields.push(...fields);
                    if (packed)
                        acc.packed.push(...packed);
                }
                return acc;
            },
            reduceObject(keys, object) {
                let acc = { fields: [], packed: [] };
                for (let key of keys) {
                    let { fields, packed } = object[key];
                    if (fields)
                        acc.fields.push(...fields);
                    if (packed)
                        acc.packed.push(...packed);
                }
                return acc;
            },
            reduceFlaggedOption({ isSome, value }) {
                return {
                    fields: value.fields,
                    packed: isSome.packed.concat(value.packed ?? []),
                };
            },
            reduceOrUndefined(_) {
                return {};
            },
        }, typeData, value);
    }
    // helper for pretty-printing / debugging
    function toJSONEssential(typeData, value) {
        return layoutFold({
            map(type, value) {
                return type.toJSON(value);
            },
            reduceArray(array) {
                if (array.length === 0 || array.every((x) => x === null))
                    return null;
                return array;
            },
            reduceObject(_, object) {
                for (let key in object) {
                    if (object[key] === null) {
                        delete object[key];
                    }
                }
                if (Object.keys(object).length === 0)
                    return null;
                return object;
            },
            reduceFlaggedOption({ isSome, value }) {
                return isSome ? value : null;
            },
            reduceOrUndefined(value) {
                return value ?? null;
            },
        }, typeData, value);
    }
    return {
        signableFromLayout,
        toInput,
        toJSON,
        fromJSON,
        empty,
        toJSONEssential,
    };
}
function ProvableFromLayout(TypeMap, customTypes) {
    const Field = TypeMap.Field;
    const { toInput, toJSON, fromJSON, empty, toJSONEssential } = SignableFromLayout(TypeMap, customTypes);
    function layoutFold(spec, typeData, value) {
        return genericLayoutFold(TypeMap, customTypes, spec, typeData, value);
    }
    function layoutMap(map, typeData, value) {
        return genericLayoutMap(TypeMap, customTypes, map, typeData, value);
    }
    function provableFromLayout(typeData) {
        return {
            sizeInFields() {
                return sizeInFields(typeData);
            },
            toFields(value) {
                return toFields(typeData, value);
            },
            toAuxiliary(value) {
                return toAuxiliary(typeData, value);
            },
            fromFields(fields, aux) {
                return fromFields(typeData, fields, aux);
            },
            toJSON(value) {
                return toJSON(typeData, value);
            },
            fromJSON(json) {
                return fromJSON(typeData, json);
            },
            check(value) {
                check(typeData, value);
            },
            // TODO implement properly
            // currently, the implementation below is fine because `provableFromLayout()`
            // is not used on any non-canonical types, so returning the element itself is correct.
            // (we do need an implementation though and can't just throw an error)
            toCanonical(value) {
                return value;
            },
            toInput(value) {
                return toInput(typeData, value);
            },
            empty() {
                return empty(typeData);
            },
            toValue(value) {
                return toValue(typeData, value);
            },
            fromValue(value) {
                return fromValue(typeData, value);
            },
        };
    }
    function toFields(typeData, value) {
        return layoutFold({
            map(type, value) {
                return type.toFields(value);
            },
            reduceArray(array) {
                return array.flat();
            },
            reduceObject(keys, object) {
                return keys.map((key) => object[key]).flat();
            },
            reduceFlaggedOption({ isSome, value }) {
                return [isSome, value].flat();
            },
            reduceOrUndefined(_) {
                return [];
            },
        }, typeData, value);
    }
    function toAuxiliary(typeData, value) {
        return layoutFold({
            map(type, value) {
                return type.toAuxiliary(value);
            },
            reduceArray(array) {
                return array;
            },
            reduceObject(keys, object) {
                return keys.map((key) => object[key]);
            },
            reduceFlaggedOption({ value }) {
                return value;
            },
            reduceOrUndefined(value) {
                return value === undefined ? [false] : [true, value];
            },
        }, typeData, value);
    }
    function sizeInFields(typeData) {
        let spec = {
            map(type) {
                return type.sizeInFields();
            },
            reduceArray(_, { inner, staticLength }) {
                let length = staticLength ?? NaN;
                return length * layoutFold(spec, inner);
            },
            reduceObject(keys, object) {
                return keys.map((key) => object[key]).reduce((x, y) => x + y);
            },
            reduceFlaggedOption({ isSome, value }) {
                return isSome + value;
            },
            reduceOrUndefined(_) {
                return 0;
            },
        };
        return layoutFold(spec, typeData);
    }
    function fromFields(typeData, fields, aux) {
        let { checkedTypeName } = typeData;
        if (checkedTypeName) {
            // there's a custom type!
            return customTypes[checkedTypeName].fromFields(fields, aux);
        }
        if (typeData.type === 'array') {
            let arrayTypeData = typeData;
            let size = sizeInFields(arrayTypeData.inner);
            let length = aux.length;
            let value = [];
            for (let i = 0, offset = 0; i < length; i++, offset += size) {
                value[i] = fromFields(arrayTypeData.inner, fields.slice(offset, offset + size), aux[i]);
            }
            return value;
        }
        if (typeData.type === 'option') {
            let { optionType, inner } = typeData;
            switch (optionType) {
                case 'closedInterval':
                case 'flaggedOption': {
                    let [first, ...rest] = fields;
                    let isSome = TypeMap.Bool.fromFields([first], []);
                    let value = fromFields(inner, rest, aux);
                    return { isSome, value };
                }
                case 'orUndefined': {
                    let [isDefined, value] = aux;
                    return isDefined ? fromFields(inner, fields, value) : undefined;
                }
                default:
                    throw Error('bug');
            }
        }
        if (typeData.type === 'object') {
            let { keys, entries } = typeData;
            let values = {};
            let offset = 0;
            for (let i = 0; i < keys.length; i++) {
                let typeEntry = entries[keys[i]];
                let size = sizeInFields(typeEntry);
                values[keys[i]] = fromFields(typeEntry, fields.slice(offset, offset + size), aux[i]);
                offset += size;
            }
            return values;
        }
        if (primitiveTypes.has(typeData.type)) {
            return primitiveTypeMap[typeData.type].fromFields(fields, aux);
        }
        return TypeMap[typeData.type].fromFields(fields, aux);
    }
    function check(typeData, value) {
        return layoutFold({
            map(type, value) {
                return type.check(value);
            },
            reduceArray() { },
            reduceObject() { },
            reduceFlaggedOption() { },
            reduceOrUndefined() { },
        }, typeData, value);
    }
    function toValue(typeData, value) {
        return layoutMap((type, value) => type.toValue(value), typeData, value);
    }
    function fromValue(typeData, value) {
        return layoutMap((type, value) => type.fromValue(value), typeData, value);
    }
    return { provableFromLayout, toJSONEssential, empty };
}
function genericLayoutFold(TypeMap, customTypes, spec, typeData, value) {
    let { checkedTypeName } = typeData;
    if (checkedTypeName) {
        // there's a custom type!
        return spec.map(customTypes[checkedTypeName], value, checkedTypeName);
    }
    if (typeData.type === 'array') {
        let arrayTypeData = typeData;
        let v = value;
        if (arrayTypeData.staticLength !== null && v === undefined) {
            v = Array(arrayTypeData.staticLength).fill(undefined);
        }
        let array = v?.map((x) => genericLayoutFold(TypeMap, customTypes, spec, arrayTypeData.inner, x)) ?? [];
        return spec.reduceArray(array, arrayTypeData);
    }
    if (typeData.type === 'option') {
        let { optionType, inner } = typeData;
        switch (optionType) {
            case 'closedInterval':
            case 'flaggedOption':
                let v = value;
                return spec.reduceFlaggedOption({
                    isSome: spec.map(TypeMap.Bool, v?.isSome, 'Bool'),
                    value: genericLayoutFold(TypeMap, customTypes, spec, inner, v?.value),
                }, typeData);
            case 'orUndefined':
                let mapped = value === undefined
                    ? undefined
                    : genericLayoutFold(TypeMap, customTypes, spec, inner, value);
                return spec.reduceOrUndefined(mapped, inner);
            default:
                throw Error('bug');
        }
    }
    if (typeData.type === 'object') {
        let { keys, entries } = typeData;
        let v = value;
        let object = {};
        keys.forEach((key) => {
            object[key] = genericLayoutFold(TypeMap, customTypes, spec, entries[key], v?.[key]);
        });
        return spec.reduceObject(keys, object);
    }
    if (primitiveTypes.has(typeData.type)) {
        return spec.map(primitiveTypeMap[typeData.type], value, typeData.type);
    }
    return spec.map(TypeMap[typeData.type], value, typeData.type);
}
function genericLayoutMap(TypeMap, customTypes, map, typeData, value) {
    return genericLayoutFold(TypeMap, customTypes, {
        map(type, value) {
            return map(type, value);
        },
        reduceArray(array) {
            return array;
        },
        reduceObject(_, object) {
            return object;
        },
        reduceFlaggedOption(option) {
            return option;
        },
        reduceOrUndefined(value) {
            return value;
        },
    }, typeData, value);
}
