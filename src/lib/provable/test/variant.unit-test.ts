import { expect } from "expect";
import { Struct, Variant, ExactlyOne, Field, UInt8, CircuitString, UInt32, Provable } from "../../../index.js";
import { describe, it } from "node:test";

type PriceVariants = {
    btc: Field;
    eth: Field;
    mina: Field;
    usdc: Field;
};

// NOTE: sizeInFields is 2.
class Price extends Variant({
    btc: Field,
    eth: Field,
    mina: Field,
    usdc: Field,
}) {}

describe("Variant (Price)", () => {
    it("has the right sizeInFields", () => {
        expect(Price.sizeInFields()).toBe(2);
    });

    it("can be constructed with a single value", () => {
        const price: ExactlyOne<PriceVariants> = { mina: Field(100) };
        expect(price.mina).toEqual(Field(100));
    });

    it("can be converted to fields", () => {
        const price: ExactlyOne<PriceVariants> = { btc: Field(50) };
        expect(Price.toFields(price)).toEqual([Field(0), Field(50)]);
    });

    it("round trips through toFields/fromFields", () => {
        const price: ExactlyOne<PriceVariants> = { eth: Field(200) };
        const fields = Price.toFields(price);
        const aux = Price.toAuxiliary(price);
        const reconstructed = Price.fromFields(fields, aux);
        expect(Price.toFields(reconstructed)).toEqual(fields);
        expect(reconstructed).toEqual(price);
    });

    it("round trips through toJSON/fromJSON", () => {
        const price: ExactlyOne<PriceVariants> = { usdc: Field(1000) };
        const json = Price.toJSON(price);
        expect(price).toEqual(Price.fromJSON(json));
    });
});

type RgbVariants = {
    r: UInt8;
    g: UInt8;
    b: UInt8;
};

class Rgb extends Struct({
    r: UInt8,
    g: UInt8,
    b: UInt8,
}) {}

class ColorVariants {
    rgb: Rgb;
    named: CircuitString;
}

class Color extends Variant({
    rgb: Rgb,
    named: CircuitString,
}) {}

describe("Variant (Color)", () => {
    it("round trips an rgb through toFields/fromFields", () => {
        const color: ExactlyOne<ColorVariants> = { rgb: new Rgb({ r: new UInt8(255), g: new UInt8(0), b: new UInt8(127) }) };
        const fields = Color.toFields(color);
        const aux = Color.toAuxiliary(color);
        const reconstructed = Color.fromFields(fields, aux);
        expect(Color.toFields(reconstructed)).toEqual(fields);
        expect(reconstructed).toEqual(color);
    });

    it("round trips a named color through toFields/fromFields", () => {
        const color: ExactlyOne<ColorVariants> = { named: CircuitString.fromString("magenta") };
        const fields = Color.toFields(color);
        const aux = Color.toAuxiliary(color);
        const reconstructed = Color.fromFields(fields, aux);
        expect(Color.toFields(reconstructed)).toEqual(fields);
        expect(reconstructed).toEqual(color);
    });

    it("Can be matched on exhaustively as an Rgb", () => {
        const color1: ExactlyOne<ColorVariants> = { rgb: new Rgb({ r: new UInt8(255), g: new UInt8(0), b: new UInt8(127) }) };
        expect(Color.match(color1, UInt8, {
            rgb: ({r, g, b}) => r,
            named: (cs: CircuitString) => Provable.if(cs.equals(CircuitString.fromString("black")), UInt8, new UInt8(0), new UInt8(100))
        })).toEqual(new UInt8(255));
    });

    it("Can be matched on exhaustively as a named color", () => {
        const color2: ExactlyOne<ColorVariants> = { named: CircuitString.fromString("black") };
        const color3: ExactlyOne<ColorVariants> = { named: CircuitString.fromString("other") };
        const getRedness = (c: ExactlyOne<ColorVariants>) => Color.match(c, UInt8, {
            rgb: ({r, g, b}) => r,
            named: (cs: CircuitString) => Provable.if(cs.equals(CircuitString.fromString("black")), UInt8, new UInt8(0), new UInt8(100))
        });

        expect(getRedness(color2)).toEqual(new UInt8(0));
        expect(getRedness(color3)).toEqual(new UInt8(100));
    });

});

class SimpleTextProperties extends Struct({
    text: CircuitString,
    color: Color,
    fontSize: UInt32,
}) {}

describe("Variant (in a Struct)", () => {
    it("has the correct sizeInFields(), namely the sum of its parts", () => {
        expect(SimpleTextProperties.sizeInFields() === CircuitString.sizeInFields() + Color.sizeInFields() + UInt32.sizeInFields())
    });

    it("works as the middle field of a Struct, rounding tripping through toFields/fromFields", () => {
        const plainText = new SimpleTextProperties({
            text: CircuitString.fromString("hello, world!"),
            color: { rgb: new Rgb({ r: new UInt8(0), g: new UInt8(0), b: new UInt8(0) })},
            fontSize: new UInt32(32)
        });
        const fields = SimpleTextProperties.toFields(plainText);
        const aux = SimpleTextProperties.toAuxiliary(plainText);
        const reconstructed = SimpleTextProperties.fromFields(fields, aux);
        expect(SimpleTextProperties.toFields(reconstructed)).toEqual(fields);
        expect(reconstructed).toEqual(plainText);
    });
});
