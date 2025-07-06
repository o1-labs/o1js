"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BindingsType = void 0;
const BindingsLeaves = require("./leaves.js");
const util_js_1 = require("./util.js");
const constants_js_1 = require("../../crypto/constants.js");
const base58_js_1 = require("../../../lib/util/base58.js");
const JsArray = Array;
class ProvableBindingsType {
    sizeInFields() {
        return this.Type().sizeInFields();
    }
    toJSON(x) {
        return this.Type().toJSON(x);
    }
    toInput(x) {
        return this.Type().toInput(x);
    }
    toFields(x) {
        return this.Type().toFields(x);
    }
    toAuxiliary(x) {
        return this.Type().toAuxiliary(x);
    }
    fromFields(fields, aux) {
        return this.Type().fromFields(fields, aux);
    }
    toValue(x) {
        return x;
    }
    fromValue(x) {
        return x;
    }
    check(x) {
        return this.Type().check(x);
    }
}
function assertBindingsTypeImplementsProvable(_x) { }
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
assertBindingsTypeImplementsProvable();
var BindingsType;
(function (BindingsType) {
    class Object {
        constructor({ name, keys, entries, }) {
            this.name = name;
            this.keys = keys;
            this.entries = entries;
        }
        sizeInFields() {
            let sum = 0;
            for (const key of this.keys) {
                sum += this.entries[key].sizeInFields();
            }
            return sum;
        }
        toJSON(x) {
            // TODO: type safety
            const x2 = x;
            const json = {};
            for (const key of this.keys) {
                json[key] = this.entries[key].toJSON(x2[key]);
            }
            return json;
        }
        toInput(x) {
            // TODO: type safety
            const x2 = x;
            const acc = { fields: [], packed: [] };
            for (const key of this.keys) {
                // surely there is an optimization here to avoid allocating so many temporary arrays
                const { fields, packed } = this.entries[key].toInput(x2[key]);
                acc.fields.push(...(fields ?? []));
                acc.packed.push(...(packed ?? []));
            }
            return acc;
        }
        toFields(x) {
            // TODO: type safety
            const x2 = x;
            return this.keys.map((key) => this.entries[key].toFields(x2[key])).flat();
        }
        toAuxiliary(x) {
            // TODO: type safety
            const x2 = x;
            const entries2 = this.entries;
            return this.keys.map((key) => entries2[key].toAuxiliary(x2 !== undefined ? x2[key] : undefined));
        }
        fromFields(fields, aux) {
            const decoder = new util_js_1.FieldsDecoder(fields);
            // TODO: make this type-safe
            // const obj: Partial<T> = {};
            const obj = {};
            for (const i in this.keys) {
                const key = this.keys[i];
                const entryType = this.entries[key];
                const entryAux = aux[i];
                // console.log(`${this.name}[${JSON.stringify(key)}] :: aux = ${JSON.stringify(entryAux)}`);
                obj[key] = decoder.decode(entryType.sizeInFields(), (entryFields) => entryType.fromFields(entryFields, entryAux));
            }
            return obj;
        }
        toValue(x) {
            return x;
        }
        fromValue(x) {
            return x;
        }
        check(_x) {
            throw new Error('TODO');
        }
    }
    BindingsType.Object = Object;
    class Array {
        constructor({ staticLength, inner, }) {
            this.staticLength = staticLength;
            this.inner = inner;
        }
        sizeInFields() {
            if (this.staticLength !== null) {
                return this.staticLength * this.inner.sizeInFields();
            }
            else {
                return 0;
            }
        }
        toJSON(x) {
            // TODO: type safety
            const inner = this.inner;
            return x.map((el) => inner.toJSON(el));
        }
        toInput(x) {
            if (!(x instanceof JsArray))
                throw new Error('impossible');
            // TODO: type safety
            const inner = this.inner;
            const acc = { fields: [], packed: [] };
            x.forEach((el) => {
                const { fields, packed } = inner.toInput(el);
                acc.fields.push(...(fields ?? []));
                acc.packed.push(...(packed ?? []));
            });
            return acc;
        }
        toFields(x) {
            if (!(x instanceof JsArray))
                throw new Error('impossible');
            // TODO: type safety
            const inner = this.inner;
            return x.map((el) => inner.toFields(el)).flat();
        }
        toAuxiliary(x) {
            if (this.staticLength !== null) {
                if (x !== undefined) {
                    // TODO: type safety
                    const x2 = x;
                    if (x2.length !== this.staticLength)
                        throw new Error('invalid array length');
                    return x2.map((v) => this.inner.toAuxiliary(v));
                }
                else {
                    return new JsArray(this.staticLength).fill(this.inner.toAuxiliary());
                }
            }
            else {
                // TODO: type safety
                return x;
            }
        }
        fromFields(fields, aux) {
            if (this.staticLength !== null) {
                const decoder = new util_js_1.FieldsDecoder(fields);
                const x = new JsArray();
                for (let i = 0; i < this.staticLength; i++)
                    x[i] = decoder.decode(this.inner.sizeInFields(), (f) => this.inner.fromFields(f, aux[i]));
                // TODO: type safety
                return x;
            }
            else {
                // TODO: type safety
                return aux;
            }
        }
        toValue(x) {
            return x;
        }
        fromValue(x) {
            return x;
        }
        check(_x) {
            throw new Error('TODO');
        }
    }
    BindingsType.Array = Array;
    let Option;
    (function (Option) {
        class OrUndefined {
            constructor(inner) {
                this.inner = inner;
            }
            sizeInFields() {
                return 0;
            }
            toJSON(x) {
                // TODO: type safety
                const x2 = x;
                const inner = this.inner;
                return x2 !== undefined ? inner.toJSON(x2) : null;
            }
            toInput(_x) {
                return {};
            }
            toFields(_x) {
                return [];
            }
            toAuxiliary(x) {
                return x === undefined ? [false] : [true, this.inner.toAuxiliary(x)];
            }
            fromFields(fields, aux) {
                // TODO: type safety
                return (aux[0] ? this.inner.fromFields(fields, aux[1]) : undefined);
            }
            toValue(x) {
                return x;
            }
            fromValue(x) {
                return x;
            }
            check(_x) {
                throw new Error('TODO');
            }
        }
        Option.OrUndefined = OrUndefined;
        class Flagged extends ProvableBindingsType {
            constructor(inner) {
                super();
                this.inner = inner;
            }
            Type() {
                return BindingsLeaves.Option(this.inner);
            }
        }
        Option.Flagged = Flagged;
        class ClosedInterval extends ProvableBindingsType {
            constructor(inner) {
                super();
                this.inner = inner;
            }
            Type() {
                return BindingsLeaves.Option(BindingsLeaves.Range(this.inner));
            }
        }
        Option.ClosedInterval = ClosedInterval;
    })(Option = BindingsType.Option || (BindingsType.Option = {}));
    let Leaf;
    (function (Leaf) {
        class AuxiliaryLeaf {
            constructor() { }
            sizeInFields() {
                return 0;
            }
            toJSON(x) {
                return x;
            }
            toInput(_x) {
                return {};
            }
            toFields(_x) {
                return [];
            }
            toAuxiliary(x) {
                return [x];
            }
            fromFields(_fields, aux) {
                return aux[0];
            }
            toValue(x) {
                return x;
            }
            fromValue(x) {
                return x;
            }
            check(_x) {
                throw new Error('TODO');
            }
        }
        class Number extends AuxiliaryLeaf {
            constructor() {
                super(...arguments);
                this.type = 'number';
            }
        }
        Leaf.Number = Number;
        class String extends AuxiliaryLeaf {
            constructor() {
                super(...arguments);
                this.type = 'string';
            }
        }
        Leaf.String = String;
        class Actions extends ProvableBindingsType {
            constructor() {
                super(...arguments);
                this.type = 'number';
            }
            Type() {
                return BindingsLeaves.Actions;
            }
        }
        Leaf.Actions = Actions;
        class AuthRequired extends ProvableBindingsType {
            constructor() {
                super(...arguments);
                this.type = 'AuthRequired';
            }
            Type() {
                return BindingsLeaves.AuthRequired;
            }
        }
        Leaf.AuthRequired = AuthRequired;
        class Bool extends ProvableBindingsType {
            constructor() {
                super(...arguments);
                this.type = 'Bool';
            }
            Type() {
                return BindingsLeaves.Bool;
            }
        }
        Leaf.Bool = Bool;
        class Events extends ProvableBindingsType {
            constructor() {
                super(...arguments);
                this.type = 'number';
            }
            Type() {
                return BindingsLeaves.Events;
            }
        }
        Leaf.Events = Events;
        class Field extends ProvableBindingsType {
            constructor() {
                super(...arguments);
                this.type = 'Field';
            }
            Type() {
                return BindingsLeaves.Field;
            }
        }
        Leaf.Field = Field;
        class Int64 extends ProvableBindingsType {
            constructor() {
                super(...arguments);
                this.type = 'Int64';
            }
            Type() {
                return BindingsLeaves.Int64;
            }
        }
        Leaf.Int64 = Int64;
        class PublicKey extends ProvableBindingsType {
            constructor() {
                super(...arguments);
                this.type = 'PublicKey';
            }
            Type() {
                return BindingsLeaves.PublicKey;
            }
        }
        Leaf.PublicKey = PublicKey;
        class Sign extends ProvableBindingsType {
            constructor() {
                super(...arguments);
                this.type = 'Sign';
            }
            Type() {
                return BindingsLeaves.Sign;
            }
        }
        Leaf.Sign = Sign;
        class StateHash extends ProvableBindingsType {
            constructor() {
                super(...arguments);
                this.type = 'StateHash';
            }
            Type() {
                return BindingsLeaves.StateHash;
            }
        }
        Leaf.StateHash = StateHash;
        // TODO NOW
        class TokenId {
            constructor() {
                this.type = 'TokenId';
            }
            sizeInFields() {
                return BindingsLeaves.Field.sizeInFields();
            }
            toJSON(x) {
                // TODO: type safety
                return (0, base58_js_1.toBase58Check)(BindingsLeaves.Field.toBytes(x), constants_js_1.versionBytes.tokenIdKey);
            }
            toInput(x) {
                // TODO: type safety
                return BindingsLeaves.Field.toInput(x);
            }
            toFields(x) {
                // TODO: type safety
                return BindingsLeaves.Field.toFields(x);
            }
            toAuxiliary(_x) {
                return [];
            }
            fromFields(fields, _aux) {
                // TODO: type safety
                return BindingsLeaves.Field.fromFields(fields);
            }
            toValue(x) {
                return x;
            }
            fromValue(x) {
                return x;
            }
            check(_x) {
                throw new Error('TODO');
            }
        }
        Leaf.TokenId = TokenId;
        class TokenSymbol extends ProvableBindingsType {
            constructor() {
                super(...arguments);
                this.type = 'TokenId';
            }
            Type() {
                return BindingsLeaves.TokenSymbol;
            }
        }
        Leaf.TokenSymbol = TokenSymbol;
        class UInt32 extends ProvableBindingsType {
            constructor() {
                super(...arguments);
                this.type = 'UInt32';
            }
            Type() {
                return BindingsLeaves.UInt32;
            }
        }
        Leaf.UInt32 = UInt32;
        class UInt64 extends ProvableBindingsType {
            constructor() {
                super(...arguments);
                this.type = 'UInt64';
            }
            Type() {
                return BindingsLeaves.UInt64;
            }
        }
        Leaf.UInt64 = UInt64;
        class ZkappUri extends ProvableBindingsType {
            Type() {
                return BindingsLeaves.ZkappUri;
            }
        }
        Leaf.ZkappUri = ZkappUri;
    })(Leaf = BindingsType.Leaf || (BindingsType.Leaf = {}));
})(BindingsType || (exports.BindingsType = BindingsType = {}));
