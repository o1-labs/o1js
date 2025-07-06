"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationKey = void 0;
const bindings_js_1 = require("../../bindings.js");
const provable_context_js_1 = require("../provable/core/provable-context.js");
const provable_derivers_js_1 = require("../provable/types/provable-derivers.js");
const struct_js_1 = require("../provable/types/struct.js");
const wrapped_js_1 = require("../provable/wrapped.js");
const zkprogram_js_1 = require("./zkprogram.js");
class VerificationKey extends (0, struct_js_1.Struct)({
    ...(0, provable_derivers_js_1.provable)({ data: String, hash: wrapped_js_1.Field }),
    toJSON({ data }) {
        return data;
    },
}) {
    static async dummy() {
        await (0, bindings_js_1.initializeBindings)();
        const [, data, hash] = bindings_js_1.Pickles.dummyVerificationKey();
        return new VerificationKey({
            data,
            hash: (0, wrapped_js_1.Field)(hash),
        });
    }
    static dummySync() {
        return new VerificationKey({
            ...RAW_VERIFICATION_KEY,
            hash: (0, wrapped_js_1.Field)(RAW_VERIFICATION_KEY.hash),
        });
    }
    static async checkValidity(key) {
        try {
            let { runAndCheckSync } = await (0, provable_context_js_1.synchronousRunners)();
            runAndCheckSync(() => {
                let vk = bindings_js_1.Pickles.sideLoaded.vkToCircuit(() => key.data);
                let inCircuitHash = (0, zkprogram_js_1.inCircuitVkHash)(vk);
                inCircuitHash.assertEquals(key.hash);
            });
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.VerificationKey = VerificationKey;
const RAW_VERIFICATION_KEY = {
    hash: '3392518251768960475377392625298437850623664973002200885669375116181514017494',
    // oxlint-disable-line
    data: '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',
};
