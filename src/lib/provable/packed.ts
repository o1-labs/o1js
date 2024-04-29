import { provableFromClass } from './types/provable-derivers.js';
import { HashInput, ProvableExtended } from './types/struct.js';
import { Unconstrained } from './types/unconstrained.js';
import { Field } from './field.js';
import { assert } from './gadgets/common.js';
import { Poseidon, ProvableHashable, packToFields } from './crypto/poseidon.js';
import { Provable } from './provable.js';
import { fields, modifiedField } from './types/fields.js';

export { Packed, Hashed };

/**
 * `Packed<T>` is a "packed" representation of any type `T`.
 *
 * "Packed" means that field elements which take up fewer than 254 bits are packed together into
 * as few field elements as possible.
 *
 * For example, you can pack several Bools (1 bit) or UInt32s (32 bits) into a single field element.
 *
 * Using a packed representation can make sense in provable code where the number of constraints
 * depends on the number of field elements per value.
 *
 * For example, `Provable.if(bool, x, y)` takes O(n) constraints, where n is the number of field
 * elements in x and y.
 *
 * Usage:
 *
 * ```ts
 * // define a packed type from a type
 * let PackedType = Packed.create(MyType);
 *
 * // pack a value
 * let packed = PackedType.pack(value);
 *
 * // ... operations on packed values, more efficient than on plain values ...
 *
 * // unpack a value
 * let value = packed.unpack();
 * ```
 *
 * **Warning**: Packing only makes sense where packing actually reduces the number of field elements.
 * For example, it doesn't make sense to pack a _single_ Bool, because it will be 1 field element before
 * and after packing. On the other hand, it does makes sense to pack a type that holds 10 or 20 Bools.
 */
class Packed<T> {
  packed: Field[];
  value: Unconstrained<T>;

  /**
   * Create a packed representation of `type`. You can then use `PackedType.pack(x)` to pack a value.
   */
  static create<T>(type: ProvableExtended<T>): typeof Packed<T> & {
    provable: ProvableHashable<Packed<T>>;
  } {
    // compute size of packed representation
    let input = type.toInput(type.empty());
    let packedSize = countFields(input);

    return class Packed_ extends Packed<T> {
      static _innerProvable = type;
      static _provable = provableFromClass(Packed_, {
        packed: fields(packedSize),
        value: Unconstrained.provable,
      }) as ProvableHashable<Packed<T>>;

      static empty(): Packed<T> {
        return Packed_.pack(type.empty());
      }

      static get provable() {
        assert(this._provable !== undefined, 'Packed not initialized');
        return this._provable;
      }
    };
  }

  constructor(packed: Field[], value: Unconstrained<T>) {
    this.packed = packed;
    this.value = value;
  }

  /**
   * Pack a value.
   */
  static pack<T>(x: T): Packed<T> {
    let type = this.innerProvable;
    let input = type.toInput(x);
    let packed = packToFields(input);
    let unconstrained = Unconstrained.witness(() =>
      Provable.toConstant(type, x)
    );
    return new this(packed, unconstrained);
  }

  /**
   * Unpack a value.
   */
  unpack(): T {
    let value = Provable.witness(this.Constructor.innerProvable, () =>
      this.value.get()
    );

    // prove that the value packs to the packed fields
    let input = this.Constructor.innerProvable.toInput(value);
    let packed = packToFields(input);
    for (let i = 0; i < this.packed.length; i++) {
      this.packed[i].assertEquals(packed[i]);
    }

    return value;
  }

  toFields(): Field[] {
    return this.packed;
  }

  // dynamic subclassing infra
  static _provable: ProvableHashable<Packed<any>> | undefined;
  static _innerProvable: ProvableExtended<any> | undefined;

  get Constructor(): typeof Packed {
    return this.constructor as typeof Packed;
  }

  static get innerProvable(): ProvableExtended<any> {
    assert(this._innerProvable !== undefined, 'Packed not initialized');
    return this._innerProvable;
  }
}

