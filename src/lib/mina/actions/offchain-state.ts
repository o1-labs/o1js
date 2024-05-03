import { InferProvable } from '../../provable/types/struct.js';
import { Actionable } from './offchain-state-serialization.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { Field } from '../../provable/field.js';
import { Proof } from '../../proof-system/zkprogram.js';
import { MerkleMapState } from './offchain-state-rollup.js';
import { Option } from '../../provable/option.js';
import { InferValue } from '../../../bindings/lib/provable-generic.js';

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
   * Set the contract that this offchain state is connected with.
   *
   * Note: This declares two _onchain_ state fields on the contract,
   * which it uses to keep commitments to the offchain state and processed actions.
   *
   * This means that the contract has only 6 remaining onchain state fields available.
   *
   * It also sets the reducer for this contract, so you can't use another reducer with this contract.
   */
  setContract(contract: Contract): void;

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
  throw new Error('Not implemented');
}

OffchainState.Map = OffchainMap;
OffchainState.Field = OffchainField;

// helpers

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
