import { InferValue } from '../../bindings/lib/provable-generic.js';
import { emptyValue } from '../proof-system/zkprogram.js';
import { Provable } from './provable.js';
import { InferProvable, Struct } from './types/struct.js';
import { Bool } from './wrapped.js';

export { Option, OptionOrValue };

type Option<T, V = any> = { isSome: Bool; value: T } & {
  assertSome(message?: string): T;
  orElse(defaultValue: T | V): T;
};

type OptionOrValue<T, V> = Option<T, V> | { isSome: boolean; value: V };

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
function Option<A extends Provable<any, any>>(
  type: A
): Provable<
  Option<InferProvable<A>, InferValue<A>>,
  // TODO make V | undefined the value type
  { isSome: boolean; value: InferValue<A> }
> & {
  from(value?: InferProvable<A>): Option<InferProvable<A>, InferValue<A>>;
  none(): Option<InferProvable<A>, InferValue<A>>;
} {
  type T = InferProvable<A>;
  type V = InferValue<A>;

  const Super = Struct({ isSome: Bool, value: type as Provable<T, V> });
  return class Option_ extends Super {
    orElse(defaultValue: T | V): T {
      return Provable.if(
        this.isSome,
        type,
        this.value,
        type.fromValue(defaultValue)
      );
    }

    assertSome(message?: string): T {
      this.isSome.assertTrue(message);
      return this.value;
    }

    static from(value?: V | T) {
      return value === undefined
        ? new Option_({ isSome: Bool(false), value: emptyValue(type) })
        : new Option_({ isSome: Bool(true), value: type.fromValue(value) });
    }
    static none() {
      return Option_.from(undefined);
    }

    static fromFields(fields: any[], aux?: any): Option_ {
      return new Option_(Super.fromFields(fields, aux));
    }
    static fromValue(value: { isSome: boolean | Bool; value: V | T }) {
      return new Option_(Super.fromValue(value));
    }
  };
}
