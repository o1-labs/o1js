/**
 * This file contains constants used in the Mina protocol.
 * Originally defined in the mina_compile_config file in the mina repo:
 * https://github.com/MinaProtocol/mina/blob/develop/src/lib/mina_compile_config/mina_compile_config.ml
 */
// Constants used to calculate cost of a transaction
export var TransactionCost;
(function (TransactionCost) {
    // Defined in https://github.com/MinaProtocol/mina/blob/e8c743488cf0c8f0b7925b7a48a914ca73ed13a1/src/lib/mina_compile_config/mina_compile_config.ml#L67
    TransactionCost.PROOF_COST = 10.26;
    // Defined in https://github.com/MinaProtocol/mina/blob/e8c743488cf0c8f0b7925b7a48a914ca73ed13a1/src/lib/mina_compile_config/mina_compile_config.ml#L69
    TransactionCost.SIGNED_PAIR_COST = 10.08;
    // Defined in https://github.com/MinaProtocol/mina/blob/e39abf79b7fdf96717eb8a8ee88ec42ba1e2663d/src/lib/mina_compile_config/mina_compile_config.ml#L71
    TransactionCost.SIGNED_SINGLE_COST = 9.14;
    // Defined in https://github.com/MinaProtocol/mina/blob/e39abf79b7fdf96717eb8a8ee88ec42ba1e2663d/src/lib/mina_compile_config/mina_compile_config.ml#L73
    TransactionCost.COST_LIMIT = 69.45;
})(TransactionCost || (TransactionCost = {}));
// Constants to define the maximum number of events and actions in a transaction
export var TransactionLimits;
(function (TransactionLimits) {
    // Defined in https://github.com/MinaProtocol/mina/blob/e39abf79b7fdf96717eb8a8ee88ec42ba1e2663d/src/lib/mina_compile_config/mina_compile_config.ml#L75
    TransactionLimits.MAX_ACTION_ELEMENTS = 100;
    // Defined in https://github.com/MinaProtocol/mina/blob/e39abf79b7fdf96717eb8a8ee88ec42ba1e2663d/src/lib/mina_compile_config/mina_compile_config.ml#L77
    TransactionLimits.MAX_EVENT_ELEMENTS = 100;
})(TransactionLimits || (TransactionLimits = {}));
export var ZkappConstants;
(function (ZkappConstants) {
    ZkappConstants.MAX_ZKAPP_STATE_FIELDS = 8;
    ZkappConstants.ACCOUNT_ACTION_STATE_BUFFER_SIZE = 5;
    ZkappConstants.ACCOUNT_CREATION_FEE = 1000000000n;
})(ZkappConstants || (ZkappConstants = {}));
