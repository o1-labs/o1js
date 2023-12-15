import { expect } from "expect";
import { ForeignGroup } from "./elliptic-curve.js";
import { createForeignField } from "./foreign-field.js";

class TestForeignField extends createForeignField(5n) { }

// error: This function can't be run outside of a checked computation

{
    ForeignGroup.curve = ["0x0", "0x2", "0x2523648240000001BA344D80000000086121000000000013A700000000000013", "0x2523648240000001BA344D80000000086121000000000013A700000000000012", "0x1", "0x2523648240000001BA344D8000000007FF9F800000000010A10000000000000D"];
    let left = new ForeignGroup(new TestForeignField(4), new TestForeignField(1));
    let right = new ForeignGroup(new TestForeignField(0), new TestForeignField(3));
    let expected = new ForeignGroup(new TestForeignField(1), new TestForeignField(2));

    let addition = left.add(right);
    console.log(addition);
    console.log(expected);

    expect(addition).toEqual(expected);
}
