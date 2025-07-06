"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapObject = exports.ZkappUri = exports.TokenId = exports.Update = exports.mapUndefined = exports.Range = exports.Option = void 0;
const bool_js_1 = require("../../provable/bool.js");
const field_js_1 = require("../../provable/field.js");
const Bindings = require("../../../bindings/mina-transaction/v2/index.js");
const binable_js_1 = require("../../../bindings/lib/binable.js");
const poseidon_js_1 = require("../../../lib/provable/crypto/poseidon.js");
const constants_js_1 = require("../../../bindings/crypto/constants.js");
// boo typescript
function mapObject(object, f) {
    const newObject = {};
    for (const key in object) {
        newObject[key] = f(key);
    }
    return newObject;
}
exports.mapObject = mapObject;
const { Option, Range } = Bindings.Leaves;
exports.Option = Option;
exports.Range = Range;
class ZkappUri {
    data;
    hash;
    constructor(uri) {
        if (typeof uri === 'object') {
            this.data = uri.data;
            this.hash = uri.hash;
        }
        else {
            this.data = uri;
            let packed;
            if (uri.length === 0) {
                packed = [new field_js_1.Field(0), new field_js_1.Field(0)];
            }
            else {
                const bits = (0, binable_js_1.bytesToBits)((0, binable_js_1.stringToBytes)(uri));
                bits.push(true);
                const input = {
                    packed: bits.map((b) => [new field_js_1.Field(Number(b)), 1]),
                };
                packed = (0, poseidon_js_1.packToFields)(input);
            }
            this.hash = (0, poseidon_js_1.hashWithPrefix)(constants_js_1.prefixes.zkappUri, packed);
        }
    }
    toJSON() {
        return this.data.toString();
    }
    static empty() {
        return new ZkappUri('');
    }
    static from(uri) {
        return uri instanceof ZkappUri ? uri : new ZkappUri(uri);
    }
}
exports.ZkappUri = ZkappUri;
class TokenId {
    value;
    // TODO: construct this from it's parts, don't pass in the raw Field directly
    constructor(value) {
        this.value = value;
    }
    equals(x) {
        return this.value.equals(x.value);
    }
    toString() {
        return this.value.toString();
    }
    static MINA = new TokenId(new field_js_1.Field(1));
}
exports.TokenId = TokenId;
function mapUndefined(value, f) {
    return value === undefined ? undefined : f(value);
}
exports.mapUndefined = mapUndefined;
class Update {
    set;
    value;
    constructor(set, value) {
        this.set = set;
        this.value = value;
    }
    toOption() {
        return { isSome: this.set, value: this.value };
    }
    static fromOption(option) {
        return new Update(option.isSome, option.value);
    }
    static disabled(defaultValue) {
        return new Update(new bool_js_1.Bool(false), defaultValue);
    }
    static set(value) {
        return new Update(new bool_js_1.Bool(true), value);
    }
    static from(value, defaultValue) {
        if (value instanceof Update) {
            return value;
        }
        else if (value !== undefined) {
            return Update.set(value);
        }
        else {
            return Update.disabled(defaultValue);
        }
    }
}
exports.Update = Update;
