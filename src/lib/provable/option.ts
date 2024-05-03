import { emptyValue } from '../proof-system/zkprogram.js';
import { Provable } from './provable.js';
import { Struct } from './types/struct.js';
import { Bool } from './wrapped.js';

export { Option };

type Option<T, V = any> = { isSome: Bool; value: T } & {
  assertSome(message?: string): T;
  orElse(defaultValue: T | V): T;
};

function Option<T, V>(
  type: Provable<T, V>
): Provable<
  Option<T, V>,
  // TODO make V | undefined the value type
  { isSome: boolean; value: V }
> & {
  from(value?: T): Option<T, V>;
} {
  const Super = Struct({ isSome: Bool, value: type });
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

    static fromFields(fields: any[], aux?: any): Option_ {
      return new Option_(Super.fromFields(fields, aux));
    }
    static fromValue(value: { isSome: boolean | Bool; value: V | T }) {
      return new Option_(Super.fromValue(value));
    }
  };
}
