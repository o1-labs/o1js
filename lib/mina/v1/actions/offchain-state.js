"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffchainMap = exports.OffchainField = exports.OffchainStateCommitments = exports.OffchainState = void 0;
const offchain_state_serialization_js_1 = require("./offchain-state-serialization.js");
const wrapped_js_1 = require("../../../provable/wrapped.js");
const offchain_state_rollup_js_1 = require("./offchain-state-rollup.js");
Object.defineProperty(exports, "OffchainStateCommitments", { enumerable: true, get: function () { return offchain_state_rollup_js_1.OffchainStateCommitments; } });
const option_js_1 = require("../../../provable/option.js");
const common_js_1 = require("../../../provable/gadgets/common.js");
const state_js_1 = require("../state.js");
const account_update_js_1 = require("../account-update.js");
const provable_js_1 = require("../../../provable/provable.js");
const poseidon_js_1 = require("../../../provable/crypto/poseidon.js");
const smart_contract_context_js_1 = require("../smart-contract-context.js");
const merkle_tree_indexed_js_1 = require("../../../provable/merkle-tree-indexed.js");
const assert_js_1 = require("../../../util/assert.js");
const provable_intf_js_1 = require("../../../provable/types/provable-intf.js");
/**
 * Offchain state for a `SmartContract`.
 *
 * ```ts
 * // declare your offchain state
 *
 * const offchainState = OffchainState({
 *   accounts: OffchainState.Map(PublicKey, UInt64),
 *   totalSupply: OffchainState.Field(UInt64),
 * });
 *
 * // use it in a contract, by adding an onchain state field of type `OffchainStateCommitments`
 *
 * class MyContract extends SmartContract {
 *  \@state(OffchainStateCommitments) offchainState = State(
 *    OffchainStateCommitments.empty()
 *   );
 *
 *   // ...
 * }
 *
 * // set the contract instance
 *
 * let contract = new MyContract(address);
 * offchainState.setContractInstance(contract);
 * ```
 *
 * See the individual methods on `offchainState` for more information on usage.
 */
