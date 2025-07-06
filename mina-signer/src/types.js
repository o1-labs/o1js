"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkId = void 0;
exports.NetworkId = {
    toString(network) {
        return typeof network === 'string' ? network : network.custom;
    },
};
