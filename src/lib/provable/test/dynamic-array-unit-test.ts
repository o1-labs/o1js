import { UInt8, Field, ZkProgram } from 'o1js';
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
          bytes.push(new UInt8(1 + i));
        }

        // Shifting elements does not change the array
        bytes.shiftLeft(new Field(0));
        assert(bytes.length.equals(new Field(8)));
        for (let i = 0; i < 8; i++) {
          assert(bytes.get(new Field(i)).value.equals(new Field(1 + i)));
        }

        // Checks shifting elements
        bytes.shiftLeft(new Field(3));
        assert(bytes.length.equals(new Field(5)));
        assert(bytes.get(new Field(0)).value.equals(new Field(4)));
        assert(bytes.get(new Field(1)).value.equals(new Field(5)));
        assert(bytes.get(new Field(2)).value.equals(new Field(6)));
        assert(bytes.get(new Field(3)).value.equals(new Field(7)));
        assert(bytes.get(new Field(4)).value.equals(new Field(8)));
        bytes.getOption(new Field(5)).assertNone();
        bytes.getOption(new Field(6)).assertNone();
        bytes.getOption(new Field(7)).assertNone();

        // Shift left by the length
        bytes.shiftLeft(bytes.length);
        assert(bytes.length.equals(new Field(0)));

        // Cannot shift more elements than the current length
        try {
          bytes.shiftLeft(new Field(1));
        } catch (error) {
          console.log('Cannot shift more elements than the length');
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
    let proof = await List.pushAndPop();
    return await List.verify(proof);
  }
);
