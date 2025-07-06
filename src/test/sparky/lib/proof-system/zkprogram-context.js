"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZkProgramContext = void 0;
const global_context_js_1 = require("../util/global-context.js");
let context = global_context_js_1.Context.create();
const ZkProgramContext = {
    enter() {
        return context.enter({ proofs: [] });
    },
    leave: context.leave,
    has: context.has,
    declareProof(proof) {
        context.get().proofs.push(proof);
    },
    getDeclaredProofs() {
        return context.get().proofs;
    },
};
exports.ZkProgramContext = ZkProgramContext;
