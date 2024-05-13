import { InferProvable } from '../../provable/types/struct.js';
import { Actionable, toAction } from './offchain-state-serialization.js';
import { PublicKey } from '../../provable/crypto/signature.js';
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
import { declareState } from '../state.js';
import { Actions } from '../account-update.js';

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
   * This tells the offchain state about the account to fetch data from and modify.
   */
  setContractAccount(contract: SmartContract): void;

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

function OffchainState<
  const Config extends { [key: string]: OffchainStateKind }
>(config: Config): OffchainState<Config> {
  // setup internal state of this "class"
  let internal = {
    _contract: undefined as SmartContract | undefined,

    get contract() {
      assert(
        internal._contract !== undefined,
        'Must call `setContractAccount()` first'
      );
      return internal._contract;
    },
  };

  const notImplemented = (): any => assert(false, 'Not implemented');

  let rollup = OffchainStateRollup();

  function field<T, TValue>(
    index: number,
    type: Actionable<T, TValue>
  ): OffchainField<T, TValue> {
    const prefix = Field(index);

    function selfToAction(value: T | TValue): Field[] {
      return toAction(
        prefix,
        undefined,
        type,
        undefined,
        type.fromValue(value)
      );
    }

    return {
      set(value) {
        // serialize into action
        let action = selfToAction(value);

        // push action on account update
        let update = internal.contract.self;
        Actions.pushEvent(update.body.actions, action);
      },
      update: notImplemented,
      get: notImplemented,
    };
  }

  function map<K, V, VValue>(
    index: number,
    keyType: Actionable<K>,
    valueType: Actionable<V>
  ): OffchainMap<K, V, VValue> {
    const prefix = Field(index);

    function selfToAction(key: K, value: V | VValue): Field[] {
      return toAction(
        prefix,
        keyType,
        valueType,
        key,
        valueType.fromValue(value)
      );
    }

    return {
      set(key, value) {
        // serialize into action
        let action = selfToAction(key, value);

        // push action on account update
        let update = internal.contract.self;
        Actions.pushEvent(update.body.actions, action);
      },
      update: notImplemented,
      get: notImplemented,
    };
  }

  return {
    setContractClass(contract) {
      declareState(contract, { stateRoot: Field, actionState: Field });
    },

    setContractAccount(contract) {
      internal._contract = contract;
    },

    async compile() {
      await rollup.compile();
    },

    async createSettlementProof() {
      return notImplemented();
    },

    Proof: rollup.Proof,

    async settle(proof) {
      notImplemented();
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
type Contract = { address: PublicKey; tokenId: Field };

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
