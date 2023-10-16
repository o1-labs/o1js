import { Field } from '../field.js';
import { Provable } from '../provable.js';
import { Field as Fp } from '../../provable/field-bigint.js';
import * as Gates from '../gates.js';

export { rot };

type RotationMode = 'left' | 'right';

function rot(word: Field, mode: RotationMode, bits: number) {
  // Check that the rotation bits are in range
  checkBits(bits);

  if (word.isConstant()) {
    return rot_constant(word, mode, bits);
  } else {
    return rot_provable(word, mode, bits);
  }
}

function checkBits(bits: number) {
  if (bits < 0 || bits > 64) {
    throw Error(`rot: expected bits to be between 0 and 64, got ${bits}`);
  }
}

function rot_constant(word: Field, mode: RotationMode, bits: number) {
  let x = word.toBigInt();
  if (mode === 'left') {
    return (x << BigInt(bits)) % (1n << 64n);
  } else {
    return (x >> BigInt(bits)) % (1n << 64n);
  }
}

function rot_provable(word: Field, mode: RotationMode, bits: number) {
  // Check that the input word is at most 64 bits.
  // Compute actual length depending on whether the rotation mode is "left" or "right"
  // Auxiliary BigInt values
  // Compute rotated word
  // Compute current row
  // Compute next row
  // Compute following row
}
