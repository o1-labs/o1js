import 'reflect-metadata';
import { HashInput } from './provable-derivers.js';
import { Provable } from '../provable.js';
export { CircuitValue, prop, arrayProp };
/**
 * @deprecated `CircuitValue` is deprecated in favor of {@link Struct}, which features a simpler API and better typing.
 */
class CircuitValue {
    constructor(...props) {
        // if this is called with no arguments, do nothing, to support simple super() calls
        if (props.length === 0)
            return;
        let fields = this.constructor.prototype._fields;
        if (fields === undefined)
            return;
        if (props.length !== fields.length) {
            throw Error(`${this.constructor.name} constructor called with ${props.length} arguments, but expected ${fields.length}`);
        }
        for (let i = 0; i < fields.length; ++i) {
            let [key] = fields[i];
            this[key] = props[i];
        }
    }
    static fromObject(value) {
        return Object.assign(Object.create(this.prototype), value);
    }
    static sizeInFields() {
        const fields = this.prototype._fields;
        return fields.reduce((acc, [_, typ]) => acc + typ.sizeInFields(), 0);
    }
    static toFields(v) {
        const res = [];
        const fields = this.prototype._fields;
        if (fields === undefined || fields === null) {
            return res;
        }
        for (let i = 0, n = fields.length; i < n; ++i) {
            const [key, propType] = fields[i];
            const subElts = propType.toFields(v[key]);
            subElts.forEach((x) => res.push(x));
        }
        return res;
    }
    static toAuxiliary() {
        return [];
    }
    static toInput(v) {
        let input = { fields: [], packed: [] };
        let fields = this.prototype._fields;
        if (fields === undefined)
            return input;
        for (let i = 0, n = fields.length; i < n; ++i) {
            let [key, type] = fields[i];
            if ('toInput' in type) {
                input = HashInput.append(input, type.toInput(v[key]));
                continue;
            }
            // as a fallback, use toFields on the type
            // TODO: this is problematic -- ignores if there's a toInput on a nested type
            // so, remove this? should every provable define toInput?
            let xs = type.toFields(v[key]);
            input.fields.push(...xs);
        }
        return input;
    }
    toFields() {
        return this.constructor.toFields(this);
    }
    static toValue(v) {
        const res = {};
        let fields = this.prototype._fields ?? [];
        fields.forEach(([key, propType]) => {
            res[key] = propType.toValue(v[key]);
        });
        return res;
    }
    static fromValue(value) {
        let props = {};
        let fields = this.prototype._fields ?? [];
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw Error(`${this.name}.fromValue(): invalid input ${value}`);
        }
        for (let i = 0; i < fields.length; ++i) {
            let [key, propType] = fields[i];
            if (value[key] === undefined) {
                throw Error(`${this.name}.fromValue(): invalid input ${value}`);
            }
            else {
                props[key] = propType.fromValue(value[key]);
            }
        }
        return Object.assign(Object.create(this.prototype), props);
    }
    toJSON() {
        return this.constructor.toJSON(this);
    }
    toConstant() {
        return this.constructor.toConstant(this);
    }
    equals(x) {
        return Provable.equal(this.constructor, this, x);
    }
    assertEquals(x) {
        Provable.assertEqual(this, x);
    }
    isConstant() {
        return this.toFields().every((x) => x.isConstant());
    }
    static fromFields(xs) {
        const fields = this.prototype._fields;
        if (xs.length < fields.length) {
            throw Error(`${this.name}.fromFields: Expected ${fields.length} field elements, got ${xs?.length}`);
        }
        let offset = 0;
        const props = {};
        for (let i = 0; i < fields.length; ++i) {
            const [key, propType] = fields[i];
            const propSize = propType.sizeInFields();
            const propVal = propType.fromFields(xs.slice(offset, offset + propSize), []);
            props[key] = propVal;
            offset += propSize;
        }
        return Object.assign(Object.create(this.prototype), props);
    }
    static check(v) {
        const fields = this.prototype._fields;
        if (fields === undefined || fields === null) {
            return;
        }
        for (let i = 0; i < fields.length; ++i) {
            const [key, propType] = fields[i];
            const value = v[key];
            if (propType.check === undefined)
                throw Error('bug: CircuitValue without .check()');
            propType.check(value);
        }
    }
    static toCanonical(value) {
        let canonical = {};
        let fields = this.prototype._fields ?? [];
        fields.forEach(([key, type]) => {
            canonical[key] = Provable.toCanonical(type, value[key]);
        });
        return canonical;
    }
    static toConstant(t) {
        const xs = this.toFields(t);
        return this.fromFields(xs.map((x) => x.toConstant()));
    }
    static toJSON(v) {
        const res = {};
        if (this.prototype._fields !== undefined) {
            const fields = this.prototype._fields;
            fields.forEach(([key, propType]) => {
                res[key] = propType.toJSON(v[key]);
            });
        }
        return res;
    }
    static fromJSON(value) {
        let props = {};
        let fields = this.prototype._fields;
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw Error(`${this.name}.fromJSON(): invalid input ${value}`);
        }
        if (fields !== undefined) {
            for (let i = 0; i < fields.length; ++i) {
                let [key, propType] = fields[i];
                if (value[key] === undefined) {
                    throw Error(`${this.name}.fromJSON(): invalid input ${value}`);
                }
                else {
                    props[key] = propType.fromJSON(value[key]);
                }
            }
        }
        return Object.assign(Object.create(this.prototype), props);
    }
    static empty() {
        const fields = this.prototype._fields ?? [];
        let props = {};
        fields.forEach(([key, propType]) => {
            props[key] = propType.empty();
        });
        return Object.assign(Object.create(this.prototype), props);
    }
}
function prop(target, key) {
    const fieldType = Reflect.getMetadata('design:type', target, key);
    if (!target.hasOwnProperty('_fields')) {
        target._fields = [];
    }
    if (fieldType === undefined) {
    }
    else if (fieldType.toFields && fieldType.fromFields) {
        target._fields.push([key, fieldType]);
    }
    else {
        console.log(`warning: property ${key} missing field element conversion methods`);
    }
}
function arrayProp(elementType, length) {
    return function (target, key) {
        if (!target.hasOwnProperty('_fields')) {
            target._fields = [];
        }
        target._fields.push([key, Provable.Array(elementType, length)]);
    };
}