function countFields(input: HashInput) {
  let n = input.fields?.length ?? 0;
  let pendingBits = 0;

  for (let [, bits] of input.packed ?? []) {
    pendingBits += bits;
    if (pendingBits >= Field.sizeInBits) {
      n++;
      pendingBits = bits;
    }
  }
  if (pendingBits > 0) n++;

  return n;
}

/**
 * `Hashed<T>` represents a type `T` by its hash.
 *
 * Since a hash is only a single field element, this can be more efficient in provable code
 * where the number of constraints depends on the number of field elements per value.
 *
 * For example, `Provable.if(bool, x, y)` takes O(n) constraints, where n is the number of field
 * elements in x and y. With Hashed, this is reduced to O(1).
 *
 * The downside is that you will pay the overhead of hashing your values, so it helps to experiment
 * in which parts of your code a hashed representation is beneficial.
 *
 * Usage:
 *
 * ```ts
 * // define a hashed type from a type
 * let HashedType = Hashed.create(MyType);
 *
 * // hash a value
 * let hashed = HashedType.hash(value);
 *
 * // ... operations on hashes, more efficient than on plain values ...
 *
 * // unhash to get the original value
 * let value = hashed.unhash();
 * ```
 */
class Hashed<T> {
  hash: Field;
  value: Unconstrained<T>;

  /**
   * Create a hashed representation of `type`. You can then use `HashedType.hash(x)` to wrap a value in a `Hashed`.
   */
  static create<T>(
    type: ProvableHashable<T>,
    hash?: (t: T) => Field
  ): typeof Hashed<T> & {
    provable: ProvableHashable<Hashed<T>>;
  } {
    let _hash = hash ?? ((t: T) => Poseidon.hashPacked(type, t));

    return class Hashed_ extends Hashed<T> {
      static _innerProvable = type;
      static _provable = provableFromClass(Hashed_, {
        hash: modifiedField({ empty: () => _hash(type.empty()) }),
        value: Unconstrained.provable,
      }) as ProvableHashable<Hashed<T>>;

      static _hash = _hash satisfies (t: T) => Field;

      static empty(): Hashed<T> {
        let empty = type.empty();
        return new this(_hash(empty), Unconstrained.from(empty));
      }

      static get provable() {
        assert(this._provable !== undefined, 'Hashed not initialized');
        return this._provable;
      }
    };
  }

  constructor(hash: Field, value: Unconstrained<T>) {
    this.hash = hash;
    this.value = value;
  }

  static _hash(_: any): Field {
    assert(false, 'Hashed not initialized');
  }

  /**
   * Wrap a value, and represent it by its hash in provable code.
   *
   * ```ts
   * let hashed = HashedType.hash(value);
   * ```
   *
   * Optionally, if you already have the hash, you can pass it in and avoid recomputing it.
   */
  static hash<T>(value: T, hash?: Field): Hashed<T> {
    hash ??= this._hash(value);
    let unconstrained = Unconstrained.witness(() =>
      Provable.toConstant(this.innerProvable, value)
    );
    return new this(hash, unconstrained);
  }

  /**
   * Unwrap a value from its hashed variant.
   */
  unhash(): T {
    let value = Provable.witness(this.Constructor.innerProvable, () =>
      this.value.get()
    );

    // prove that the value hashes to the hash
    let hash = this.Constructor._hash(value);
    this.hash.assertEquals(hash);

    return value;
  }

  toFields(): Field[] {
    return [this.hash];
  }

  // dynamic subclassing infra
  static _provable: ProvableHashable<Hashed<any>> | undefined;
  static _innerProvable: ProvableHashable<any> | undefined;

  get Constructor(): typeof Hashed {
    return this.constructor as typeof Hashed;
  }

  static get innerProvable(): ProvableHashable<any> {
    assert(this._innerProvable !== undefined, 'Hashed not initialized');
    return this._innerProvable;
  }
}
