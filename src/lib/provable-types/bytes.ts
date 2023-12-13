import { provableFromClass } from '../../bindings/lib/provable-snarky.js';
import { ProvablePureExtended } from '../circuit_value.js';
import { assert } from '../gadgets/common.js';
import { chunkString } from '../util/arrays.js';
import { Provable } from '../provable.js';
import { UInt8 } from '../int.js';

export { Bytes, createBytes };

/**
 * A provable type representing an array of bytes.
 */
class Bytes {
  data: UInt8[];

  constructor(data: UInt8[]) {
    let size = (this.constructor as typeof Bytes).size;

    // assert that data is not too long
    assert(
      data.length < size,
      `Expected at most ${size} bytes, got ${data.length}`
    );

    // pad the data with zeros
    let padding = Array.from(
      { length: size - data.length },
      () => new UInt8(0)
    );
    this.data = data.concat(padding);
  }

  /**
   * Coerce the input to {@link Bytes}.
   *
   * Inputs smaller than `this.size` are padded with zero bytes.
   */
  static from(data: (UInt8 | bigint | number)[] | Uint8Array) {
    return new this([...data].map(UInt8.from));
  }

  toBytes(): Uint8Array {
    return Uint8Array.from(this.data.map((x) => x.toNumber()));
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
  toHex(xs: Bytes): string {
    return xs.data
      .map((x) => x.toBigInt().toString(16).padStart(2, '0'))
      .join('');
  }

  // dynamic subclassing infra
  static _size?: number;
  static _provable?: ProvablePureExtended<Bytes, { data: { value: string }[] }>;

  /**
   * The size of the {@link Bytes}.
   */
  static get size() {
    assert(this._size !== undefined, 'Bytes not initialized');
    return this._size;
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
      data: Provable.Array(UInt8, size),
    });
  };
}
