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
  MerkleMapState,
  OffchainStateRollup,
} from './offchain-state-rollup.js';
import { Option } from '../../provable/option.js';
import { InferValue } from '../../../bindings/lib/provable-generic.js';
import { SmartContract } from '../zkapp.js';
import { assert } from '../../provable/gadgets/common.js';
import { State, declareState } from '../state.js';
import { Actions } from '../account-update.js';
import { MerkleMap, MerkleMapWitness } from '../../provable/merkle-map.js';
import { Provable } from '../../provable/provable.js';
import { Poseidon } from '../../provable/crypto/poseidon.js';

export { OffchainState };

type OffchainState<Config extends { [key: string]: OffchainStateKind }> = {
  /**
   * The individual fields of the offchain state.
   *
   * ```ts
   * const state = OffchainState({ totalSupply: OffchainState.Field(UInt64) });
   *
   * state.fields.totalSupply.set(UInt64.from(100));
   *
   * let supply = await state.fields.totalSupply.get();
   * ```
   */
  readonly fields: {
    [K in keyof Config]: OffchainStateIntf<Config[K]>;
  };

  /**
   * Set the contract class that this offchain state appliues to.
   *
   * Note: This declares two _onchain_ state fields on the contract,
   * which it uses to keep commitments to the offchain state and processed actions.
   *
   * This means that the contract has only 6 remaining onchain state fields available.
   *
   * It also sets the reducer for this contract, so you can't use another reducer with this contract.
   */
  setContractClass(contract: typeof SmartContract): void;

  /**
   * Set the contract that this offchain state is connected with.
   *
   * This tells the offchain state about the account to fetch data from and modify, and lets it handle actions and onchain state.
   */
  setContractInstance(contract: SmartContract): void;

  /**
   * Compile the offchain state ZkProgram.
   *
   * Note: If this is not done explicitly, it will be done before creating the first proof automatically.
   */
  compile(): Promise<void>;

  /**
   * Create a proof that the offchain state is in a valid state.
   */
  createSettlementProof(): Promise<Proof<MerkleMapState, MerkleMapState>>;

  /**
   * The custom proof class for state settlement proofs, that have to be passed into the settling method.
   */
  Proof: typeof Proof<MerkleMapState, MerkleMapState>;

  /**
   * Settle the offchain state.
   */
  settle(proof: Proof<MerkleMapState, MerkleMapState>): Promise<void>;
};

type OffchainStateContract = SmartContract & {
  offchainState: State<MerkleMapState>;
};

function OffchainState<
  const Config extends { [key: string]: OffchainStateKind }
