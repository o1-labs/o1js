import { expect } from 'expect';
import { BinableUint32, BinableUint64 } from './binable.js';

let uint32s = [0n, 1n, 2n, 10n, 24234098n, 0xffff_ffffn];
let uint64s = [...uint32s, 0x1000_0000_ffff_ffffn, 0xffff_ffff_ffff_ffffn];

for (let uint32 of uint32s) {
  let bytes = BinableUint32.toBytes(uint32);
  let result = BinableUint32.fromBytes(bytes);
  expect(result).toEqual(uint32);
}
for (let uint64 of uint64s) {
  let bytes = BinableUint64.toBytes(uint64);
  let result = BinableUint64.fromBytes(bytes);
  expect(result).toEqual(uint64);
}

let noUint64s = [
  -1n,
  -10n,
  -0xffff_ffff_ffff_ffffn,
  0x1_0000_0000_0000_0000n,
  0x1_2345_789a_bcde_ffffn,
];
let noUint32s = [...noUint64s, 0x1_0000_0000n, 0xffff_ffff_ffffn];

for (let noUint32 of noUint32s) {
  expect(() => BinableUint32.toBytes(noUint32)).toThrow('uint32 out of range');
}
for (let noUint64 of noUint64s) {
  expect(() => BinableUint64.toBytes(noUint64)).toThrow('uint64 out of range');
}
