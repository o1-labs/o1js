// NOTE: these leaves are currently backwards compatible with the old encoding format, but the
// auxiliary components may change format in the future
import { FieldsDecoder } from './util.js';
import { versionBytes } from '../../crypto/constants.js';
import { withVersionNumber } from '../../lib/binable.js';
import { Bool } from '../../../lib/provable/bool.js';
import { Field } from '../../../lib/provable/field.js';
import { Struct } from '../../../lib/provable/types/struct.js';
import { toBase58Check } from '../../../lib/util/base58.js';
export { Bool } from '../../../lib/provable/bool.js';
export { Field } from '../../../lib/provable/field.js';
export { Int64, UInt32, UInt64, Sign } from '../../../lib/provable/int.js';
export { PublicKey } from '../../../lib/provable/crypto/signature.js';
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
export function Option(T) {
    return {
        sizeInFields() {
            return Bool.sizeInFields() + T.sizeInFields();
        },
        toJSON(x) {
            return x.isSome.toBoolean() ? T.toJSON(x.value) : null;
        },
        toInput(x) {
            const flagInput = Bool.toInput(x.isSome);
            const valueInput = T.toInput(x.value);
            return {
                fields: valueInput.fields,
                packed: flagInput.packed.concat(valueInput.packed ?? []),
            };
        },
        toFields(x) {
            return [...Bool.toFields(x.isSome), ...T.toFields(x.value)];
        },
        toAuxiliary(x) {
            return T.toAuxiliary(x?.value);
        },
        fromFields(fields, aux) {
            const decoder = new FieldsDecoder(fields);
            const isSome = decoder.decode(Bool.sizeInFields(), Bool.fromFields);
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
Option.map = (option, f) => ({
    isSome: option.isSome,
    value: f(option.value),
});
Option.none = (defaultValue) => ({
    isSome: new Bool(false),
    value: defaultValue,
});
Option.some = (value) => ({
    isSome: new Bool(true),
    value,
});
export function Range(T) {
    return Struct({
        lower: T,
        upper: T,
    });
}
export const CommittedList = {
    sizeInFields() {
        return 1;
    },
    toJSON(x) {
        return x.data.map((datum) => datum.map(Field.toJSON));
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
export const Events = CommittedList;
export const Actions = CommittedList;
export const AuthRequired = {
    ...proxyProvableSerializable(Struct({ constant: Bool, signatureNecessary: Bool, signatureSufficient: Bool })),
    empty() {
        return {
            constant: new Bool(true),
            signatureNecessary: new Bool(false),
            signatureSufficient: new Bool(true),
        };
    },
    isImpossible(x) {
        return Bool.allTrue([x.constant, x.signatureNecessary, x.signatureSufficient.not()]);
    },
    isNone(x) {
        return Bool.allTrue([x.constant, x.signatureNecessary.not(), x.signatureSufficient]);
    },
    isProof(x) {
        return Bool.allTrue([
            x.constant.not(),
            x.signatureNecessary.not(),
            x.signatureSufficient.not(),
        ]);
    },
    isSignature(x) {
        return Bool.allTrue([x.constant.not(), x.signatureNecessary, x.signatureSufficient]);
    },
    isEither(x) {
        return Bool.allTrue([x.constant.not(), x.signatureNecessary.not(), x.signatureSufficient]);
    },
    identifier(x) {
        if (AuthRequired.isImpossible(x).toBoolean()) {
            return 'Impossible';
        }
        else if (AuthRequired.isNone(x).toBoolean()) {
            return 'None';
        }
        else if (AuthRequired.isProof(x).toBoolean()) {
            return 'Proof';
        }
        else if (AuthRequired.isSignature(x).toBoolean()) {
            return 'Signature';
        }
        else if (AuthRequired.isEither(x).toBoolean()) {
            return 'Either';
        }
        else {
            throw new Error('invariant broken: invalid authorization level encoding');
        }
    },
    toJSON(x) {
        return AuthRequired.identifier(x);
    },
};
AuthRequired;
export const StateHash = {
    ...proxyProvableSerializable(Field),
    toJSON(x) {
        const bytes = withVersionNumber(Field, 1).toBytes(x);
        return toBase58Check(bytes, versionBytes.stateHash);
    },
};
export const TokenId = Field;
export const TokenSymbol = {
    ...proxyProvableSerializable(Struct({ field: Field, symbol: String })),
    toJSON(x) {
        return x.symbol;
    },
    toInput(x) {
        return { packed: [[x.field, 48]] };
    },
};
export const ZkappUri = {
    ...proxyProvableSerializable(Struct({ data: String, hash: Field })),
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
