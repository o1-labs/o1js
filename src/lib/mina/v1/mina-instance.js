import { UInt64 } from '../../provable/int.js';
export { defaultNetworkConstants, activeInstance, setActiveInstance, ZkappStateLength, currentSlot, getAccount, hasAccount, getBalance, getNetworkId, getNetworkConstants, getNetworkState, fetchEvents, fetchActions, getActions, getProofsEnabled, };
const defaultAccountCreationFee = 1000000000;
const defaultNetworkConstants = {
    genesisTimestamp: UInt64.from(0),
    slotTime: UInt64.from(3 * 60 * 1000),
    accountCreationFee: UInt64.from(defaultAccountCreationFee),
};
const ZkappStateLength = 8;
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
/**
 * Set the currently used Mina instance.
 */
function setActiveInstance(m) {
    activeInstance = m;
}
function noActiveInstance() {
    throw Error('Must call Mina.setActiveInstance first');
}
/**
 * @return The current slot number, according to the active Mina instance.
 */
function currentSlot() {
    return activeInstance.currentSlot();
}
/**
 * @return The account data associated to the given public key.
 */
function getAccount(publicKey, tokenId) {
    return activeInstance.getAccount(publicKey, tokenId);
}
/**
 * Checks if an account exists within the ledger.
 */
function hasAccount(publicKey, tokenId) {
    return activeInstance.hasAccount(publicKey, tokenId);
}
/**
 * @return The current Mina network ID.
 */
function getNetworkId() {
    return activeInstance.getNetworkId();
}
/**
 * @return Data associated with the current Mina network constants.
 */
function getNetworkConstants() {
    return activeInstance.getNetworkConstants();
}
/**
 * @return Data associated with the current state of the Mina network.
 */
function getNetworkState() {
    return activeInstance.getNetworkState();
}
/**
 * @return The balance associated to the given public key.
 */
function getBalance(publicKey, tokenId) {
    return activeInstance.getAccount(publicKey, tokenId).balance;
}
/**
 * @return A list of emitted events associated to the given public key.
 */
async function fetchEvents(publicKey, tokenId, filterOptions = {}, headers) {
    return await activeInstance.fetchEvents(publicKey, tokenId, filterOptions, headers);
}
/**
 * @return A list of emitted sequencing actions associated to the given public key.
 */
async function fetchActions(publicKey, actionStates, tokenId, from, to, headers) {
    return await activeInstance.fetchActions(publicKey, actionStates, tokenId, from, to, headers);
}
/**
 * @return A list of emitted sequencing actions associated to the given public key.
 */
function getActions(publicKey, actionStates, tokenId) {
    return activeInstance.getActions(publicKey, actionStates, tokenId);
}
function getProofsEnabled() {
    return activeInstance.proofsEnabled;
}
