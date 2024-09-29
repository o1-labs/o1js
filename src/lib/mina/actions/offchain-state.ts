import { InferProvable } from '../../provable/types/struct.js';
import {
  Actionable,
  fetchMerkleLeaves,
  fetchMerkleMap,
  fromActionWithoutHashes,
  toAction,
  toKeyHash,
} from './offchain-state-serialization.js';
import { Field } from '../../provable/wrapped.js';
import { Proof } from '../../proof-system/zkprogram.js';
import {
  OffchainStateCommitments,
  OffchainStateRollup,
} from './offchain-state-rollup.js';
import { Option, OptionOrValue } from '../../provable/option.js';
import {
  Constructor,
  InferValue,
} from '../../../bindings/lib/provable-generic.js';
import { SmartContract } from '../zkapp.js';
import { assert } from '../../provable/gadgets/common.js';
import { State } from '../state.js';
import { Actions } from '../account-update.js';
import { Provable } from '../../provable/provable.js';
import { Poseidon } from '../../provable/crypto/poseidon.js';
import { contract } from '../smart-contract-context.js';
import { IndexedMerkleMap } from '../../provable/merkle-tree-indexed.js';
import { assertDefined } from '../../util/assert.js';
import { ProvableType } from '../../provable/types/provable-intf.js';

// external API
export { OffchainState, OffchainStateCommitments };

// internal API
export { OffchainField, OffchainMap };

type OffchainState<Config extends { [key: string]: OffchainStateKind }> = {
  /**
   * The individual fields of the offchain state.
   *
   * ```ts
   * const state = OffchainState({ totalSupply: OffchainState.Field(UInt64) });
   *
   * state.fields.totalSupply.overwrite(UInt64.from(100));
   *
   * let supply = await state.fields.totalSupply.get();
   * ```
   */
  readonly fields: {
    [K in keyof Config]: OffchainStateIntf<Config[K]>;
  };

  /**
   * Set the contract that this offchain state is connected with.
   *
   * This tells the offchain state about the account to fetch data from and modify, and lets it handle actions and onchain state.
   */
  setContractInstance(contract: OffchainStateContract): void;

  /**
   * Set the smart contract class that this offchain state is connected with.
   *
   * This is an alternative for `setContractInstance()` which lets you compile offchain state without having a contract instance.
   * However, you must call `setContractInstance()` before calling `createSettlementProof()`.
   */
  setContractClass(contract: OffchainStateContractClass): void;

  /**
   * Compile the offchain state ZkProgram.
   */
  compile(): Promise<void>;

  /**
   * Create a proof that updates the commitments to offchain state: Merkle root and action state.
   */
  createSettlementProof(): Promise<
    Proof<OffchainStateCommitments, OffchainStateCommitments>
  >;

  /**
   * The custom proof class for state settlement proofs, that have to be passed into the settling method.
   */
  Proof: typeof Proof<OffchainStateCommitments, OffchainStateCommitments>;

  /**
   * Settle the offchain state.
   *
   * Use this in a contract method as follows:
   *
   * @example
   * ```ts
   * class StateProof extends offchainState.Proof {}
   *
   * // ...
   *
   * class MyContract extends SmartContract {
   *   \@method
   *   async settle(proof: StateProof) {
   *     await offchainState.settle(proof);
   *   }
   * }
   * ```
   *
   * The `StateProof` can be created by calling `offchainState.createSettlementProof()`.
   */
  settle(
    proof: Proof<OffchainStateCommitments, OffchainStateCommitments>
  ): Promise<void>;

  /**
   * Commitments to the offchain state, to use in your onchain state.
   */
  commitments(): State<OffchainStateCommitments>;
};

type OffchainStateContract = SmartContract & {
  offchainState: State<OffchainStateCommitments>;
};
type OffchainStateContractClass = typeof SmartContract &
  Constructor<OffchainStateContract>;

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
function OffchainState<
  const Config extends { [key: string]: OffchainStateKind }
