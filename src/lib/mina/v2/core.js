import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import * as Bindings from '../../../bindings/mina-transaction/v2/index.js';
import { bytesToBits, stringToBytes } from '../../../bindings/lib/binable.js';
import { hashWithPrefix, packToFields } from '../../../lib/provable/crypto/poseidon.js';
import { prefixes } from '../../../bindings/crypto/constants.js';
export { Option, Range, mapUndefined, Update, TokenId, ZkappUri, mapObject, };
// boo typescript
function mapObject(object, f) {
    const newObject = {};
    for (const key in object) {
        newObject[key] = f(key);
    }
    return newObject;
}
const { Option, Range } = Bindings.Leaves;
class ZkappUri {
    constructor(uri) {
        if (typeof uri === 'object') {
            this.data = uri.data;
            this.hash = uri.hash;
        }
        else {
            this.data = uri;
            let packed;
            if (uri.length === 0) {
                packed = [new Field(0), new Field(0)];
            }
            else {
                const bits = bytesToBits(stringToBytes(uri));
                bits.push(true);
                const input = {
                    packed: bits.map((b) => [new Field(Number(b)), 1]),
                };
                packed = packToFields(input);
            }
            this.hash = hashWithPrefix(prefixes.zkappUri, packed);
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
class TokenId {
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
}
TokenId.MINA = new TokenId(new Field(1));
function mapUndefined(value, f) {
    return value === undefined ? undefined : f(value);
}
class Update {
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
        return new Update(new Bool(false), defaultValue);
    }
    static set(value) {
        return new Update(new Bool(true), value);
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
