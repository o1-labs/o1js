import {
  Provable,
  ProvableHashable,
  ProvablePure,
  ProvableType,
  ToProvable,
} from './provable-intf.js';
import type { Field } from '../wrapped.js';
import {
  createDerivers,
  NonMethods,
  InferProvable as GenericInferProvable,
  InferJson,
  InferredProvable as GenericInferredProvable,
  IsPure as GenericIsPure,
  NestedProvable as GenericNestedProvable,
  createHashInput,
  Constructor,
  InferValue,
  InferJsonNested,
  InferValueNested,
  InferProvableNested,
} from '../../../bindings/lib/provable-generic.js';
import { Tuple } from '../../util/types.js';
import { GenericHashInput } from '../../../bindings/lib/generic.js';

// external API
export {
  ProvableExtended,
  ProvableInferPureFrom,
  provable,
  provablePure,
  provableTuple,
  provableFromClass,
  provableExtends,
};

// internal API
export {
  NonMethods,
  HashInput,
  InferProvable,
  InferProvableType,
  InferJson,
  InferredProvable,
  IsPure,
  NestedProvable,
  mapValue,
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
type InferProvableType<T extends ProvableType> = InferProvable<ToProvable<T>>;
type InferredProvable<T> = GenericInferredProvable<T, Field>;
type IsPure<T> = GenericIsPure<T, Field>;
type ProvableInferPureFrom<A, T, V> = IsPure<A> extends true
  ? ProvablePure<T, V>
  : Provable<T, V>;

type HashInput = GenericHashInput<Field>;
const HashInput = createHashInput<Field>();

type NestedProvable = GenericNestedProvable<Field>;

const { provable } = createDerivers<Field>();

function provablePure<A>(
  typeObj: A
): ProvablePureExtended<InferProvable<A>, InferValue<A>, InferJson<A>> {
  return provable(typeObj, { isPure: true }) as any;
}

function provableTuple<T extends Tuple<any>>(types: T): InferredProvable<T> {
  return provable(types) as any;
}

function provableFromClass<
  A extends NestedProvable,
  T extends InferProvableNested<Field, A>,
  V extends InferValueNested<Field, A>,
  J extends InferJsonNested<Field, A>
>(
  Class: Constructor<T> & { check?: (x: T) => void; empty?: () => T },
  typeObj: A
): IsPure<A> extends true
  ? ProvablePureExtended<T, V, J>
  : ProvableExtended<T, V, J> {
  let raw: ProvableExtended<T, V, J> = provable(typeObj) as any;
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
  } satisfies ProvableExtended<T, V, J> as any;
}

function construct<Raw, T extends Raw>(Class: Constructor<T>, value: Raw): T {
  let instance = Object.create(Class.prototype);
  return Object.assign(instance, value);
}

function provableExtends<
  A extends ProvableHashable<any>,
  T extends InferProvable<A>,
  S extends T
>(S: new (t: T) => S, base: A) {
  return {
    sizeInFields() {
      return base.sizeInFields();
    },
    toFields(value: S | T) {
      return base.toFields(value);
    },
    toAuxiliary(value?: S | T) {
      return base.toAuxiliary(value);
    },
    fromFields(fields, aux) {
      return new S(base.fromFields(fields, aux));
    },
    check(value: S | T) {
      base.check(value);
    },
    toValue(value: S | T) {
      return base.toValue(value);
    },
    fromValue(value) {
      return new S(base.fromValue(value));
    },
    empty() {
      return new S(base.empty());
    },
    toInput(value: S | T) {
      return base.toInput(value);
    },
  } satisfies ProvableHashable<S, InferValue<A>>;
}

function mapValue<
  A extends ProvableHashable<any>,
  V extends InferValue<A>,
  W,
  T extends InferProvable<A>
>(
  provable: A,
  there: (x: V) => W,
  back: (x: W | T) => V | T
): ProvableHashable<T, W> {
  return {
    sizeInFields() {
      return provable.sizeInFields();
    },
    toFields(value) {
      return provable.toFields(value);
    },
    toAuxiliary(value) {
      return provable.toAuxiliary(value);
    },
    fromFields(fields, aux) {
      return provable.fromFields(fields, aux);
    },
    check(value) {
      provable.check(value);
    },
    toValue(value) {
      return there(provable.toValue(value));
    },
    fromValue(value) {
      return provable.fromValue(back(value));
    },
    empty() {
      return provable.empty();
    },
    toInput(value) {
      return provable.toInput(value);
    },
  };
}
