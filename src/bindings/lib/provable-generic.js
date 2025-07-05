export { createDerivers, createHashInput, };
let complexTypes = new Set(['object', 'function']);
let primitives = new Set([Number, String, Boolean, BigInt, null, undefined]);
function createDerivers() {
    const HashInput = createHashInput();
    /**
     * A function that gives us a hint that the input type is a `Provable` and we shouldn't continue
     * recursing into its properties, when computing methods that aren't required by the `Provable` interface.
     */
    function isProvable(typeObj) {
        return ('sizeInFields' in typeObj &&
            'toFields' in typeObj &&
            'fromFields' in typeObj &&
            'check' in typeObj &&
            'toValue' in typeObj &&
            'fromValue' in typeObj &&
            'toAuxiliary' in typeObj);
    }
    /**
     * Accepts objects of the form { provable: Provable }
     */
    function hasProvable(typeObj) {
        return ('provable' in typeObj &&
            (typeof typeObj.provable === 'object' || typeof typeObj.provable === 'function') &&
            typeObj.provable !== null &&
            isProvable(typeObj.provable));
    }
    function provable(typeObj) {
        if (!isPrimitive(typeObj) && !complexTypes.has(typeof typeObj)) {
            throw Error(`provable: unsupported type "${typeObj}"`);
        }
        function sizeInFields(typeObj) {
            if (isPrimitive(typeObj))
                return 0;
            if (!complexTypes.has(typeof typeObj))
                throw Error(`provable: unsupported type "${typeObj}"`);
            if (hasProvable(typeObj))
                return typeObj.provable.sizeInFields();
            if (Array.isArray(typeObj))
                return typeObj.map(sizeInFields).reduce((a, b) => a + b, 0);
            if (isProvable(typeObj))
                return typeObj.sizeInFields();
            return Object.values(typeObj)
                .map(sizeInFields)
                .reduce((a, b) => a + b, 0);
        }
        function toFields(typeObj, obj) {
            if (isPrimitive(typeObj))
                return [];
            if (!complexTypes.has(typeof typeObj))
                throw Error(`provable: unsupported type "${typeObj}"`);
            if (hasProvable(typeObj))
                return typeObj.provable.toFields(obj);
            if (Array.isArray(typeObj)) {
                if (!Array.isArray(obj)) {
                    if (typeof obj === 'object') {
                        return typeObj.map((t, i) => toFields(t, obj[i])).flat();
                    }
                    throw Error(`Expected an array for type, but got ${typeof obj}`);
                }
                if (typeObj.length !== obj.length) {
                    throw Error(`Expected array length ${typeObj.length}, but got ${obj.length}`);
                }
                return typeObj.map((t, i) => toFields(t, obj[i])).flat();
            }
            if (isProvable(typeObj))
                return typeObj.toFields(obj);
            return Object.keys(typeObj)
                .map((k) => toFields(typeObj[k], obj[k]))
                .flat();
        }
        function toAuxiliary(typeObj, obj) {
            if (typeObj === Number)
                return [obj ?? 0];
            if (typeObj === String)
                return [obj ?? ''];
            if (typeObj === Boolean)
                return [obj ?? false];
            if (typeObj === BigInt)
                return [obj ?? 0n];
            if (typeObj === undefined || typeObj === null)
                return [];
            if (isPrimitive(typeObj) || !complexTypes.has(typeof typeObj))
                throw Error(`provable: unsupported type "${typeObj}"`);
            if (hasProvable(typeObj))
                return typeObj.provable.toAuxiliary(obj);
            if (Array.isArray(typeObj))
                return typeObj.map((t, i) => toAuxiliary(t, obj?.[i]));
            if (isProvable(typeObj))
                return typeObj.toAuxiliary(obj);
            return Object.keys(typeObj).map((k) => toAuxiliary(typeObj[k], obj?.[k]));
        }
        function fromFields(typeObj, fields, aux = []) {
            if (typeObj === Number || typeObj === String || typeObj === Boolean || typeObj === BigInt)
                return aux[0];
            if (typeObj === undefined || typeObj === null)
                return typeObj;
            if (isPrimitive(typeObj) || !complexTypes.has(typeof typeObj))
                throw Error(`provable: unsupported type "${typeObj}"`);
            if (hasProvable(typeObj))
                return typeObj.provable.fromFields(fields, aux);
            if (Array.isArray(typeObj)) {
                let array = [];
                let i = 0;
                let offset = 0;
                for (let subObj of typeObj) {
                    let size = sizeInFields(subObj);
                    array.push(fromFields(subObj, fields.slice(offset, offset + size), aux[i]));
                    offset += size;
                    i++;
                }
                return array;
            }
            if (isProvable(typeObj))
                return typeObj.fromFields(fields, aux);
            let keys = Object.keys(typeObj);
            let values = fromFields(keys.map((k) => typeObj[k]), fields, aux);
            return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
        }
        function check(typeObj, obj) {
            if (isPrimitive(typeObj))
                return;
            if (!complexTypes.has(typeof typeObj))
                throw Error(`provable: unsupported type "${typeObj}"`);
            if (hasProvable(typeObj))
                return typeObj.provable.check(obj);
            if (Array.isArray(typeObj))
                return typeObj.forEach((t, i) => check(t, obj[i]));
            if (isProvable(typeObj))
                return typeObj.check(obj);
            if (display(typeObj) === 'Struct') {
                throw new Error(`provable: cannot run check() on 'Struct' type. ` +
                    `Instead of using 'Struct' directly, extend 'Struct' to create a specific type.\n\n` +
                    `Example:\n` +
                    `// Incorrect Usage:\n` +
                    `class MyStruct extends Struct({\n` +
                    `  fieldA: Struct, // This is incorrect\n` +
                    `}) {}\n\n` +
                    `// Correct Usage:\n` +
                    `class MyStruct extends Struct({\n` +
                    `  fieldA: MySpecificStruct, // Use the specific struct type\n` +
                    `}) {}\n`);
            }
            if (typeof typeObj === 'function') {
                throw new Error(`provable: invalid type detected. Functions are not supported as types. ` +
                    `Ensure you are passing an instance of a supported type or an anonymous object.\n`);
            }
            // Only recurse into the object if it's an object and not a function
            return Object.keys(typeObj).forEach((k) => check(typeObj[k], obj[k]));
        }
        function toCanonical(typeObj, value) {
            if (isPrimitive(typeObj))
                return value;
            if (!complexTypes.has(typeof typeObj))
                throw Error(`provable: unsupported type "${typeObj}"`);
            if (hasProvable(typeObj))
                return typeObj.provable.toCanonical?.(value) ?? value;
            if (Array.isArray(typeObj)) {
                return typeObj.forEach((t, i) => toCanonical(t, value[i]));
            }
            if (isProvable(typeObj))
                return typeObj.toCanonical?.(value) ?? value;
            return Object.fromEntries(Object.keys(typeObj).map((k) => {
                return [k, toCanonical(typeObj[k], value[k])];
            }));
        }
        const toValue = createMap('toValue');
        const fromValue = createMap('fromValue');
        let { empty, fromJSON, toJSON, toInput } = signable(typeObj, 
        // if one of these is true, we don't want to continue searching for 'signable' methods
        (obj) => isProvable(obj) || hasProvable(obj));
        const type = typeObj;
        return {
            sizeInFields: () => sizeInFields(type),
            toFields: (obj) => toFields(type, obj),
            toAuxiliary: (obj) => toAuxiliary(type, obj),
            fromFields: (fields, aux) => fromFields(type, fields, aux),
            check: (obj) => check(type, obj),
            toValue(x) {
                return toValue(type, x);
            },
            fromValue(v) {
                return fromValue(type, v);
            },
            toCanonical(x) {
                return toCanonical(type, x);
            },
            toInput: (obj) => toInput(obj),
            toJSON: (obj) => toJSON(obj),
            fromJSON: (json) => fromJSON(json),
            empty: () => empty(),
        };
    }
    function signable(typeObj, shouldTerminate) {
        let objectKeys = typeof typeObj === 'object' && typeObj !== null ? Object.keys(typeObj) : [];
        let primitives = new Set([Number, String, Boolean, BigInt, null, undefined]);
        if (!primitives.has(typeObj) && !complexTypes.has(typeof typeObj)) {
            throw Error(`provable: unsupported type "${typeObj}"`);
        }
        function toInput(typeObj, obj) {
            if (primitives.has(typeObj))
                return {};
            if (!complexTypes.has(typeof typeObj))
                throw Error(`provable: unsupported type "${typeObj}"`);
            if ('provable' in typeObj)
                return toInput(typeObj.provable, obj);
            if (Array.isArray(typeObj)) {
                return typeObj.map((t, i) => toInput(t, obj[i])).reduce(HashInput.append, HashInput.empty);
            }
            if ('toInput' in typeObj)
                return typeObj.toInput(obj);
            if ('toFields' in typeObj) {
                return { fields: typeObj.toFields(obj) };
            }
            return Object.keys(typeObj)
                .map((k) => toInput(typeObj[k], obj[k]))
                .reduce(HashInput.append, HashInput.empty);
        }
        function toJSON(typeObj, obj) {
            if (typeObj === BigInt)
                return obj.toString();
            if (typeObj === String || typeObj === Number || typeObj === Boolean)
                return obj;
            if (typeObj === undefined || typeObj === null)
                return null;
            if (!complexTypes.has(typeof typeObj))
                throw Error(`provable: unsupported type "${typeObj}"`);
            if ('provable' in typeObj)
                return toJSON(typeObj.provable, obj);
            if (Array.isArray(typeObj))
                return typeObj.map((t, i) => toJSON(t, obj[i]));
            if ('toJSON' in typeObj)
                return typeObj.toJSON(obj);
            if (shouldTerminate?.(typeObj) === true) {
                throw Error(`Expected \`toJSON()\` method on ${display(typeObj)}`);
            }
            return Object.fromEntries(Object.keys(typeObj).map((k) => [k, toJSON(typeObj[k], obj[k])]));
        }
        function fromJSON(typeObj, json) {
            if (typeObj === BigInt)
                return BigInt(json);
            if (typeObj === String || typeObj === Number || typeObj === Boolean)
                return json;
            if (typeObj === null || typeObj === undefined)
                return undefined;
            if (!complexTypes.has(typeof typeObj))
                throw Error(`provable: unsupported type "${typeObj}"`);
            if ('provable' in typeObj)
                return fromJSON(typeObj.provable, json);
            if (Array.isArray(typeObj))
                return typeObj.map((t, i) => fromJSON(t, json[i]));
            if ('fromJSON' in typeObj)
                return typeObj.fromJSON(json);
            if (shouldTerminate?.(typeObj) === true) {
                throw Error(`Expected \`fromJSON()\` method on ${display(typeObj)}`);
            }
            let keys = Object.keys(typeObj);
            let values = fromJSON(keys.map((k) => typeObj[k]), keys.map((k) => json[k]));
            return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
        }
        function empty(typeObj) {
            if (typeObj === Number)
                return 0;
            if (typeObj === String)
                return '';
            if (typeObj === Boolean)
                return false;
            if (typeObj === BigInt)
                return 0n;
            if (typeObj === null || typeObj === undefined)
                return typeObj;
            if (!complexTypes.has(typeof typeObj))
                throw Error(`provable: unsupported type "${typeObj}"`);
            if ('provable' in typeObj)
                return empty(typeObj.provable);
            if (Array.isArray(typeObj))
                return typeObj.map(empty);
            if ('empty' in typeObj)
                return typeObj.empty();
            if (shouldTerminate?.(typeObj) === true) {
                throw Error(`Expected \`empty()\` method on ${display(typeObj)}`);
            }
            return Object.fromEntries(Object.keys(typeObj).map((k) => [k, empty(typeObj[k])]));
        }
        return {
            toInput: (obj) => toInput(typeObj, obj),
            toJSON: (obj) => toJSON(typeObj, obj),
            fromJSON: (json) => fromJSON(typeObj, json),
            empty: () => empty(typeObj),
        };
    }
    function display(typeObj) {
        if ('name' in typeObj)
            return typeObj.name;
        return 'anonymous type object';
    }
    function createMap(name) {
        function map(typeObj, obj) {
            if (primitives.has(typeObj))
                return obj;
            if (!complexTypes.has(typeof typeObj))
                throw Error(`provable: unsupported type "${typeObj}"`);
            if (hasProvable(typeObj) && name in typeObj.provable)
                return typeObj.provable[name](obj);
            if (Array.isArray(typeObj))
                return typeObj.map((t, i) => map(t, obj[i]));
            if (name in typeObj)
                return typeObj[name](obj);
            return Object.fromEntries(Object.keys(typeObj).map((k) => [k, map(typeObj[k], obj[k])]));
        }
        return map;
    }
    return { provable, signable };
}
function isPrimitive(typeObj) {
    return primitives.has(typeObj);
}
function createHashInput() {
    return {
        get empty() {
            return {};
        },
        append(input1, input2) {
            return {
                fields: (input1.fields ?? []).concat(input2.fields ?? []),
                packed: (input1.packed ?? []).concat(input2.packed ?? []),
            };
        },
    };
}
