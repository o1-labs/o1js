"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProofsEnabled = exports.getActions = exports.fetchActions = exports.fetchEvents = exports.getNetworkState = exports.getNetworkConstants = exports.getNetworkId = exports.getBalance = exports.hasAccount = exports.getAccount = exports.currentSlot = exports.ZkappStateLength = exports.setActiveInstance = exports.activeInstance = exports.defaultNetworkConstants = void 0;
const int_js_1 = require("../../provable/int.js");
const defaultAccountCreationFee = 1000000000;
const defaultNetworkConstants = {
    genesisTimestamp: int_js_1.UInt64.from(0),
    slotTime: int_js_1.UInt64.from(3 * 60 * 1000),
    accountCreationFee: int_js_1.UInt64.from(defaultAccountCreationFee),
};
exports.defaultNetworkConstants = defaultNetworkConstants;
const ZkappStateLength = 8;
exports.ZkappStateLength = ZkappStateLength;
let activeInstance = {
    getNetworkConstants: () => defaultNetworkConstants,
    currentSlot: noActiveInstance,
    hasAccount: noActiveInstance,
    getAccount: noActiveInstance,
    getNetworkState: noActiveInstance,
    sendTransaction: noActiveInstance,
    transaction: noActiveInstance,
    fetchEvents: noActiveInstance,
    fetchActions: noActiveInstance,
    getActions: noActiveInstance,
    proofsEnabled: true,
    getNetworkId: () => 'devnet',
};
exports.activeInstance = activeInstance;
/**
 * Set the currently used Mina instance.
 */
function setActiveInstance(m) {
    exports.activeInstance = activeInstance = m;
}
exports.setActiveInstance = setActiveInstance;
function noActiveInstance() {
    throw Error('Must call Mina.setActiveInstance first');
}
/**
 * @return The current slot number, according to the active Mina instance.
 */
function currentSlot() {
    return activeInstance.currentSlot();
}
exports.currentSlot = currentSlot;
/**
 * @return The account data associated to the given public key.
 */
function getAccount(publicKey, tokenId) {
    return activeInstance.getAccount(publicKey, tokenId);
}
exports.getAccount = getAccount;
/**
 * Checks if an account exists within the ledger.
 */
function hasAccount(publicKey, tokenId) {
    return activeInstance.hasAccount(publicKey, tokenId);
}
exports.hasAccount = hasAccount;
/**
 * @return The current Mina network ID.
 */
function getNetworkId() {
    return activeInstance.getNetworkId();
}
exports.getNetworkId = getNetworkId;
/**
 * @return Data associated with the current Mina network constants.
 */
function getNetworkConstants() {
    return activeInstance.getNetworkConstants();
}
exports.getNetworkConstants = getNetworkConstants;
/**
 * @return Data associated with the current state of the Mina network.
 */
function getNetworkState() {
    return activeInstance.getNetworkState();
}
exports.getNetworkState = getNetworkState;
/**
 * @return The balance associated to the given public key.
 */
function getBalance(publicKey, tokenId) {
    return activeInstance.getAccount(publicKey, tokenId).balance;
}
exports.getBalance = getBalance;
/**
 * @return A list of emitted events associated to the given public key.
 */
async function fetchEvents(publicKey, tokenId, filterOptions = {}, headers) {
    return await activeInstance.fetchEvents(publicKey, tokenId, filterOptions, headers);
}
exports.fetchEvents = fetchEvents;
/**
 * @return A list of emitted sequencing actions associated to the given public key.
 */
async function fetchActions(publicKey, actionStates, tokenId, from, to, headers) {
    return await activeInstance.fetchActions(publicKey, actionStates, tokenId, from, to, headers);
}
exports.fetchActions = fetchActions;
/**
 * @return A list of emitted sequencing actions associated to the given public key.
 */
function getActions(publicKey, actionStates, tokenId) {
    return activeInstance.getActions(publicKey, actionStates, tokenId);
}
exports.getActions = getActions;
function getProofsEnabled() {
    return activeInstance.proofsEnabled;
}
exports.getProofsEnabled = getProofsEnabled;