>(
  config: Config,
  options?: {
    /**
     * The base-2 logarithm of the total capacity of the offchain state.
     *
     * Example: if you want to have 1 million individual state fields and map entries available,
     * set this to 20, because 2^20 ~= 1M.
     *
     * The default is 30, which allows for ~1 billion entries.
     *
     * Passing in lower numbers will reduce the number of constraints required to prove offchain state updates,
     * which we will make proof creation slightly faster.
     * Instead, you could also use a smaller total capacity to increase the `maxActionsPerProof`, so that fewer proofs are required,
     * which will reduce the proof time even more, but only in the case of many actions.
     */
    logTotalCapacity?: number;
    /**
     * The maximum number of offchain state actions that can be included in a single account update.
     *
     * In other words, you must not call `.update()` or `.overwrite()` more than this number of times in any of your smart contract methods.
     *
     * The default is 4.
     *
     * Note: When increasing this, consider decreasing `maxActionsPerProof` or `logTotalCapacity` in order to not exceed the circuit size limit.
     */
    maxActionsPerUpdate?: number;
    maxActionsPerProof?: number;
  }
): OffchainState<Config> {
  // read options
  let {
    logTotalCapacity = 30,
    maxActionsPerUpdate = 4,
    maxActionsPerProof,
  } = options ?? {};
  const height = logTotalCapacity + 1;
  class IndexedMerkleMapN extends IndexedMerkleMap(height) {}

  // setup internal state of this "class"
  let internal = {
    _contract: undefined as OffchainStateContract | undefined,
    _contractClass: undefined as OffchainStateContractClass | undefined,
    _merkleMap: undefined as IndexedMerkleMapN | undefined,
    _valueMap: undefined as Map<bigint, Field[]> | undefined,

    get contract() {
      return assertDefined(
        internal._contract,
        'Must call `setContractInstance()` first'
      );
    },
  };
  const onchainActionState = async () => {
    let actionState = (await internal.contract.offchainState.fetch())
      ?.actionState;
    assert(actionState !== undefined, 'Could not fetch action state');
    return actionState;
  };

  const merkleMaps = async () => {
    if (internal._merkleMap !== undefined && internal._valueMap !== undefined) {
      return { merkleMap: internal._merkleMap, valueMap: internal._valueMap };
    }
    let actionState = await onchainActionState();
    let { merkleMap, valueMap } = await fetchMerkleMap(
      height,
      internal.contract,
      actionState
    );
    internal._merkleMap = merkleMap;
    internal._valueMap = valueMap;
    return { merkleMap, valueMap };
  };

  let rollup = OffchainStateRollup({
    logTotalCapacity,
    maxActionsPerProof,
    maxActionsPerUpdate,
  });

  function getContract(): OffchainStateContract {
    let Contract = assertDefined(
      internal._contractClass,
      'Must call `setContractInstance()` or `setContractClass()` first'
    );
    return contract(Contract);
  }

  function maybeContract() {
    try {
      return getContract();
    } catch {
      return internal.contract;
    }
  }

  /**
   * generic get which works for both fields and maps
   */
  async function get<V, VValue>(key: Field, valueType: Actionable<V, VValue>) {
    // get onchain merkle root
    let state = maybeContract().offchainState.getAndRequireEquals();

    // witness the merkle map & anchor against the onchain root
    let map = await Provable.witnessAsync(
      IndexedMerkleMapN,
      async () => (await merkleMaps()).merkleMap
    );
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
    let hashMatches = Poseidon.hashPacked(valueType, value.value).equals(
      valueHash.value
    );
    let bothNone = value.isSome.or(valueHash.isSome).not();
    assert(hashMatches.or(bothNone), 'value hash mismatch');

    return value;
  }

  function field<T, TValue>(
    index: number,
    type: Actionable<T, TValue>
  ): OffchainField<T, TValue> {
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

  function map<K, V, VValue>(
    index: number,
    keyType: Actionable<K>,
    valueType: Actionable<V, VValue>
  ): OffchainMap<K, V, VValue> {
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
    setContractInstance(contract) {
      internal._contract = contract;
      internal._contractClass =
        contract.constructor as OffchainStateContractClass;
    },
    setContractClass(contractClass) {
      internal._contractClass = contractClass;
    },

    async compile() {
      await rollup.compile();
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
      let { merkleMap: newMerkleMap, valueMap: newValueMap } =
        await fetchMerkleMap(height, internal.contract);
      internal._merkleMap = newMerkleMap;
      internal._valueMap = newValueMap;

      return result.proof;
    },

    Proof: rollup.Proof,

    async settle(proof) {
      // verify the proof
      proof.verify();

      // check that proof moves state forward from the one currently stored
      let state = getContract().offchainState.getAndRequireEquals();
      Provable.assertEqual(OffchainStateCommitments, state, proof.publicInput);

      // require that proof uses the correct pending actions
      getContract().account.actionState.requireEquals(
        proof.publicOutput.actionState
      );

      // update the state
      getContract().offchainState.set(proof.publicOutput);
    },

    fields: Object.fromEntries(
      Object.entries(config).map(([key, kind], i) => [
        key,
        kind.kind === 'offchain-field'
          ? field(i, kind.type)
          : map(i, kind.keyType, kind.valueType),
      ])
    ) as any,

    commitments() {
      return State(OffchainStateCommitments.emptyFromHeight(height));
    },
  };
}

OffchainState.Map = OffchainMap;
OffchainState.Field = OffchainField;
OffchainState.Commitments = OffchainStateCommitments;

// type helpers

type Any = Actionable<any>;

function OffchainField<T extends Any>(type: T) {
  return { kind: 'offchain-field' as const, type };
}
type OffchainField<T, TValue> = {
  _type: Provable<T, TValue>;

  /**
   * Get the value of the field, or none if it doesn't exist yet.
   */
  get(): Promise<Option<T, TValue>>;

  /**
   * Update the value of the field, while requiring a specific previous value.
   *
   * If the previous value does not match, the update will not be applied.
   *
   * Note that the previous value is an option: to require that the field was not set before, use `Option(type).none()` or `undefined`.
   */
  update(update: { from: OptionOrValue<T, TValue>; to: T | TValue }): void;

  /**
   * Set the value of the field to the given value, without taking into account the previous value.
   *
   * **Warning**: if this is performed by multiple zkapp calls concurrently (between one call to `settle()` and the next),
   * calls that are applied later will simply overwrite and ignore whatever changes were made by earlier calls.
   *
   * This behaviour can imply a security risk in many applications, so use `overwrite()` with caution.
   */
  overwrite(value: T | TValue): void;
};

function OffchainMap<K extends Any, V extends Any>(key: K, value: V) {
  return { kind: 'offchain-map' as const, keyType: key, valueType: value };
}
type OffchainMap<K, V, VValue> = {
  _keyType: Provable<K>;
  _valueType: Provable<V, VValue>;

  /**
   * Get the value for this key, or none if it doesn't exist.
   */
  get(key: K): Promise<Option<V, VValue>>;

  /**
   * Update the value of the field, while requiring a specific previous value.
   *
   * If the previous value does not match, the update will not be applied.
   *
   * Note that the previous value is an option: to require that the field was not set before, use `Option(type).none()` or `undefined`.
   */
  update(
    key: K,
    update: { from: OptionOrValue<V, VValue>; to: V | VValue }
  ): void;

  /**
   * Set the value for this key to the given value, without taking into account the previous value.
   *
   * **Warning**: if the same key is modified by multiple zkapp calls concurrently (between one call to `settle()` and the next),
   * calls that are applied later will simply overwrite and ignore whatever changes were made by earlier calls.
   *
   * This behaviour can imply a security risk in many applications, so use `overwrite()` with caution.
   */
  overwrite(key: K, value: V | VValue): void;
};

type OffchainStateKind =
  | { kind: 'offchain-field'; type: Any }
  | { kind: 'offchain-map'; keyType: Any; valueType: Any };

type OffchainStateIntf<Kind extends OffchainStateKind> = Kind extends {
  kind: 'offchain-field';
  type: infer T;
}
  ? OffchainField<InferProvable<T>, InferValue<T>>
  : Kind extends {
      kind: 'offchain-map';
      keyType: infer K;
      valueType: infer V;
    }
  ? OffchainMap<InferProvable<K>, InferProvable<V>, InferValue<V>>
  : never;
