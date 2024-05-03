import { InferProvable } from '../../provable/types/struct.js';
import { Actionable } from './offchain-state-serialization.js';

export { OffchainState };

type Any = Actionable<any>;

function OffchainField<T extends Any>(type: T) {
  return { kind: 'offchain-field' as const, type };
}
type OffchainField<T> = {
  get(): Promise<T>;
  set(value: T): void;
};

function OffchainMap<K extends Any, V extends Any>(key: K, value: V) {
  return { kind: 'offchain-map' as const, keyType: key, valueType: value };
}
type OffchainMap<K, V> = {
  get(key: K): Promise<V>;
  set(key: K, value: V): void;
};

type OffchainStateKind =
  | { kind: 'offchain-field'; type: Any }
  | { kind: 'offchain-map'; keyType: Any; valueType: Any };

type OffchainStateIntf<Kind extends OffchainStateKind> = Kind extends {
  kind: 'offchain-field';
  type: infer T;
}
  ? OffchainField<InferProvable<T>>
  : Kind extends {
      kind: 'offchain-map';
      keyType: infer K;
      valueType: infer V;
    }
  ? OffchainMap<InferProvable<K>, InferProvable<V>>
  : never;

function OffchainState<
  const Config extends { [key: string]: OffchainStateKind }
>(
  config: Config
): {
  readonly fields: {
    [K in keyof Config]: OffchainStateIntf<Config[K]>;
  };
} {
  throw new Error('Not implemented');
}

OffchainState.Map = OffchainMap;
OffchainState.Field = OffchainField;
