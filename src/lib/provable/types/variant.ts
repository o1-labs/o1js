// variant.ts

import { InferValue } from '../../../bindings/lib/provable-generic.js';
import { provable } from "./provable-derivers.js";
import type { HashInput, InferJson, InferProvable } from './provable-derivers.js';
import { Field } from '../wrapped.js';

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

// Helper to get the single key from an ExactlyOne type
function getKey<T>(value: ExactlyOne<T>): keyof T {
    const keys = Object.keys(value);
    if (keys.length !== 1) {
        throw new Error("Invalid variant: expected exactly one key, got: " + keys.length);
    }
    return keys[0] as keyof T;
}

/**
 * Creates a variant type that can hold exactly one of the provided types.
 * 
 * @param variants - An object where each key is a variant name and the value is the type of that variant.
 * 
 * @returns A class that represents the variant type, with methods for serialization, deserialization, and other operations.
 * 
 * @remarks sizeInFields returns the maximum size of the fields required to represent any of the variants _plus one for the index_.
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
 * colorList.push(reddish); // 
 * colorList.push(pink);
 * ```
 */

function Variant<
    As,
    Ts extends InferProvable<As>,
    Vs extends InferValue<As>,
    Js extends InferJson<As>,
    >(
        variants: As
    ) {

    class Variant_ {
        static keys = Object.keys(variants as object) as (keyof As)[];
        static indices = Object.fromEntries(
            this.keys.map((k, i) => [k, i])
        ) as {[K in keyof As]: number};
        static provables = this.keys.map(k => provable(variants[k]));
        static types = variants
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
            return [Field(this.indices[key]), ...this.provables[this.indices[key]].toFields(typedValue[key])];
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

        static toJSON(value: ExactlyOne<Ts>): { tag: string; value: Js[keyof Js] } {
            const key = getKey(value) as string;
            const typedValue = value as any;
            return { tag: key, value: this.provables[this.indices[key as keyof As]].toJSON(typedValue[key]) as Js[keyof Js] };
        }
        
        static fromJSON(json: { tag: keyof As; value: Js[keyof Js] }): ExactlyOne<Ts> {
            const key = json.tag;
            // FIXME: This is correct as long as `tag` is the index into `Js`, but I'm using `any` to avoid type issues for now.
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
            const index = fields[0].toBigInt();
            if (index < 0 || index >= this.keys.length) {
                throw new Error("Invalid variant index");
            }
            const key = this.keys[Number(index)];
            const value = this.provables[this.indices[key]].fromFields(fields.slice(1), aux.slice(1));
            const obj = Object.create(this.prototype);
            return Object.assign(obj, { [key]: value });
        }
        
    }
    return Variant_;
}

export { Variant }

export type { ExactlyOne }