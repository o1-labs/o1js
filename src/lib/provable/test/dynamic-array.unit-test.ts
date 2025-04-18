import { UInt8, Field, ZkProgram, Provable } from 'o1js';
import { DynamicArray } from '../dynamic-array.js';
import { assert } from '../gadgets/common.js';
import {
  Spec,
  boolean,
  equivalentAsync,
  fieldWithRng,
} from '../../testing/equivalent.js';
import { Random } from '../../testing/property.js';

let List = ZkProgram({
  name: 'dynamicarrays',
  methods: {
    pushAndPop: {
      privateInputs: [],
      async method() {
        // Define classes of dynamic arrays for specific provable types
        class Bytestring extends DynamicArray(UInt8, { capacity: 8 }) {}

        // Initialize an empty dynamic array
        let bytes = new Bytestring();

        // Initialization should produce right capacity and length
        assert(bytes.capacity === 8);
        assert(bytes.length.equals(new Field(0)));

        // Pushing elements should increase length but keep capacity
        bytes.push(new UInt8(1));
        assert(bytes.length.equals(new Field(1)));
        assert(bytes.capacity === 8);
        assert(bytes.get(new Field(0)).value.equals(new Field(1)));

        // Popping elements should decrease length but keep capacity
        bytes.pop();
        assert(bytes.length.equals(new Field(0)));
        assert(bytes.capacity === 8);

        // Cannot push more elements than the capacity
        for (let i = 0; i < 8; i++) {
          bytes.push(new UInt8(i));
        }
        try {
          bytes.push(new UInt8(8));
        } catch (error) {
          console.log('Cannot push more elements than the capacity');
        }

        // Popping zero elements should not change the array
        bytes.pop(new Field(0));

        // Popping multiple elements should decrease length by the specified amount
        assert(bytes.length.equals(new Field(8)));
        bytes.pop(new Field(8));
        assert(bytes.length.equals(new Field(0)));

        // Cannot pop more elements than the current length
        try {
          bytes.pop();
        } catch (error) {
          console.log('Cannot pop more elements than the length');
        }

        // Empty behaviour should be correct
        assert(bytes.isEmpty().toBoolean());
        bytes.push(new UInt8(1));
        assert(!bytes.isEmpty().toBoolean());

        // Getters and setters for existing positions
        assert(bytes.get(new Field(0)).value.equals(new Field(1)));
        bytes.set(new Field(0), new UInt8(2));
        assert(bytes.get(new Field(0)).value.equals(new Field(2)));
        assert(bytes.length.equals(new Field(1)));

        // getOption returns None for out-of-bounds and Some for in-bounds index
        bytes.getOption(new Field(0)).assertSome();
        bytes.getOption(new Field(1)).assertNone();

        // Error if getting out-of-bounds index
        try {
          bytes.get(new Field(1));
        } catch (error) {
          console.log('Cannot get out-of-bounds index');
        }

        // Error if setting out-of-bounds index
        try {
          bytes.set(new Field(1), new UInt8(3));
        } catch (error) {
          console.log('Cannot set out-of-bounds index');
        }

        // Growing capacity should work correctly
        let longerArray = bytes.growCapacityTo(10);
        assert(longerArray.capacity === 10);
        assert(longerArray.length.equals(new Field(1)));

        // Growing capacity by increment should work correctly
        let sameArray = longerArray.growCapacityBy(0);
        assert(sameArray.capacity === 10);
        assert(sameArray.length.equals(new Field(1)));
        let otherArray = bytes.growCapacityBy(2);
        assert(otherArray.capacity === 10);
        assert(otherArray.length.equals(new Field(1)));

        // Mapping over elements should work correctly
        bytes.push(new UInt8(1));
        bytes.push(new UInt8(0));
        let mapped = bytes.map(UInt8, (value) => value.add(UInt8.from(1)));
        assert(mapped.get(new Field(0)).value.equals(new Field(3)));
        assert(mapped.get(new Field(1)).value.equals(new Field(2)));
        assert(mapped.get(new Field(2)).value.equals(new Field(1)));

        // Reinstantiating the array for further tests
        bytes = new Bytestring();
        for (let i = 0; i < 8; i++) {
          bytes.push(new UInt8(10 + i));
        }

        // Shifting left 0 positions does not change the array
        bytes.shiftLeft(new Field(0));
        assert(bytes.length.equals(new Field(8)));
        for (let i = 0; i < 8; i++) {
          assert(bytes.get(new Field(i)).value.equals(new Field(10 + i)));
        }

        // Checks shifting left elements
        bytes.shiftLeft(new Field(3));
        assert(bytes.length.equals(new Field(5)));
        assert(bytes.get(new Field(0)).value.equals(new Field(13)));
        assert(bytes.get(new Field(1)).value.equals(new Field(14)));
        assert(bytes.get(new Field(2)).value.equals(new Field(15)));
        assert(bytes.get(new Field(3)).value.equals(new Field(16)));
        assert(bytes.get(new Field(4)).value.equals(new Field(17)));
        bytes.getOption(new Field(5)).assertNone();
        bytes.getOption(new Field(6)).assertNone();
        bytes.getOption(new Field(7)).assertNone();

        // Shift left by the length
        bytes.shiftLeft(bytes.length);
        assert(bytes.length.equals(new Field(0)));

        // Cannot shift left more elements than the current length
        try {
          bytes.shiftLeft(new Field(1));
        } catch (error) {
          console.log('Cannot shift left further than the length');
        }

        // Reinstantiating the array for further tests with space for shifting
        bytes = new Bytestring();
        for (let i = 0; i < 5; i++) {
          bytes.push(new UInt8(10 + i));
        }

        // Shifting right 0 positions does not change the array
        bytes.shiftRight(new Field(0));
        assert(bytes.length.equals(new Field(5)));
        for (let i = 0; i < 5; i++) {
          assert(bytes.get(new Field(i)).value.equals(new Field(10 + i)));
        }

        // Checks shifting right elements
        bytes.shiftRight(new Field(2));
        assert(bytes.length.equals(new Field(7)));
        let NULL = new Field(0);
        assert(bytes.get(new Field(0)).value.equals(NULL));
        assert(bytes.get(new Field(1)).value.equals(NULL));
        assert(bytes.get(new Field(2)).value.equals(new Field(10)));
        assert(bytes.get(new Field(3)).value.equals(new Field(11)));
        assert(bytes.get(new Field(4)).value.equals(new Field(12)));
        assert(bytes.get(new Field(5)).value.equals(new Field(13)));
        assert(bytes.get(new Field(6)).value.equals(new Field(14)));
        bytes.getOption(new Field(7)).assertNone();

        // Cannot shift right more elements than the capacity
        try {
          bytes.shiftRight(new Field(2));
        } catch (error) {
          console.log('Cannot shift right above capacity');
        }

        // Slicing [0, length) should return the same array
        bytes = new Bytestring();
        for (let i = 0; i < 4; i++) {
          bytes.push(new UInt8(10 + i));
        }
        let whole = bytes.slice(new Field(0), bytes.length);
        assert(bytes.length.equals(new Field(4)));
        assert(whole.length.equals(bytes.length));
        for (let i = 0; i < 4; i++) {
          assert(
            whole.get(new Field(i)).value.equals(bytes.get(new Field(i)).value)
          );
        }

        // Slicing [0, 0) should return an empty array
        let empty = bytes.slice(new Field(0), new Field(0));
        assert(bytes.length.equals(new Field(4)));
        assert(empty.length.equals(new Field(0)));

        // Slicing [0, 1) should return an array with the first element
        let first = bytes.slice(new Field(0), new Field(1));
        assert(bytes.length.equals(new Field(4)));
        assert(first.length.equals(new Field(1)));
        assert(
          first.get(new Field(0)).value.equals(bytes.get(new Field(0)).value)
        );

        // Slicing intermediate positions should work correctly
        let intermediate = bytes.slice(new Field(1), new Field(3));
        assert(intermediate.length.equals(new Field(2)));
        assert(
          intermediate
            .get(new Field(0))
            .value.equals(bytes.get(new Field(1)).value)
        );
        assert(
          intermediate
            .get(new Field(1))
            .value.equals(bytes.get(new Field(2)).value)
        );

        // Cannot slice out-of-bounds positions
        try {
          bytes.slice(new Field(1), new Field(5));
        } catch (error) {
          console.log('Cannot slice out-of-bounds positions');
        }

        // Cannot slice with end position smaller than start position
        try {
          bytes.slice(new Field(2), new Field(1));
        } catch (error) {
          console.log(
            'Cannot slice with end position smaller than start position'
          );
        }

        // Concatenate two empty arrays gives an empty array
        let emptyLeft = new Bytestring();
        let emptyRight = new Bytestring();
        let emptyConcat = emptyLeft.concat(emptyRight);
        assert(emptyConcat.length.equals(new Field(0)));
        assert(emptyConcat.capacity === 16);

        // Concatenate an empty array with a non-empty array gives the non-empty array
        let right = new Bytestring([
          new UInt8(10),
          new UInt8(20),
          new UInt8(30),
        ]);
        let nonEmptyRight = emptyLeft.concat(right);
        assert(nonEmptyRight.length.equals(new Field(3)));
        assert(nonEmptyRight.capacity === 16);
        for (let i = 0; i < 3; i++) {
          assert(
            nonEmptyRight
              .get(new Field(i))
              .value.equals(right.get(new Field(i)).value)
          );
        }

        // Concatenate a non-empty array with an empty array gives the non-empty array
        let left = new Bytestring([
          new UInt8(1),
          new UInt8(2),
          new UInt8(3),
          new UInt8(4),
          new UInt8(5),
          new UInt8(6),
          new UInt8(7),
          new UInt8(8),
        ]);
        let nonEmptyLeft = left.concat(emptyRight);
        assert(nonEmptyLeft.length.equals(new Field(8)));
        assert(nonEmptyLeft.capacity === 16);
        for (let i = 0; i < 8; i++) {
          assert(
            nonEmptyLeft
              .get(new Field(i))
              .value.equals(left.get(new Field(i)).value)
          );
        }

        // Concatenate two non-empty arrays gives the concatenation of both
        let both = left.concat(right);
        assert(both.length.equals(new Field(11)));
        assert(both.capacity === 16);
        for (let i = 0; i < 8; i++) {
          assert(
            both.get(new Field(i)).value.equals(left.get(new Field(i)).value)
          );
        }
        for (let i = 0; i < 3; i++) {
          assert(
            both
              .get(new Field(i + 8))
              .value.equals(right.get(new Field(i)).value)
          );
        }

        // Inserting elements at the beginning of the array
        bytes = new Bytestring([
          new UInt8(2),
          new UInt8(3),
          new UInt8(4),
          new UInt8(6),
          new UInt8(7),
        ]);
        bytes.insert(new Field(0), new UInt8(1));
        assert(bytes.length.equals(new Field(6)));
        assert(bytes.get(new Field(0)).value.equals(new Field(1)));
        assert(bytes.get(new Field(1)).value.equals(new Field(2)));
        assert(bytes.get(new Field(2)).value.equals(new Field(3)));
        assert(bytes.get(new Field(3)).value.equals(new Field(4)));
        assert(bytes.get(new Field(4)).value.equals(new Field(6)));
        assert(bytes.get(new Field(5)).value.equals(new Field(7)));

        // Inserting elements at the end of the array
        bytes.insert(bytes.length, new UInt8(8));
        assert(bytes.length.equals(new Field(7)));
        assert(bytes.get(new Field(0)).value.equals(new Field(1)));
        assert(bytes.get(new Field(1)).value.equals(new Field(2)));
        assert(bytes.get(new Field(2)).value.equals(new Field(3)));
        assert(bytes.get(new Field(3)).value.equals(new Field(4)));
        assert(bytes.get(new Field(4)).value.equals(new Field(6)));
        assert(bytes.get(new Field(5)).value.equals(new Field(7)));
        assert(bytes.get(new Field(6)).value.equals(new Field(8)));

        // Inserting elements in the middle of the array
        bytes.insert(new Field(4), new UInt8(5));
        assert(bytes.length.equals(new Field(8)));
        for (let i = 0; i < 8; i++) {
          assert(bytes.get(new Field(i)).value.equals(new Field(i + 1)));
        }

        // Cannot insert elements exceeding capacity
        try {
          bytes.insert(new Field(1), new UInt8(0));
        } catch (error) {
          console.log('Cannot insert above capacity');
        }

        // Cannot insert elements out-of-bounds
        bytes = new Bytestring([new UInt8(1), new UInt8(2), new UInt8(3)]);
        try {
          bytes.insert(new Field(4), new UInt8(5));
        } catch (error) {
          console.log('Cannot insert out-of-bounds');
        }
      },
    },
  },
});

let uint = (n: number | bigint): Spec<bigint, Field> => {
  return fieldWithRng(Random.bignat((1n << BigInt(n)) - 1n));
};

await List.compile();

await equivalentAsync({ from: [uint(12)], to: boolean }, { runs: 1 })(
  (_x) => {
    return true;
  },
  async (_x) => {
    let { proof } = await List.pushAndPop();
    return await List.verify(proof);
  }
);
