"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartContractBase = exports.isSmartContract = void 0;
class SmartContractBase {
}
exports.SmartContractBase = SmartContractBase;
function isSmartContract(object) {
    return object instanceof SmartContractBase;
}
exports.isSmartContract = isSmartContract;
