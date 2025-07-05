import { Provable } from './provable.js';
import { Struct } from './types/struct.js';
import { provable } from './types/provable-derivers.js';
import { Bool } from './wrapped.js';
import { ProvableType } from './types/provable-intf.js';
export { Option };
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
function Option(type) {
    let strictType = ProvableType.get(type);
    const PlainOption = provable({ isSome: Bool, value: strictType });
    const RawOption = {
        ...PlainOption,
        toValue({ isSome, value }) {
            return isSome.toBoolean() ? strictType.toValue(value) : undefined;
        },
        fromValue(value) {
            if (value === undefined)
                return {
                    isSome: Bool(false),
                    value: ProvableType.synthesize(strictType),
                };
            // TODO: this isn't 100% robust. We would need recursive type validation on any nested objects to make it work
            if (typeof value === 'object' && 'isSome' in value)
                return PlainOption.fromValue(value); // type-cast here is ok, matches implementation
            return { isSome: Bool(true), value: strictType.fromValue(value) };
        },
    };
    const Super = Struct(RawOption);
    return class Option_ extends Super {
        orElse(defaultValue) {
            return Provable.if(this.isSome, strictType, this.value, strictType.fromValue(defaultValue));
        }
        assertSome(message) {
            this.isSome.assertTrue(message);
            return this.value;
        }
        assertNone(message) {
            this.isSome.assertFalse(message);
        }
        static from(value) {
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
        static fromFields(fields, aux) {
            return new Option_(Super.fromFields(fields, aux));
        }
        static fromValue(value) {
            return new Option_(Super.fromValue(value));
        }
        static toCanonical(value) {
            return new Option_(Super.toCanonical?.(value) ?? value);
        }
    };
}
