"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyWitness = void 0;
const provable_intf_js_1 = require("./provable-intf.js");
const witness_js_1 = require("./witness.js");
function emptyWitness(type) {
    return (0, witness_js_1.witness)(type, () => provable_intf_js_1.ProvableType.synthesize(type));
}
exports.emptyWitness = emptyWitness;
