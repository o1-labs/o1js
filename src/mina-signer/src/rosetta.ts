import { Binable } from '../../provable/binable.js';
import { PublicKey, Scalar } from '../../provable/curve-bigint.js';
import { Field } from '../../provable/field-bigint.js';

export { publicKeyToHex };

function publicKeyToHex(publicKey: PublicKey) {
  return fieldToHex(Field, publicKey.x, !!publicKey.isOdd);
}

function fieldToHex<T extends Field | Scalar>(
  binable: Binable<T>,
  x: T,
  paddingBit: boolean
) {
  let bytes = binable.toBytes(x);
  // set highest bit (which is empty)
  bytes[bytes.length - 1] &= Number(paddingBit) << 7;
  // map each byte to a hex string of length 2
  return bytes.map((byte) => byte.toString(16)).join('');
}
