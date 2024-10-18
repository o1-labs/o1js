import { UInt8, Field } from 'o1js';
import { DynamicArray } from '../dynamic-array.js';
import { assert } from '../gadgets/common.js';

// Define classes of dynamic arrays for specific provable types
let Bytestring = DynamicArray(UInt8, { capacity: 8 });

// Initialize an empty dynamic array
let bytes = new Bytestring();

// Initialization should produce right capacity and length
assert(bytes.capacity === 8);
assert(bytes.length.equals(new Field(0)));

// Pushing elements should increase length but keep capacity
bytes.push(new UInt8(1));
assert(bytes.length.equals(new Field(1)));
assert(bytes.capacity === 8);
//assert(bytes.get(new Field(0)).value.equals(new Field(1)));

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
//bytes.pop(new Field(0));

// Popping multiple elements should decrease length by the specified amount
assert(bytes.length.equals(new Field(8)));
// TODO: substitute for bytes.pop(new Field(8));
bytes.pop();
bytes.pop();
bytes.pop();
bytes.pop();
bytes.pop();
bytes.pop();
bytes.pop();
bytes.pop();
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

// TODO: getters and setters

// TODO: Error if accessing out-of-bounds index

// TODO: getOption returns None for out-of-bounds index and Some for in-bounds index

// TODO: Mapping over elements should work correctly

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
