import { fetchMerkleLeaves, fetchMerkleMap, fromActionWithoutHashes, toAction, toKeyHash, } from './offchain-state-serialization.js';
import { Field } from '../../../provable/wrapped.js';
import { OffchainStateCommitments, OffchainStateRollup } from './offchain-state-rollup.js';
import { Option } from '../../../provable/option.js';
import { assert } from '../../../provable/gadgets/common.js';
import { State } from '../state.js';
import { Actions } from '../account-update.js';
import { Provable } from '../../../provable/provable.js';
import { Poseidon } from '../../../provable/crypto/poseidon.js';
import { contract } from '../smart-contract-context.js';
import { IndexedMerkleMap } from '../../../provable/merkle-tree-indexed.js';
import { assertDefined } from '../../../util/assert.js';
import { ProvableType } from '../../../provable/types/provable-intf.js';
// external API
export { OffchainState, OffchainStateCommitments };
// internal API
export { OffchainField, OffchainMap };
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
    class IndexedMerkleMapN extends IndexedMerkleMap(height) {
    }
    const emptyMerkleMapRoot = new IndexedMerkleMapN().root;
    let rollup = OffchainStateRollup({
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
                    return assertDefined(internal._contract, 'Must call `setContractInstance()` first');
                },
                get contractClass() {
                    return assertDefined(internal._contractClass, 'Must call `setContractInstance()` or `setContractClass()` first');
                },
            };
        }
        // setup internal state of this "class"
        let internal = defaultInternalState();
        const onchainActionState = async () => {
            let actionState = (await internal.contract.offchainStateCommitments.fetch())?.actionState;
            assert(actionState !== undefined, 'Could not fetch action state');
            return actionState;
        };
        const merkleMaps = async () => {
            if (internal.merkleMap.root.toString() !== emptyMerkleMapRoot.toString() ||
                internal.valueMap.size > 0) {
                return { merkleMap: internal.merkleMap, valueMap: internal.valueMap };
            }
            let actionState = await onchainActionState();
            let { merkleMap, valueMap } = await fetchMerkleMap(height, internal.contract, actionState);
            internal.merkleMap = merkleMap;
            internal.valueMap = valueMap;
            return { merkleMap, valueMap };
        };
        function getContract() {
            return contract(internal.contractClass);
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
            let map = await Provable.witnessAsync(IndexedMerkleMapN, async () => (await merkleMaps()).merkleMap);
            map.root.assertEquals(state.root, 'root mismatch');
            map.length.assertEquals(state.length, 'length mismatch');
            // get the value hash
            let valueHash = map.getOption(key);
            // witness the full value
            const optionType = Option(valueType);
            let value = await Provable.witnessAsync(optionType, async () => {
                let { valueMap } = await merkleMaps();
                let valueFields = valueMap.get(key.toBigInt());
                if (valueFields === undefined) {
                    return optionType.none();
                }
                let value = fromActionWithoutHashes(valueType, valueFields);
                return optionType.from(value);
            });
            // assert that the value hash matches the value, or both are none
            let hashMatches = Poseidon.hashPacked(valueType, value.value).equals(valueHash.value);
            let bothNone = value.isSome.or(valueHash.isSome).not();
            assert(hashMatches.or(bothNone), 'value hash mismatch');
            return value;
        }
        function field(index, type) {
            type = ProvableType.get(type);
            const prefix = Field(index);
            let optionType = Option(type);
            return {
                _type: type,
                overwrite(value) {
                    // serialize into action
                    let action = toAction({
                        prefix,
                        keyType: undefined,
                        valueType: type,
                        key: undefined,
                        value: type.fromValue(value),
                    });
                    // push action on account update
                    let update = getContract().self;
                    update.body.actions = Actions.pushEvent(update.body.actions, action);
                },
                update({ from, to }) {
                    // serialize into action
                    let action = toAction({
                        prefix,
                        keyType: undefined,
                        valueType: type,
                        key: undefined,
                        value: type.fromValue(to),
                        previousValue: optionType.fromValue(from),
                    });
                    // push action on account update
                    let update = getContract().self;
                    update.body.actions = Actions.pushEvent(update.body.actions, action);
                },
                async get() {
                    let key = toKeyHash(prefix, undefined, undefined);
                    return await get(key, type);
                },
            };
        }
        function map(index, keyType, valueType) {
            keyType = ProvableType.get(keyType);
            valueType = ProvableType.get(valueType);
            const prefix = Field(index);
            let optionType = Option(valueType);
            return {
                _keyType: keyType,
                _valueType: valueType,
                overwrite(key, value) {
                    // serialize into action
                    let action = toAction({
                        prefix,
                        keyType,
                        valueType,
                        key,
                        value: valueType.fromValue(value),
                    });
                    // push action on account update
                    let update = getContract().self;
                    update.body.actions = Actions.pushEvent(update.body.actions, action);
                },
                update(key, { from, to }) {
                    // serialize into action
                    let action = toAction({
                        prefix,
                        keyType,
                        valueType,
                        key,
                        value: valueType.fromValue(to),
                        previousValue: optionType.fromValue(from),
                    });
                    // push action on account update
                    let update = getContract().self;
                    update.body.actions = Actions.pushEvent(update.body.actions, action);
                },
                async get(key) {
                    let keyHash = toKeyHash(prefix, keyType, key);
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
                let actions = await fetchMerkleLeaves(internal.contract, {
                    fromActionState: actionState,
                });
                let result = await rollup.prove(merkleMap, actions);
                // update internal merkle maps as well
                // TODO make this not insanely recompute everything
                // - take new tree from `result`
                // - update value map in `prove()`, or separately based on `actions`
                let { merkleMap: newMerkleMap, valueMap: newValueMap } = await fetchMerkleMap(height, internal.contract);
                internal.merkleMap = newMerkleMap;
                internal.valueMap = newValueMap;
                return result.proof;
            },
            async settle(proof) {
                // verify the proof
                proof.verify();
                // check that proof moves state forward from the one currently stored
                let state = getContract().offchainStateCommitments.getAndRequireEquals();
                Provable.assertEqual(OffchainStateCommitments, state, proof.publicInput);
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
                Provable.asProver(() => {
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
            return State(OffchainStateCommitments.emptyFromHeight(height));
        },
    };
}
OffchainState.Map = OffchainMap;
OffchainState.Field = OffchainField;
OffchainState.Commitments = OffchainStateCommitments;
function OffchainField(type) {
    return { kind: 'offchain-field', type };
}
function OffchainMap(key, value) {
    return { kind: 'offchain-map', keyType: key, valueType: value };
}
