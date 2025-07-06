"use strict";
// NOTE: these leaves are currently backwards compatible with the old encoding format, but the
// auxiliary components may change format in the future
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZkappUri = exports.TokenSymbol = exports.TokenId = exports.StateHash = exports.AuthRequired = exports.Actions = exports.Events = exports.CommittedList = exports.Range = exports.Option = exports.PublicKey = exports.Sign = exports.UInt64 = exports.UInt32 = exports.Int64 = exports.Field = exports.Bool = void 0;
const util_js_1 = require("./util.js");
const constants_js_1 = require("../../crypto/constants.js");
const binable_js_1 = require("../../lib/binable.js");
const bool_js_1 = require("../../../lib/provable/bool.js");
const field_js_1 = require("../../../lib/provable/field.js");
const struct_js_1 = require("../../../lib/provable/types/struct.js");
const base58_js_1 = require("../../../lib/util/base58.js");
var bool_js_2 = require("../../../lib/provable/bool.js");
Object.defineProperty(exports, "Bool", { enumerable: true, get: function () { return bool_js_2.Bool; } });
var field_js_2 = require("../../../lib/provable/field.js");
Object.defineProperty(exports, "Field", { enumerable: true, get: function () { return field_js_2.Field; } });
var int_js_1 = require("../../../lib/provable/int.js");
Object.defineProperty(exports, "Int64", { enumerable: true, get: function () { return int_js_1.Int64; } });
Object.defineProperty(exports, "UInt32", { enumerable: true, get: function () { return int_js_1.UInt32; } });
Object.defineProperty(exports, "UInt64", { enumerable: true, get: function () { return int_js_1.UInt64; } });
Object.defineProperty(exports, "Sign", { enumerable: true, get: function () { return int_js_1.Sign; } });
var signature_js_1 = require("../../../lib/provable/crypto/signature.js");
Object.defineProperty(exports, "PublicKey", { enumerable: true, get: function () { return signature_js_1.PublicKey; } });
// for now, we erase the value conversion in the proxy, as it is currently not utilized
function proxyProvableSerializable(T) {
    return {
        sizeInFields() {
            return T.sizeInFields();
        },
        toJSON(x) {
            return T.toJSON(x);
        },
        toInput(x) {
            return T.toInput(x);
        },
        toFields(x) {
            return T.toFields(x);
        },
        toAuxiliary(x) {
            return T.toAuxiliary(x);
        },
        fromFields(fields, aux) {
            return T.fromFields(fields, aux);
        },
        toValue(x) {
            return x;
        },
        fromValue(x) {
            return x;
        },
        check(x) {
            T.check(x);
        },
    };
}
function Option(T) {
    return {
        sizeInFields() {
            return bool_js_1.Bool.sizeInFields() + T.sizeInFields();
        },
        toJSON(x) {
            return x.isSome.toBoolean() ? T.toJSON(x.value) : null;
        },
        toInput(x) {
            const flagInput = bool_js_1.Bool.toInput(x.isSome);
            const valueInput = T.toInput(x.value);
            return {
                fields: valueInput.fields,
                packed: flagInput.packed.concat(valueInput.packed ?? []),
            };
        },
        toFields(x) {
            return [...bool_js_1.Bool.toFields(x.isSome), ...T.toFields(x.value)];
        },
        toAuxiliary(x) {
            return T.toAuxiliary(x?.value);
        },
        fromFields(fields, aux) {
            const decoder = new util_js_1.FieldsDecoder(fields);
            const isSome = decoder.decode(bool_js_1.Bool.sizeInFields(), bool_js_1.Bool.fromFields);
            const value = decoder.decode(T.sizeInFields(), (f) => T.fromFields(f, aux));
            return { isSome, value };
        },
        toValue(x) {
            return x;
        },
        fromValue(x) {
            return x;
        },
        check(_x) {
            throw new Error('TODO');
        },
    };
}
exports.Option = Option;
Option.map = (option, f) => ({
    isSome: option.isSome,
    value: f(option.value),
});
Option.none = (defaultValue) => ({
    isSome: new bool_js_1.Bool(false),
    value: defaultValue,
});
Option.some = (value) => ({
    isSome: new bool_js_1.Bool(true),
    value,
});
function Range(T) {
    return (0, struct_js_1.Struct)({
        lower: T,
        upper: T,
    });
}
exports.Range = Range;
exports.CommittedList = {
    sizeInFields() {
        return 1;
    },
    toJSON(x) {
        return x.data.map((datum) => datum.map(field_js_1.Field.toJSON));
    },
    toInput(x) {
        return { fields: [x.hash] };
    },
    toFields(x) {
        return [x.hash];
    },
    toAuxiliary(x) {
        if (x === undefined)
            throw new Error('cannot convert undefined CommittedList into auxiliary data');
        return [x.data];
    },
    fromFields(fields, aux) {
        // TODO: runtime type-check the aux data
        return { data: aux[0], hash: fields[0] };
    },
    toValue(x) {
        return x;
    },
    fromValue(x) {
        return x;
    },
    check(_x) {
        throw new Error('TODO');
    },
};
exports.Events = exports.CommittedList;
exports.Actions = exports.CommittedList;
exports.AuthRequired = {
    ...proxyProvableSerializable((0, struct_js_1.Struct)({ constant: bool_js_1.Bool, signatureNecessary: bool_js_1.Bool, signatureSufficient: bool_js_1.Bool })),
    empty() {
        return {
            constant: new bool_js_1.Bool(true),
            signatureNecessary: new bool_js_1.Bool(false),
            signatureSufficient: new bool_js_1.Bool(true),
        };
    },
    isImpossible(x) {
        return bool_js_1.Bool.allTrue([x.constant, x.signatureNecessary, x.signatureSufficient.not()]);
    },
    isNone(x) {
        return bool_js_1.Bool.allTrue([x.constant, x.signatureNecessary.not(), x.signatureSufficient]);
    },
    isProof(x) {
        return bool_js_1.Bool.allTrue([
            x.constant.not(),
            x.signatureNecessary.not(),
            x.signatureSufficient.not(),
        ]);
    },
    isSignature(x) {
        return bool_js_1.Bool.allTrue([x.constant.not(), x.signatureNecessary, x.signatureSufficient]);
    },
    isEither(x) {
        return bool_js_1.Bool.allTrue([x.constant.not(), x.signatureNecessary.not(), x.signatureSufficient]);
    },
    identifier(x) {
        if (exports.AuthRequired.isImpossible(x).toBoolean()) {
            return 'Impossible';
        }
        else if (exports.AuthRequired.isNone(x).toBoolean()) {
            return 'None';
        }
        else if (exports.AuthRequired.isProof(x).toBoolean()) {
            return 'Proof';
        }
        else if (exports.AuthRequired.isSignature(x).toBoolean()) {
            return 'Signature';
        }
        else if (exports.AuthRequired.isEither(x).toBoolean()) {
            return 'Either';
        }
        else {
            throw new Error('invariant broken: invalid authorization level encoding');
        }
    },
    toJSON(x) {
        return exports.AuthRequired.identifier(x);
    },
};
exports.AuthRequired;
exports.StateHash = {
    ...proxyProvableSerializable(field_js_1.Field),
    toJSON(x) {
        const bytes = (0, binable_js_1.withVersionNumber)(field_js_1.Field, 1).toBytes(x);
        return (0, base58_js_1.toBase58Check)(bytes, constants_js_1.versionBytes.stateHash);
    },
};
exports.TokenId = field_js_1.Field;
exports.TokenSymbol = {
    ...proxyProvableSerializable((0, struct_js_1.Struct)({ field: field_js_1.Field, symbol: String })),
    toJSON(x) {
        return x.symbol;
    },
    toInput(x) {
        return { packed: [[x.field, 48]] };
    },
};
exports.ZkappUri = {
    ...proxyProvableSerializable((0, struct_js_1.Struct)({ data: String, hash: field_js_1.Field })),
    toJSON(x) {
        return x.data;
    },
    toAuxiliary(x) {
        return [x?.data];
    },
    fromFields(fields, aux) {
        return {
            data: aux[0],
            hash: fields[0],
        };
    },
};
