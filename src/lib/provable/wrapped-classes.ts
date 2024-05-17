import { Bytes as InternalBytes, createBytes } from './bytes.js';

export { Bytes };

type Bytes = InternalBytes;

/**
 * A provable type representing an array of bytes.
 *
 * ```ts
 * class Bytes32 extends Bytes(32) {}
 *
 * let bytes = Bytes32.fromString('deadbeef', 'hex');
 * ```
 */
function Bytes(size: number) {
  return createBytes(size);
}
Bytes.from = InternalBytes.from;
Bytes.fromString = InternalBytes.fromString;