>(config: Config): OffchainState<Config> {
  // setup internal state of this "class"
  let internal = {
    _contract: undefined as OffchainStateContract | undefined,
    _merkleMap: undefined as MerkleMap | undefined,
    _valueMap: undefined as Map<bigint, Field[]> | undefined,

    get contract() {
      assert(
        internal._contract !== undefined,
        'Must call `setContractAccount()` first'
      );
      return internal._contract;
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
      internal.contract,
      actionState
    );
    internal._merkleMap = merkleMap;
    internal._valueMap = valueMap;
    return { merkleMap, valueMap };
  };

  const notImplemented = (): any => assert(false, 'Not implemented');

  let rollup = OffchainStateRollup();

  /**
   * generic get which works for both fields and maps
   */
  async function get<V, VValue>(key: Field, valueType: Actionable<V, VValue>) {
    // get onchain merkle root
    let stateRoot = internal.contract.offchainState.getAndRequireEquals().root;

    // witness the actual value
    const optionType = Option(valueType);
    let value = await Provable.witnessAsync(optionType, async () => {
      let { valueMap } = await merkleMaps();
      let valueFields = valueMap.get(key.toBigInt());
      if (valueFields === undefined) {
        return optionType.from();
      }
      let value = fromActionWithoutHashes(valueType, valueFields);
      return optionType.from(value);
    });

    // witness a merkle witness
    let witness = await Provable.witnessAsync(MerkleMapWitness, async () => {
      let { merkleMap } = await merkleMaps();
      return merkleMap.getWitness(key);
    });

    // anchor the value against the onchain root and passed in key
    // we also allow the value to be missing, in which case the map must contain the 0 element
    let valueHash = Provable.if(
      value.isSome,
      Poseidon.hashPacked(valueType, value.value),
      Field(0)
    );
    let [actualRoot, actualKey] = witness.computeRootAndKey(valueHash);
    key.assertEquals(actualKey, 'key mismatch');
    stateRoot.assertEquals(actualRoot, 'root mismatch');

    return value;
  }

  function field<T, TValue>(
    index: number,
    type: Actionable<T, TValue>
  ): OffchainField<T, TValue> {
    const prefix = Field(index);

    return {
      set(value) {
        // serialize into action
        let action = toAction(
          prefix,
          undefined,
          type,
          undefined,
          type.fromValue(value)
        );

        // push action on account update
        let update = internal.contract.self;
        Actions.pushEvent(update.body.actions, action);
      },
      update: notImplemented,
      async get() {
        let key = toKeyHash(prefix, undefined, undefined);
        let optionValue = await get(key, type);
        // for fields that are not in the map, we return the default value -- similar to onchain state
        return optionValue.orElse(type.empty());
      },
    };
  }

  function map<K, V, VValue>(
    index: number,
    keyType: Actionable<K>,
    valueType: Actionable<V>
  ): OffchainMap<K, V, VValue> {
    const prefix = Field(index);

    return {
      set(key, value) {
        // serialize into action
        let action = toAction(
          prefix,
          keyType,
          valueType,
          key,
          valueType.fromValue(value)
        );

        // push action on account update
        let update = internal.contract.self;
        Actions.pushEvent(update.body.actions, action);
      },
      update: notImplemented,
      async get(key) {
        let keyHash = toKeyHash(prefix, keyType, key);
        return await get(keyHash, valueType);
      },
    };
  }

  return {
    setContractClass(contract) {
      declareState(contract, { offchainState: MerkleMapState });
    },

    setContractInstance(contract) {
      (contract as any).offchainState = State();
      internal._contract = contract as any;
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

      let result = await rollup.prove(merkleMap.tree, actions);

      // update internal merkle maps as well
      // TODO make this not insanely recompute everything
      let { merkleMap: newMerkleMap, valueMap: newValueMap } =
        await fetchMerkleMap(internal.contract);
      internal._merkleMap = newMerkleMap;
      internal._valueMap = newValueMap;

      return result.proof;
    },

    Proof: rollup.Proof,

    async settle(proof) {
      // verify the proof
      proof.verify();

      // check that proof moves state forward from the one currently storedö
      let state = internal.contract.offchainState.getAndRequireEquals();
      Provable.assertEqual(MerkleMapState, state, proof.publicInput);

      // require that proof uses the correct pending actions
      internal.contract.account.actionState.requireEquals(
        proof.publicOutput.actionState
      );

      // update the state
      internal.contract.offchainState.set(proof.publicOutput);
    },

    fields: Object.fromEntries(
      Object.entries(config).map(([key, kind], i) => [
        key,
        kind.kind === 'offchain-field'
          ? field(i, kind.type)
          : map(i, kind.keyType, kind.valueType),
      ])
    ) as any,
  };
}

OffchainState.Map = OffchainMap;
OffchainState.Field = OffchainField;

// type helpers

type Any = Actionable<any>;

function OffchainField<T extends Any>(type: T) {
  return { kind: 'offchain-field' as const, type };
}
type OffchainField<T, TValue> = {
  /**
   * Get the value of the field.
   */
  get(): Promise<T>;
  /**
   * Set the value of the field.
   */
  set(value: T | TValue): void;
  /**
   * Update the value of the field, while requiring a specific previous value.
   *
   * If the previous value does not match, the update will not be applied.
   * If no previous value is present, the `from` value is ignored and the update applied unconditionally.
   */
  update(update: { from: T | TValue; to: T | TValue }): void;
};

function OffchainMap<K extends Any, V extends Any>(key: K, value: V) {
  return { kind: 'offchain-map' as const, keyType: key, valueType: value };
}
type OffchainMap<K, V, VValue> = {
  /**
   * Get the value for this key, or none if it doesn't exist.
   */
  get(key: K): Promise<Option<V, VValue>>;
  /**
   * Set the value for this key.
   */
  set(key: K, value: V | VValue): void;
  /**
   * Update the value of the field, while requiring a specific previous value.
   *
   * If the previous value does not match, the update will not be applied.
   * If no previous value is present, the `from` value is ignored and the update applied unconditionally.
   */
  update(key: K, update: { from: V | VValue; to: V | VValue }): void;
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