function OffchainState(config, options) {
    // read options
    let { logTotalCapacity = 30, maxActionsPerUpdate = 4, maxActionsPerProof } = options ?? {};
    const height = logTotalCapacity + 1;
    class IndexedMerkleMapN extends (0, merkle_tree_indexed_js_1.IndexedMerkleMap)(height) {
    }
    const emptyMerkleMapRoot = new IndexedMerkleMapN().root;
    let rollup = (0, offchain_state_rollup_js_1.OffchainStateRollup)({
        logTotalCapacity,
        maxActionsPerProof,
        maxActionsPerUpdate,
    });
    function OffchainStateInstance() {
        function defaultInternalState() {
            return {
                _contract: undefined,
                _contractClass: undefined,
                merkleMap: new IndexedMerkleMapN(),
                valueMap: new Map(),
                get contract() {
                    return (0, assert_js_1.assertDefined)(internal._contract, 'Must call `setContractInstance()` first');
                },
                get contractClass() {
                    return (0, assert_js_1.assertDefined)(internal._contractClass, 'Must call `setContractInstance()` or `setContractClass()` first');
                },
            };
        }
        // setup internal state of this "class"
        let internal = defaultInternalState();
        const onchainActionState = async () => {
            let actionState = (await internal.contract.offchainStateCommitments.fetch())?.actionState;
            (0, common_js_1.assert)(actionState !== undefined, 'Could not fetch action state');
            return actionState;
        };
        const merkleMaps = async () => {
            if (internal.merkleMap.root.toString() !== emptyMerkleMapRoot.toString() ||
                internal.valueMap.size > 0) {
                return { merkleMap: internal.merkleMap, valueMap: internal.valueMap };
            }
            let actionState = await onchainActionState();
            let { merkleMap, valueMap } = await (0, offchain_state_serialization_js_1.fetchMerkleMap)(height, internal.contract, actionState);
            internal.merkleMap = merkleMap;
            internal.valueMap = valueMap;
            return { merkleMap, valueMap };
        };
        function getContract() {
            return (0, smart_contract_context_js_1.contract)(internal.contractClass);
        }
        function maybeContract() {
            try {
                return getContract();
            }
            catch {
                return internal.contract;
            }
        }
        /**
         * generic get which works for both fields and maps
         */
        async function get(key, valueType) {
            // get onchain merkle root
            let state = maybeContract().offchainStateCommitments.getAndRequireEquals();
            // witness the merkle map & anchor against the onchain root
            let map = await provable_js_1.Provable.witnessAsync(IndexedMerkleMapN, async () => (await merkleMaps()).merkleMap);
            map.root.assertEquals(state.root, 'root mismatch');
            map.length.assertEquals(state.length, 'length mismatch');
            // get the value hash
            let valueHash = map.getOption(key);
            // witness the full value
            const optionType = (0, option_js_1.Option)(valueType);
            let value = await provable_js_1.Provable.witnessAsync(optionType, async () => {
                let { valueMap } = await merkleMaps();
                let valueFields = valueMap.get(key.toBigInt());
                if (valueFields === undefined) {
                    return optionType.none();
                }
                let value = (0, offchain_state_serialization_js_1.fromActionWithoutHashes)(valueType, valueFields);
                return optionType.from(value);
            });
            // assert that the value hash matches the value, or both are none
            let hashMatches = poseidon_js_1.Poseidon.hashPacked(valueType, value.value).equals(valueHash.value);
            let bothNone = value.isSome.or(valueHash.isSome).not();
            (0, common_js_1.assert)(hashMatches.or(bothNone), 'value hash mismatch');
            return value;
        }
        function field(index, type) {
            type = provable_intf_js_1.ProvableType.get(type);
            const prefix = (0, wrapped_js_1.Field)(index);
            let optionType = (0, option_js_1.Option)(type);
            return {
                _type: type,
                overwrite(value) {
                    // serialize into action
                    let action = (0, offchain_state_serialization_js_1.toAction)({
                        prefix,
                        keyType: undefined,
                        valueType: type,
                        key: undefined,
                        value: type.fromValue(value),
                    });
                    // push action on account update
                    let update = getContract().self;
                    update.body.actions = account_update_js_1.Actions.pushEvent(update.body.actions, action);
                },
                update({ from, to }) {
                    // serialize into action
                    let action = (0, offchain_state_serialization_js_1.toAction)({
                        prefix,
                        keyType: undefined,
                        valueType: type,
                        key: undefined,
                        value: type.fromValue(to),
                        previousValue: optionType.fromValue(from),
                    });
                    // push action on account update
                    let update = getContract().self;
                    update.body.actions = account_update_js_1.Actions.pushEvent(update.body.actions, action);
                },
                async get() {
                    let key = (0, offchain_state_serialization_js_1.toKeyHash)(prefix, undefined, undefined);
                    return await get(key, type);
                },
            };
        }
        function map(index, keyType, valueType) {
            keyType = provable_intf_js_1.ProvableType.get(keyType);
            valueType = provable_intf_js_1.ProvableType.get(valueType);
            const prefix = (0, wrapped_js_1.Field)(index);
            let optionType = (0, option_js_1.Option)(valueType);
            return {
                _keyType: keyType,
                _valueType: valueType,
                overwrite(key, value) {
                    // serialize into action
                    let action = (0, offchain_state_serialization_js_1.toAction)({
                        prefix,
                        keyType,
                        valueType,
                        key,
                        value: valueType.fromValue(value),
                    });
                    // push action on account update
                    let update = getContract().self;
                    update.body.actions = account_update_js_1.Actions.pushEvent(update.body.actions, action);
                },
                update(key, { from, to }) {
                    // serialize into action
                    let action = (0, offchain_state_serialization_js_1.toAction)({
                        prefix,
                        keyType,
                        valueType,
                        key,
                        value: valueType.fromValue(to),
                        previousValue: optionType.fromValue(from),
                    });
                    // push action on account update
                    let update = getContract().self;
                    update.body.actions = account_update_js_1.Actions.pushEvent(update.body.actions, action);
                },
                async get(key) {
                    let keyHash = (0, offchain_state_serialization_js_1.toKeyHash)(prefix, keyType, key);
                    return await get(keyHash, valueType);
                },
            };
        }
        return {
            setContractInstance(contractInstance) {
                internal._contract = contractInstance;
                internal._contractClass =
                    contractInstance.constructor;
            },
            setContractClass(contractClass) {
                internal._contractClass = contractClass;
            },
            async createSettlementProof() {
                let { merkleMap } = await merkleMaps();
                // fetch pending actions
                let actionState = await onchainActionState();
                let actions = await (0, offchain_state_serialization_js_1.fetchMerkleLeaves)(internal.contract, {
                    fromActionState: actionState,
                });
                let result = await rollup.prove(merkleMap, actions);
                // update internal merkle maps as well
                // TODO make this not insanely recompute everything
                // - take new tree from `result`
                // - update value map in `prove()`, or separately based on `actions`
                let { merkleMap: newMerkleMap, valueMap: newValueMap } = await (0, offchain_state_serialization_js_1.fetchMerkleMap)(height, internal.contract);
                internal.merkleMap = newMerkleMap;
                internal.valueMap = newValueMap;
                return result.proof;
            },
            async settle(proof) {
                // verify the proof
                proof.verify();
                // check that proof moves state forward from the one currently stored
                let state = getContract().offchainStateCommitments.getAndRequireEquals();
                provable_js_1.Provable.assertEqual(offchain_state_rollup_js_1.OffchainStateCommitments, state, proof.publicInput);
                // require that proof uses the correct pending actions
                getContract().account.actionState.requireEquals(proof.publicOutput.actionState);
                // update the state
                getContract().offchainStateCommitments.set(proof.publicOutput);
            },
            commitments() {
                return getContract().offchainStateCommitments;
            },
            fields: Object.fromEntries(Object.entries(config).map(([key, kind], i) => [
                key,
                kind.kind === 'offchain-field'
                    ? field(i, kind.type)
                    : map(i, kind.keyType, kind.valueType),
            ])),
        };
    }
    const memoizedInstances = new Map();
    return {
        init(contractInstance) {
            let key = 'COMPILE_TIME';
            let contractAddress = contractInstance.address;
            if (contractAddress.isConstant()) {
                key = contractAddress.toBase58();
            }
            else {
                provable_js_1.Provable.asProver(() => {
                    key = contractAddress.toBase58();
                });
            }
            let instance = memoizedInstances.get(key);
            if (instance === undefined) {
                instance = OffchainStateInstance();
                instance.setContractClass(contractInstance.constructor);
                memoizedInstances.set(key, instance);
            }
            return instance;
        },
        async compile() {
            await rollup.compile();
        },
        Proof: rollup.Proof,
        emptyCommitments() {
            return (0, state_js_1.State)(offchain_state_rollup_js_1.OffchainStateCommitments.emptyFromHeight(height));
        },
    };
}
exports.OffchainState = OffchainState;
OffchainState.Map = OffchainMap;
OffchainState.Field = OffchainField;
OffchainState.Commitments = offchain_state_rollup_js_1.OffchainStateCommitments;
function OffchainField(type) {
    return { kind: 'offchain-field', type };
}
exports.OffchainField = OffchainField;
function OffchainMap(key, value) {
    return { kind: 'offchain-map', keyType: key, valueType: value };
}
exports.OffchainMap = OffchainMap;
