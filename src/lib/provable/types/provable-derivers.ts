import { Provable, ProvablePure } from './provable-intf.js';
import type { Field } from '../wrapped.js';
import {
  createDerivers,
  NonMethods,
  InferProvable as GenericInferProvable,
  InferJson,
  InferredProvable as GenericInferredProvable,
  IsPure as GenericIsPure,
  createHashInput,
  Constructor,
  InferValue,
} from '../../../bindings/lib/provable-generic.js';
import { Tuple } from '../../util/types.js';
import { GenericHashInput } from '../../../bindings/lib/generic.js';

// external API
export {
  ProvableExtended,
  provable,
  provablePure,
  provableTuple,
  provableFromClass,
};

// internal API
export {
  NonMethods,
  HashInput,
  InferProvable,
  InferJson,
  InferredProvable,
  IsPure,
};

type ProvableExtension<T, TJson = any> = {
  toInput: (x: T) => { fields?: Field[]; packed?: [Field, number][] };
  toJSON: (x: T) => TJson;
  fromJSON: (x: TJson) => T;
  empty: () => T;
};
type ProvableExtended<T, TValue = any, TJson = any> = Provable<T, TValue> &
  ProvableExtension<T, TJson>;
type ProvablePureExtended<T, TValue = any, TJson = any> = ProvablePure<
  T,
  TValue
> &
  ProvableExtension<T, TJson>;

type InferProvable<T> = GenericInferProvable<T, Field>;
type InferredProvable<T> = GenericInferredProvable<T, Field>;
type IsPure<T> = GenericIsPure<T, Field>;

type HashInput = GenericHashInput<Field>;
const HashInput = createHashInput<Field>();

const { provable } = createDerivers<Field>();

function provablePure<A>(
  typeObj: A
): ProvablePureExtended<InferProvable<A>, InferJson<A>> {
  return provable(typeObj, { isPure: true }) as any;
}

function provableTuple<T extends Tuple<any>>(types: T): InferredProvable<T> {
  return provable(types) as any;
}

function provableFromClass<A, T extends InferProvable<A>>(
  Class: Constructor<T> & { check?: (x: T) => void; empty?: () => T },
  typeObj: A
): IsPure<A> extends true
  ? ProvablePureExtended<T, InferJson<A>>
  : ProvableExtended<T, InferJson<A>> {
  let raw = provable(typeObj);
  return {
    sizeInFields: raw.sizeInFields,
    toFields: raw.toFields,
    toAuxiliary: raw.toAuxiliary,
    fromFields(fields, aux) {
      return construct(Class, raw.fromFields(fields, aux));
    },
    check(value) {
      if (Class.check !== undefined) {
        Class.check(value);
      } else {
        raw.check(value);
      }
    },
    toValue: raw.toValue,
    fromValue(x) {
      return construct(Class, raw.fromValue(x));
    },
    toInput: raw.toInput,
    toJSON: raw.toJSON,
    fromJSON(x) {
      return construct(Class, raw.fromJSON(x));
    },
    empty() {
      return Class.empty !== undefined
        ? Class.empty()
        : construct(Class, raw.empty());
    },
  } satisfies ProvableExtended<T, InferValue<A>, InferJson<A>> as any;
}

function construct<Raw, T extends Raw>(Class: Constructor<T>, value: Raw): T {
  let instance = Object.create(Class.prototype);
  return Object.assign(instance, value);
}
