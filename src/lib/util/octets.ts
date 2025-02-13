import { Field, checkBitLength } from '../provable/field.js';
import { BinableFp } from '../../mina-signer/src/field-bigint.js';
import { UInt8 } from '../provable/int.js';
import { Provable } from '../provable/provable.js';
import { Field3, ForeignField } from '../provable/gadgets/foreign-field.js';
import { assert } from '../provable/gadgets/common.js';
import { l } from '../provable/gadgets/range-check.js';

// internal API
export { Octets };

const Octets = {
  /**
   * Returns an array of {@link UInt8} elements representing this field element
   * as little endian ordered bytes.
   *
   * If the optional `bytelength` argument is used, it proves that the field
   * element fits in `bytelength` bytes. The length has to be between 0 and 32,
   * and the method throws if it isn't.
   *
   * **Warning**: The cost of this operation in a zk proof depends on the
   * `bitlength` you specify, which by default is 32 bytes. Prefer to pass a
   * smaller `length` if possible.
   *
   * @param input - the field element to convert to bytes.
   * @param bytelength - the number of bytes to fit the element. If the element
   *                     does not fit in `length` bits, the functions throws an
   *                     error.
   *
   * @return An array of {@link UInt8} element representing this {@link Field} in
   *         little endian encoding.
   */
  fromField(input: Field, bytelength: number = 32): UInt8[] {
    checkBitLength('Field.toBytes()', bytelength, 32 * 8);
    if (input.isConstant()) {
      let bytes = BinableFp.toBytes(input.toBigInt()).map((b) => new UInt8(b));
      if (bytes.length > bytelength)
        throw Error(`toOctets(): ${input} does not fit in ${bytelength} bytes`);
      return bytes.concat(Array(bytelength - bytes.length).fill(UInt8.from(0)));
    }
    let bytes = Provable.witness(Provable.Array(UInt8, bytelength), () => {
      let x = input.toBigInt();
      return Array.from({ length: bytelength }, (_, k) => new UInt8((x >> BigInt(8 * k)) & 0xffn));
    });
    let field = bytes
      .reverse()
      .map((x) => x.value)
      .reduce((acc, byte) => acc.mul(256).add(byte));

    field.assertEquals(input, `toOctets(): Input does not fit in ${bytelength} bytes`);
    return bytes;
  },
  /**
   * Returns {@link Field} element from the little endian representation of an
   * array of {@link UInt8} elements given as input. It adds necessary checks to
   * the circuit to ensure that the conversion was done correctly.
   *
   * @param x An array of {@link UInt8} element representing this {@link Field}
   *          in little endian encoding.
   *
   * @return The field element will be reduced modulo the native modulus.
   */
  toField(x: UInt8[]): Field {
    return x
      .slice()
      .reverse()
      .map((b) => b.value)
      .reduce((acc, byte) => acc.mul(256).add(byte));
  },

  /**
   * Convert a 3-tuple of Fields to a little-endian array of 32 UInt8s, checking
   * in provable mode that the result is equal to the input.
   */
  fromField3(x: Field3): UInt8[] {
    const limbBytes = Number(l) / 8;
    return [
      this.fromField(x[0], limbBytes),
      this.fromField(x[1], limbBytes),
      this.fromField(x[2], limbBytes),
    ].flat();
  },

  /**
   * Convert a little-endian array of {@link UInt8} to a 3-tuple of Fields.
   * This uses a modulus to reduce the result to fit into the 3 limbs.
   *
   * @param bytes - The little-endian array of bytes to convert to a Field3.
   * @param mod - The modulus to reduce the result to fit into the 3 limbs.
   *
   * @returns The Field3 representation of the input bytes, reduced modulo the given modulus.
   */
  toField3(bytes: UInt8[], mod: bigint): Field3 {
    // TODO: more efficient implementation
    assert(mod < 1n << 259n, 'Foreign modulus must fits in 259 bits');
    return bytes
      .slice() // copy the array to prevent mutation
      .reverse()
      .map((b) => [Field.from(b.value), Field.from(0n), Field.from(0n)] as Field3)
      .reduce((acc, byte) =>
        ForeignField.add(
          ForeignField.mul(Field3.from(acc), Field3.from(256n), mod),
          Field3.from(byte),
          mod
        )
      );
  },
};
