import 'reflect-metadata';
import { ProvablePureBn254 } from '../snarky.js';
import {
  provablePure,
  provableTuple,
  HashInput,
} from '../bindings/lib/provable-snarky.js';
import { provable } from '../bindings/lib/provable-snarky-bn254.js';
import type {
  InferJson,
  InferProvable,
  InferredProvable,
} from '../bindings/lib/provable-snarky.js';
import { FieldBn254 } from './field-bn254.js';
import { ProvableBn254 } from './provable-bn254.js';

// external API
export {
  ProvableExtendedBn254,
  ProvablePureExtendedBn254,
  provable,
  provablePure,
};

// internal API
export {
  provableTuple,
  InferProvable,
  HashInput,
  InferJson,
  InferredProvable,
};

type ProvableExtensionBn254<T, TJson = any> = {
  toInput: (x: T) => { fields?: FieldBn254[]; packed?: [FieldBn254, number][] };
  toJSON: (x: T) => TJson;
  fromJSON: (x: TJson) => T;
  empty: () => T;
};

type ProvableExtendedBn254<T, TJson = any> = ProvableBn254<T> &
  ProvableExtensionBn254<T, TJson>;

type ProvablePureExtendedBn254<T, TJson = any> = ProvablePureBn254<T> &
  ProvableExtensionBn254<T, TJson>;
