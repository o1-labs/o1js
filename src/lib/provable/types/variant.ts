// variant.ts

import { InferValue } from '../../../bindings/lib/provable-generic.js';
import { provable } from "./provable-derivers.js";
import type { HashInput, InferJson, InferProvable } from './provable-derivers.js';
import { Field } from '../wrapped.js';
import { rangeCheckN } from '../gadgets/range-check.js';
import { Provable } from '../../../index.js';
import type { ToFieldable } from '../provable.js';
import { FlexibleProvableType } from './struct.js';

// From https://stackoverflow.com/questions/62158066/typescript-type-where-an-object-consists-of-exactly-a-single-property-of-a-set-o
type Explode<T> = keyof T extends infer K
  ? K extends unknown
  ? { [I in keyof T]: I extends K ? T[I] : never }
  : never
  : never;
type AtMostOne<T> = Explode<Partial<T>>;
type AtLeastOne<T, U = {[K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U]

/** This type indicates that exactly one key is present in the object.
 * 
 * @remarks Although useful for polymorphic code or large variants, this will give somewhat poor type errors
 * if you make a mistake, due to the way it is implemented.  This can be avoided by making your own union type.
 * 
 * @example
 * ```typescript
 * 
 * // Define a struct for RGB colors.
 * class Rgb extends Struct({
 *   r: Field,
 *   g: Field,
 *   b: Field,
 * }) {}
 * 
 * // A color is either an RGB color or a well-known 'named' color, like "pink" or "blue".
 * type ColorVariant = ExactlyOne<{
 *   rgb: Rgb,
 *   named: CircuitString,
 * }>;
 * 
 * 
 * const reddish: ColorVariant = { rgb: new Rgb({ r: Field(255), g: Field(10), b: Field(0) }) };
 * const pink: ColorVariant = { named: CircuitString.fromString("pink") };
 * 
 * const bad1: ColorVariant = { rgb: new Rgb({ r: Field(255), g: Field(10), b: Field(0) }), named: CircuitString.fromString("pink") }; // This will cause a type error because both keys are present.
 * const bad2: ColorVariant = { }; // This will also cause a type error, there aren't any keys.
 * const bad3: ColorVariant = { blarg: Field(13n) }; // This will also cause a type error, since `blarg` is not a key in `ColorVariant`.
 * const bad4: ColorVariant = { rgb: CircuitString.fromString("pink") }; // This will also cause a type error, since `rgb` must be an instance of `Rgb`.
 * ```
 * 
 */
type ExactlyOne<T> = AtMostOne<T> & AtLeastOne<T>

/** Helper to get the single `keyof T` key/tag from an `ExactlyOne<T>` type */
function getKey<T>(value: ExactlyOne<T>): keyof T {
    const keys = Object.keys(value);
    if (keys.length !== 1) {
        throw new Error("Unreachable: Invalid Variant: expected exactly one key, got: " + keys.length);
    }
    return keys[0] as keyof T;
}

/**
 * Creates a variant type that can hold exactly one of the provided types.
 * 
 * @param variants - An object where each key is a variant name and the value is the type of that variant.
 *
 * @see ExactlyOne
 * 
 * @returns A class that represents the variant type, with methods for serialization, deserialization, and other operations.
 * 
 * @remarks sizeInFields returns the maximum size of the fields required to represent any of the variants _plus one for the tag_.
 * 
 * @example
 * ```typescript
 * // Define a struct for RGB colors.
 * class Rgb extends Struct({
 *   t: Field,
 *   g: Field,
 *   b: Field,
 * }) {}
 * 
 * // Define a variant type that can be either an RGB color or a named color.
 * class Color extends Variant({
 *   rgb: Rgb,
 *   named: CircuitString,
 * }) {}
 * 
 * // Each variant is represented by a single key-value pair.
 * const reddish = { rgb: new Rgb({ r: Field(255), g: Field(10), b: Field(0) }) };
 * const pink = { named: CircuitString.fromString("pink") };
 * 
 * // Create a Merkle list of colors.
 * class ColorList extends MerkleList.create(Color) {}
 * 
 * const colorList = ColorList.empty();
 * 
 * // Add colors to the list.
 * colorList.push(reddish);
 * colorList.push(pink);
 * ```
 * 
 */

function Variant<
    As,
    Ts extends InferProvable<As> = InferProvable<As>,
    Vs extends InferValue<As> = InferValue<As>,
    Js extends InferJson<As> = InferJson<As>,
    >(
        variants: As
    ) {

    class Variant_ {
        static keys = Object.keys(variants as object).sort() as (keyof As)[];
        static indices = Object.fromEntries(
            this.keys.map((k, i) => [k, i])
        ) as {[K in keyof As]: number};
        static provables = this.keys.map(k => provable(variants[k]));
        static variants: As = variants
        static _isVariant: true = true;

        constructor(value: ExactlyOne<Ts>) {
            Object.assign(this, value);
        }

        static sizeInFields() {
            return Math.max(...this.provables.map(p => p.sizeInFields())) + 1;
        }

        static toFields(value: ExactlyOne<Ts>): Field[] {
            const key = getKey(value) as keyof As;
            const typedValue = value as any;
            const ret = [Field(this.indices[key]), ...this.provables[this.indices[key]].toFields(typedValue[key])];
            return ret.concat(new Array(this.sizeInFields() - ret.length).fill(Field(0xdeadbeefn)));
        }

        static toAuxiliary(value?: ExactlyOne<Ts>): any[] {
            if (value === undefined) {
                return [];
            }
            const key = getKey(value) as keyof As;
            const typedValue = value as any;
            return [this.indices[key], ...this.provables[this.indices[key]].toAuxiliary(typedValue[key])];
        }

        static toInput(value: ExactlyOne<Ts>): HashInput {
            const key = getKey(value) as keyof As;
            const typedValue = value as any;
            return this.provables[this.indices[key]].toInput(typedValue[key]);
        }

        static toJSON(value: ExactlyOne<Ts>): { tag: keyof As; value: Js[keyof Js] } {
            const key = getKey(value) as keyof As;
            const typedValue = value as any;
            return { tag: key, value: this.provables[this.indices[key]].toJSON(typedValue[key]) as Js[keyof Js] };
        }
        
        static fromJSON(json: { tag: keyof As; value: Js[keyof Js] }): ExactlyOne<Ts> {
            const key = json.tag;
            // TODO: This is correct as long as `tag` is the index into `Js`, but I'm using `any` to avoid type issues for now.
            const value = this.provables[this.indices[key]].fromJSON(json.value as any);
            return { [key]: value } as ExactlyOne<Ts>;
        }

        static empty(): ExactlyOne<Ts> {
            const key = this.keys[0];
            const value = this.provables[this.indices[key]].empty();
            const obj = Object.create(this.prototype);
            return Object.assign(obj, { [key]: value });
        }

        static check(value: ExactlyOne<Ts>) {
            const key = getKey(value) as keyof As;
            const typedValue = value as any;
            this.provables[this.indices[key]].check(typedValue[key]);
        }

        static toCanonical(value: ExactlyOne<Ts>): ExactlyOne<Ts> {
            const key = getKey(value) as keyof As;
            const typedValue = value as any;
            const canonical = this.provables[this.indices[key]].toCanonical?.(typedValue[key]) ?? typedValue[key];
            const obj = Object.create(this.prototype);
            return Object.assign(obj, { [key]: canonical });
        }

        static toValue(value: ExactlyOne<Ts>): ExactlyOne<Vs> {
            const key = getKey(value) as keyof As;
            const typedValue = value as any;
            const val = this.provables[this.indices[key]].toValue(typedValue[key]) as Vs[keyof Vs];
            const obj = Object.create(this.prototype);
            return Object.assign(obj, { [key]: val });
        }

        static fromValue(value: ExactlyOne<Vs>): ExactlyOne<Ts> {
            const key = getKey(value) as keyof As;
            const typedValue = value as any;
            const val = this.provables[this.indices[key]].fromValue(typedValue[key]) as Ts[keyof Ts];
            const obj = Object.create(this.prototype);
            return Object.assign(obj, { [key]: val });
        }

        static fromFields(fields: Field[], aux: any[]): ExactlyOne<Ts> {
            console.assert(fields.length === this.sizeInFields(), `Expected ${this.sizeInFields()} fields, got ${fields.length}`);
            const tag = fields[0]
            const key = this.keys[Number(tag.toBigInt())];
            // TODO: This type assertion is needed because I can't convince TypeScript `As` is a bunch of Provables yet.
            const value = this.provables[this.indices[key]].fromFields(fields.slice(1, (variants[key] as Provable<As[keyof As]>).sizeInFields() + 1), aux.slice(1));
            const obj = Object.create(this.prototype);
            return Object.assign(obj, { [key]: value });
        }

        static toTag(value: ExactlyOne<Ts>): Field {
            const key = getKey(value) as keyof As;
            return Field(this.indices[key]);
        }

        /** 
         * This function matches on a `Variant` by taking a record of `handler` functions returning the same type,
         * and calling the appropriate one on the variant.
         * 
         * @remarks Of course, every branch is always taken, like in a `Provable.if`, but only the one that is "correct" will be not zeroed out in the circuit.
         * 
         * @see `Provable.if`
         * 
         * @example
         * ```typescript
         * 
         * // Define a struct for RGB colors.
         * class Rgb extends Struct({
         *   r: Field,
         *   g: Field,
         *   b: Field,
         * }) {}
         * 
         * // A color is either an RGB color or a well-known 'named' color, like "pink" or "blue".
         * type ColorVariant = ExactlyOne<{
         *   rgb: Rgb,
         *   named: CircuitString,
         * }>;
         * 
         * class Color extends Variant({
         *      rgb: Rgb,
         *      named: CircuitString,
         * }) {}
         * 
         * const rgbValue: ExactlyOne<ColorVariant> = { rgb: new Rgb({
         *      r: Field(255),
         *      g: Field(0),
         *      b: Field(127),
         * })}
         * 
         * const namedValue: ExactlyOne<ColorVariant> = { named: CircuitString.fromString("black") }
         * 
         * const sumRgbs = (v) => Color.match(v, Field, {
         *      // For an `Rgb` case, we return the sum, as promised
         *      rgb: ({r, g, b}) => r + g + b,
         *      // In the case of the named color, we return a value, but you could
         *      // in theory match on all the "known" colors you want to handle and do them too.
         *      // For now we will always assume a named string is "black" or "white", if given.
         *      named: (cs) => 
         *          Provable.if(
         *              cs.equals(CircuitString.fromString("black")),
         *              Field,
         *              // is "black"
         *              Field(0),
         *              // is anything else -- assume it is "white"
         *              Field(255 + 255 + 255)
         *          )
         * });
         * 
         * // Both of these assertions will pass.
         * Field(255 + 127).assertEquals(sumRgbs(rgbValue));
         * Field(0).assertEquals(sumRgbs(namedValue));
         * ```
         */
        static match<U>(value: ExactlyOne<Ts>, type: FlexibleProvableType<U>, handlers: { [K in keyof Ts]: (value: Ts[K]) => U }): U {
            const key = getKey(value);
            const fields = this.toFields(value);
            const aux = this.toAuxiliary(value).slice(1);
            const tag = fields[0];
            console.log(tag)
            let handler = (orElse: U) => orElse
            for (let i = 0; i < this.keys.length; i++) {
                // Lets break this down a little:
                // This is the class of the variant value for this index
                const thisProvable = this.provables[i];

                console.log(thisProvable);
                // This is the return value, if `tag` is equal to `i`.
                const thisHandledValue: U = 
                    // this is the handler function for this index
                    handlers[this.keys[i] as keyof Ts](
                        // We call this variants fromFields on...
                        thisProvable.fromFields(
                            // the fields that _would_ make up the variant value if this was the correct one...
                            fields
                                .slice(
                                    1,
                                    // (And not a single field extra!)
                                    thisProvable.sizeInFields() + 1
                                ),
                            // ...and the aux for the variant type (TODO: Does this break when the aux are incompatible?  Does it matter?)
                            aux
                        // (we need to cast from the `InferProvable` type to the `Ts` type.  They are the same.)
                        ) as Ts[keyof Ts]
                    );
                // ...and if `tag.equals(i)`, then we return that! Otherwise, we try the next index.
                handler = (orElse: U) => Provable.if(
                    // if
                    tag.equals(i), 
                    // return type
                    type,
                    // then
                    thisHandledValue,
                    // else
                    handler(orElse)
                );
            }
            // At this point: handler is a function that takes in a match failure case, and returns the result of handling the variant.
            // However, we are sure by the end of it running that it's matched already.  Therefore, our "match failure" case can be anything.
            // For debugging, we make it a helpful error
            return handler(new Error("Unreachable match failure in Variant") as any);
        }
    }
    return Variant_;
}

export { Variant }

export type { ExactlyOne }