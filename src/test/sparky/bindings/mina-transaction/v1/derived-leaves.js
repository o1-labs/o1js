"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenSymbolLength = exports.derivedLeafTypesSignable = exports.derivedLeafTypes = void 0;
const provable_generic_js_1 = require("../../lib/provable-generic.js");
const binable_js_1 = require("../../lib/binable.js");
const base58_js_1 = require("../../../lib/util/base58.js");
const events_js_1 = require("../../../lib/mina/v1/events.js");
const constants_js_1 = require("../../crypto/constants.js");
const tokenSymbolLength = 6;
exports.tokenSymbolLength = tokenSymbolLength;
function derivedLeafTypes({ Field, Bool, HashHelpers, packToFields, }) {
    let { provable } = (0, provable_generic_js_1.createDerivers)();
    const Encoding = (0, base58_js_1.fieldEncodings)(Field);
    const fieldBase = provable(Field);
    return {
        TokenId: createEncodedField(fieldBase, Encoding.TokenId, Field(defaultTokenId)),
        StateHash: createEncodedField(fieldBase, Encoding.StateHash),
        TokenSymbol: createTokenSymbol(provable({ field: Field, symbol: String }), Field),
        AuthRequired: createAuthRequired(provable({
            constant: Bool,
            signatureNecessary: Bool,
            signatureSufficient: Bool,
        }), Bool),
        ZkappUri: createZkappUri(Field, HashHelpers, packToFields),
    };
}
exports.derivedLeafTypes = derivedLeafTypes;
function derivedLeafTypesSignable({ Field, Bool, HashHelpers, packToFields, }) {
    let { signable } = (0, provable_generic_js_1.createDerivers)();
    const Encoding = (0, base58_js_1.fieldEncodings)(Field);
    const fieldBase = signable(Field);
    return {
        TokenId: createEncodedField(fieldBase, Encoding.TokenId, Field(defaultTokenId)),
        StateHash: createEncodedField(fieldBase, Encoding.StateHash),
        TokenSymbol: createTokenSymbol(signable({ field: Field, symbol: String }), Field),
        AuthRequired: createAuthRequired(signable({
            constant: Bool,
            signatureNecessary: Bool,
            signatureSufficient: Bool,
        }), Bool),
        MayUseToken: signable({ parentsOwnToken: Bool, inheritFromParent: Bool }),
        Bool,
        ZkappUri: createZkappUri(Field, HashHelpers, packToFields),
    };
}
exports.derivedLeafTypesSignable = derivedLeafTypesSignable;
const defaultTokenId = 1;
function createEncodedField(base, encoding, empty) {
    return {
        ...base,
        empty: empty !== undefined ? () => empty : base.empty,
        toJSON(x) {
            return encoding.toBase58(x);
        },
        fromJSON(x) {
            return encoding.fromBase58(x);
        },
    };
}
function createTokenSymbol(base, Field) {
    let self = {
        ...base,
        toInput({ field }) {
            return { packed: [[field, 48]] };
        },
        toJSON({ symbol }) {
            return symbol;
        },
        fromJSON(symbol) {
            let bytesLength = (0, binable_js_1.stringLengthInBytes)(symbol);
            if (bytesLength > tokenSymbolLength)
                throw Error(`Token symbol ${symbol} should be a maximum of 6 bytes, but is ${bytesLength}`);
            return { symbol, field: (0, binable_js_1.prefixToField)(Field, symbol) };
        },
    };
    return self;
}
function createAuthRequired(base, Bool) {
    return {
        ...base,
        empty() {
            return {
                constant: Bool(true),
                signatureNecessary: Bool(false),
                signatureSufficient: Bool(true),
            };
        },
        toJSON(x) {
            let c = Number(Bool.toJSON(x.constant));
            let n = Number(Bool.toJSON(x.signatureNecessary));
            let s = Number(Bool.toJSON(x.signatureSufficient));
            // prettier-ignore
            switch (`${c}${n}${s}`) {
                case '110': return 'Impossible';
                case '101': return 'None';
                case '000': return 'Proof';
                case '011': return 'Signature';
                case '001': return 'Either';
                default: throw Error('Unexpected permission');
            }
        },
        fromJSON(json) {
            let map = {
                Impossible: '110',
                None: '101',
                Proof: '000',
                Signature: '011',
                Either: '001',
            };
            let code = map[json];
            if (code === undefined)
                throw Error('Unexpected permission');
            let [constant, signatureNecessary, signatureSufficient] = code
                .split('')
                .map((s) => Bool(!!Number(s)));
            return { constant, signatureNecessary, signatureSufficient };
        },
    };
}
function createZkappUri(Field, HashHelpers, packToFields) {
    // Mina_base.Zkapp_account.hash_zkapp_uri_opt
    function hashZkappUri(uri) {
        let bits = (0, binable_js_1.bytesToBits)((0, binable_js_1.stringToBytes)(uri));
        bits.push(true);
        let input = {
            packed: bits.map((b) => [Field(Number(b)), 1]),
        };
        let packed = packToFields(input);
        return HashHelpers.hashWithPrefix(constants_js_1.prefixes.zkappUri, packed);
    }
    return (0, events_js_1.dataAsHash)({
        empty() {
            let hash = HashHelpers.hashWithPrefix(constants_js_1.prefixes.zkappUri, [Field(0), Field(0)]);
            return { data: '', hash };
        },
        toValue(data) {
            return data;
        },
        fromValue(value) {
            return value;
        },
        toJSON(data) {
            return data;
        },
        fromJSON(json) {
            return { data: json, hash: hashZkappUri(json) };
        },
        Field,
    });
}
