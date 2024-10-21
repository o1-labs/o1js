import { Bytes as InternalBytes, createBytes } from './bytes.js';

export { Bytes };

type Bytes = InternalBytes;

/**
 * A provable type representing an array of bytes.
 *
 * ```ts
 * class Bytes32 extends Bytes(32) {}
 *
 * let bytes = Bytes32.fromHex('deadbeef');
 * ```
 */
function Bytes(size: number) {
  return createBytes(size);
}
Bytes.from = InternalBytes.from;
Bytes.fromHex = InternalBytes.fromHex;
Bytes.fromString = InternalBytes.fromString;

// expore base class so that we can detect Bytes with `instanceof`
Bytes.Base = InternalBytes;
