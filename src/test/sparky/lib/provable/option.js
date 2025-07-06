"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Option = void 0;
const provable_js_1 = require("./provable.js");
const struct_js_1 = require("./types/struct.js");
const provable_derivers_js_1 = require("./types/provable-derivers.js");
const wrapped_js_1 = require("./wrapped.js");
const provable_intf_js_1 = require("./types/provable-intf.js");
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
    let strictType = provable_intf_js_1.ProvableType.get(type);
    const PlainOption = (0, provable_derivers_js_1.provable)({ isSome: wrapped_js_1.Bool, value: strictType });
    const RawOption = {
        ...PlainOption,
        toValue({ isSome, value }) {
            return isSome.toBoolean() ? strictType.toValue(value) : undefined;
        },
        fromValue(value) {
            if (value === undefined)
                return {
                    isSome: (0, wrapped_js_1.Bool)(false),
                    value: provable_intf_js_1.ProvableType.synthesize(strictType),
                };
            // TODO: this isn't 100% robust. We would need recursive type validation on any nested objects to make it work
            if (typeof value === 'object' && 'isSome' in value)
                return PlainOption.fromValue(value); // type-cast here is ok, matches implementation
            return { isSome: (0, wrapped_js_1.Bool)(true), value: strictType.fromValue(value) };
        },
    };
    const Super = (0, struct_js_1.Struct)(RawOption);
    return class Option_ extends Super {
        orElse(defaultValue) {
            return provable_js_1.Provable.if(this.isSome, strictType, this.value, strictType.fromValue(defaultValue));
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
                    isSome: (0, wrapped_js_1.Bool)(false),
                    value: provable_intf_js_1.ProvableType.synthesize(strictType),
                })
                : new Option_({
                    isSome: (0, wrapped_js_1.Bool)(true),
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
exports.Option = Option;
