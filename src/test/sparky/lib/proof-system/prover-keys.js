"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeProverKey = exports.encodeProverKey = exports.parseHeader = void 0;
const bindings_js_1 = require("../../bindings.js");
const bindings_js_2 = require("../../bindings/crypto/bindings.js");
const cache_js_1 = require("./cache.js");
// there are 4 types of snark keys in Pickles which we all handle at once
var KeyType;
(function (KeyType) {
    KeyType[KeyType["StepProvingKey"] = 0] = "StepProvingKey";
    KeyType[KeyType["StepVerificationKey"] = 1] = "StepVerificationKey";
    KeyType[KeyType["WrapProvingKey"] = 2] = "WrapProvingKey";
    KeyType[KeyType["WrapVerificationKey"] = 3] = "WrapVerificationKey";
})(KeyType || (KeyType = {}));
/**
 * Create `CacheHeader` from a `SnarkKeyHeader` plus some context available to `compile()`
 */
function parseHeader(programName, methods, header) {
    let hash = bindings_js_1.Pickles.util.fromMlString(header[1][2][6]);
    switch (header[0]) {
        case KeyType.StepProvingKey:
        case KeyType.StepVerificationKey: {
            let kind = snarkKeyStringKind[header[0]];
            let methodIndex = header[1][3];
            let methodName = methods[methodIndex].methodName;
            let persistentId = sanitize(`${kind}-${programName}-${methodName}`);
            let uniqueId = sanitize(`${kind}-${programName}-${methodIndex}-${methodName}-${hash}`);
            return {
                version: cache_js_1.cacheHeaderVersion,
                uniqueId,
                kind,
                persistentId,
                programName,
                methodName,
                methodIndex,
                hash,
                dataType: snarkKeySerializationType[header[0]],
            };
        }
        case KeyType.WrapProvingKey:
        case KeyType.WrapVerificationKey: {
            let kind = snarkKeyStringKind[header[0]];
            let dataType = snarkKeySerializationType[header[0]];
            let persistentId = sanitize(`${kind}-${programName}`);
            let uniqueId = sanitize(`${kind}-${programName}-${hash}`);
            return {
                version: cache_js_1.cacheHeaderVersion,
                uniqueId,
                kind,
                persistentId,
                programName,
                hash,
                dataType,
            };
        }
    }
}
exports.parseHeader = parseHeader;
/**
 * Encode a snark key to bytes
 */
function encodeProverKey(value) {
    switch (value[0]) {
        case KeyType.StepProvingKey: {
            let index = value[1][1];
            let encoded = bindings_js_1.wasm.caml_pasta_fp_plonk_index_encode(index);
            return encoded;
        }
        case KeyType.StepVerificationKey: {
            let vkMl = value[1];
            const rustConversion = (0, bindings_js_2.getRustConversion)(bindings_js_1.wasm);
            let vkWasm = rustConversion.fp.verifierIndexToRust(vkMl);
            let string = bindings_js_1.wasm.caml_pasta_fp_plonk_verifier_index_serialize(vkWasm);
            return new TextEncoder().encode(string);
        }
        case KeyType.WrapProvingKey: {
            let index = value[1][1];
            let encoded = bindings_js_1.wasm.caml_pasta_fq_plonk_index_encode(index);
            return encoded;
        }
        case KeyType.WrapVerificationKey: {
            let vk = value[1];
            let string = bindings_js_1.Pickles.encodeVerificationKey(vk);
            return new TextEncoder().encode(string);
        }
        default:
            value;
            throw Error('unreachable');
    }
}
exports.encodeProverKey = encodeProverKey;
/**
 * Decode bytes to a snark key with the help of its header
 */
function decodeProverKey(header, bytes) {
    switch (header[0]) {
        case KeyType.StepProvingKey: {
            let srs = bindings_js_1.Pickles.loadSrsFp();
            let index = bindings_js_1.wasm.caml_pasta_fp_plonk_index_decode(bytes, srs);
            let cs = header[1][4];
            return [KeyType.StepProvingKey, [0, index, cs]];
        }
        case KeyType.StepVerificationKey: {
            let srs = bindings_js_1.Pickles.loadSrsFp();
            let string = new TextDecoder().decode(bytes);
            let vkWasm = bindings_js_1.wasm.caml_pasta_fp_plonk_verifier_index_deserialize(srs, string);
            const rustConversion = (0, bindings_js_2.getRustConversion)(bindings_js_1.wasm);
            let vkMl = rustConversion.fp.verifierIndexFromRust(vkWasm);
            return [KeyType.StepVerificationKey, vkMl];
        }
        case KeyType.WrapProvingKey: {
            let srs = bindings_js_1.Pickles.loadSrsFq();
            let index = bindings_js_1.wasm.caml_pasta_fq_plonk_index_decode(bytes, srs);
            let cs = header[1][3];
            return [KeyType.WrapProvingKey, [0, index, cs]];
        }
        case KeyType.WrapVerificationKey: {
            let string = new TextDecoder().decode(bytes);
            let vk = bindings_js_1.Pickles.decodeVerificationKey(string);
            return [KeyType.WrapVerificationKey, vk];
        }
        default:
            header;
            throw Error('unreachable');
    }
}
exports.decodeProverKey = decodeProverKey;
/**
 * Sanitize a string so that it can be used as a file name
 */
function sanitize(string) {
    return string.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}
const snarkKeyStringKind = {
    [KeyType.StepProvingKey]: 'step-pk',
    [KeyType.StepVerificationKey]: 'step-vk',
    [KeyType.WrapProvingKey]: 'wrap-pk',
    [KeyType.WrapVerificationKey]: 'wrap-vk',
};
const snarkKeySerializationType = {
    [KeyType.StepProvingKey]: 'bytes',
    [KeyType.StepVerificationKey]: 'string',
    [KeyType.WrapProvingKey]: 'bytes',
    [KeyType.WrapVerificationKey]: 'string',
};
// pickles types
// Plonk_constraint_system.Make()().t
class MlConstraintSystem {
}
// Pickles.Verification_key.t
class MlWrapVerificationKey {
}
