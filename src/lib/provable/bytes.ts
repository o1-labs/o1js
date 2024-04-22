import { provableFromClass } from './types/provable-derivers.js';
import type { ProvablePureExtended } from './types/struct.js';
import { assert } from './gadgets/common.js';
import { chunkString } from '../util/arrays.js';
import { Provable } from './provable.js';
import { UInt8 } from './int.js';
import { randomBytes } from '../../bindings/crypto/random.js';

// external API
export { Bytes };

// internal API
export { createBytes, FlexibleBytes };

type FlexibleBytes = Bytes | (UInt8 | bigint | number)[] | Uint8Array;

/**
 * A provable type representing an array of bytes.
 */
class Bytes {
  bytes: UInt8[];

  constructor(bytes: UInt8[]) {
    let size = (this.constructor as typeof Bytes).size;

    // assert that data is not too long
    assert(
      bytes.length <= size,
      `Expected at most ${size} bytes, got ${bytes.length}`
    );

    // pad the data with zeros
    let padding = Array.from(
      { length: size - bytes.length },
      () => new UInt8(0)
    );
    this.bytes = bytes.concat(padding);
  }

  /**
   * Coerce the input to {@link Bytes}.
   *
   * Inputs smaller than `this.size` are padded with zero bytes.
   */
  static from(data: (UInt8 | bigint | number)[] | Uint8Array | Bytes): Bytes {
    if (data instanceof Bytes) return data;
    if (this._size === undefined) {
      let Bytes_ = createBytes(data.length);
      return Bytes_.from(data);
    }
    return new this([...data].map(UInt8.from));
  }

  toBytes(): Uint8Array {
    return Uint8Array.from(this.bytes.map((x) => x.toNumber()));
  }

  toFields() {
    return this.bytes.map((x) => x.value);
  }

  /**
   * Create {@link Bytes} from a string.
   *
   * Inputs smaller than `this.size` are padded with zero bytes.
   */
  static fromString(s: string) {
    let bytes = new TextEncoder().encode(s);
    return this.from(bytes);
  }

  /**
   * Create random {@link Bytes} using secure builtin randomness.
   */
  static random() {
    let bytes = randomBytes(this.size);
    return this.from(bytes);
  }

  /**
   * Create {@link Bytes} from a hex string.
   *
   * Inputs smaller than `this.size` are padded with zero bytes.
   */
  static fromHex(xs: string): Bytes {
    let bytes = chunkString(xs, 2).map((s) => parseInt(s, 16));
    return this.from(bytes);
  }

  /**
   * Convert {@link Bytes} to a hex string.
   */
  toHex(): string {
    return this.bytes
      .map((x) => x.toBigInt().toString(16).padStart(2, '0'))
      .join('');
  }

  // dynamic subclassing infra
  static _size?: number;
  static _provable?: ProvablePureExtended<
    Bytes,
    { bytes: { value: string }[] }
  >;

  /**
   * The size of the {@link Bytes}.
   */
  static get size() {
    assert(this._size !== undefined, 'Bytes not initialized');
    return this._size;
  }

  get length() {
    return this.bytes.length;
  }

  /**
   * `Provable<Bytes>`
   */
  static get provable() {
    assert(this._provable !== undefined, 'Bytes not initialized');
    return this._provable;
  }
}

function createBytes(size: number): typeof Bytes {
  return class Bytes_ extends Bytes {
    static _size = size;
    static _provable = provableFromClass(Bytes_, {
      bytes: Provable.Array(UInt8, size),
    });
  };
}
