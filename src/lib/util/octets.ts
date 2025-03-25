import { UInt8 } from '../provable/int.js';
import { assert } from '../provable/gadgets/common.js';

export { Octets };

const Octets = {
  /**
   * Convert a bigint to a little-endian array of {@link UInt8} elements.
   *
   * @param x
   * @param byteLength by default 32 bytes
   * @returns
   */
  fromBigint(x: bigint, byteLength: number = 32): UInt8[] {
    assert(x < 1n << BigInt(byteLength * 8), 'Input does not fit in byteLength');
    let bytes = Array.from(
      { length: byteLength },
      (_, k) => new UInt8((x >> BigInt(8 * k)) & 0xffn)
    );
    return bytes;
  },
};
