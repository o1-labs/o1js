import { InferValue } from '../../bindings/lib/provable-generic.js';
import { Provable } from './provable.js';
import { InferProvable, Struct } from './types/struct.js';
import { provable, ProvableInferPureFrom } from './types/provable-derivers.js';
import { Bool } from './wrapped.js';
import { ProvableType } from './types/provable-intf.js';

export { Option, OptionOrValue };

type Option<T, V = any> = { isSome: Bool; value: T } & {
  assertSome(message?: string): T;
  assertNone(message?: string): void;
  orElse(defaultValue: T | V): T;
};

type OptionOrValue<T, V> = { isSome: boolean | Bool; value: T | V } | T | V | undefined;

/**
 * Define an optional version of a provable type.
 *
 * @example
 * ```ts
 * class OptionUInt64 extends Option(UInt64) {}
 *
 * // create an optional UInt64
 * let some = OptionUInt64.from(5n);
 * let none = OptionUInt64.none();
 *
 * // get back a UInt64
 * let five: UInt64 = some.assertSome('must have a value');
 * let zero: UInt64 = none.orElse(0n); // specify a default value
 * ```
 */
function Option<A extends ProvableType>(
  type: A
): ProvableInferPureFrom<A, Option<InferProvable<A>, InferValue<A>>, InferValue<A> | undefined> &
  (new (option: { isSome: Bool; value: InferProvable<A> }) => Option<
    InferProvable<A>,
    InferValue<A>
  >) & {
    fromValue(
      value:
        | { isSome: boolean | Bool; value: InferProvable<A> | InferValue<A> }
        | InferProvable<A>
        | InferValue<A>
        | undefined
    ): Option<InferProvable<A>, InferValue<A>>;
    from(value?: InferProvable<A> | InferValue<A>): Option<InferProvable<A>, InferValue<A>>;
    none(): Option<InferProvable<A>, InferValue<A>>;
  } {
  type T = InferProvable<A>;
  type V = InferValue<A>;
  let strictType: Provable<T, V> = ProvableType.get(type);

  // construct a provable with a JS type of `T | undefined`
  type PlainOption = { isSome: Bool; value: T };
  const PlainOption: Provable<{ isSome: Bool; value: T }, { isSome: boolean; value: V }> = provable(
    { isSome: Bool, value: strictType }
  );

  const RawOption = {
    ...PlainOption,

    toValue({ isSome, value }: { isSome: Bool; value: T }) {
      return isSome.toBoolean() ? strictType.toValue(value) : undefined;
    },

    fromValue(value: OptionOrValue<T, V>) {
      if (value === undefined)
        return {
          isSome: Bool(false),
          value: ProvableType.synthesize(strictType),
        };
      // TODO: this isn't 100% robust. We would need recursive type validation on any nested objects to make it work
      if (typeof value === 'object' && 'isSome' in value)
        return PlainOption.fromValue(value as any); // type-cast here is ok, matches implementation
      return { isSome: Bool(true), value: strictType.fromValue(value) };
    },
  };

  const Super = Struct(RawOption);
  return class Option_ extends Super {
    orElse(defaultValue: T | V): T {
      return Provable.if(this.isSome, strictType, this.value, strictType.fromValue(defaultValue));
    }

    assertSome(message?: string): T {
      this.isSome.assertTrue(message);
      return this.value;
    }

    assertNone(message?: string): void {
      this.isSome.assertFalse(message);
    }

    static from(value?: V | T) {
      return value === undefined
        ? new Option_({
            isSome: Bool(false),
            value: ProvableType.synthesize(strictType),
          })
        : new Option_({
            isSome: Bool(true),
            value: strictType.fromValue(value),
          });
    }
    static none() {
      return Option_.from(undefined);
    }

    static fromFields(fields: any[], aux?: any): Option_ {
      return new Option_(Super.fromFields(fields, aux));
    }
    static fromValue(value: OptionOrValue<T, V>) {
      return new Option_(Super.fromValue(value));
    }
    static toCanonical(value: PlainOption) {
      return new Option_(Super.toCanonical?.(value) ?? value);
    }
  };
}
