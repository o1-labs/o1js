import { provableFromClass } from '../../bindings/lib/provable-snarky.js';
import {
  HashInput,
  ProvableExtended,
  Unconstrained,
} from '../circuit_value.js';
import { Field } from '../field.js';
import { assert } from '../gadgets/common.js';
import { Poseidon, packToFields } from '../hash.js';
import { Provable } from '../provable.js';
import { fields } from './fields.js';

export { Packed };

/**
 * Packed<T> is a "packed" representation of any type T.
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

  constructor(packed: Field[], value: Unconstrained<T>) {
    this.packed = packed;
    this.value = value;
  }

  static pack<T>(x: T): Packed<T> {
    let input = this.innerProvable.toInput(x);
    let packed = packToFields(input);
    return new this(packed, Unconstrained.from(x));
  }

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

  hash() {
    return Poseidon.hash(this.packed);
  }

  static createProvable<T>(
    type: ProvableExtended<T>
  ): ProvableHashable<Packed<T>> {
    let input = type.toInput(type.empty());
    let packedSize = countFields(input);

    return provableFromClass(this, {
      packed: fields(packedSize),
      value: Unconstrained.provable,
    }) as ProvableHashable<Packed<T>>;
  }

  static _provable: ProvableHashable<Packed<any>> | undefined;
  static _innerProvable: ProvableExtended<any> | undefined;

  get Constructor(): typeof Packed {
    return this.constructor as typeof Packed;
  }

  static get provable(): ProvableHashable<Packed<any>> {
    assert(this._provable !== undefined, 'Packed not initialized');
    return this._provable;
  }
  static get innerProvable(): ProvableExtended<any> {
    assert(this._innerProvable !== undefined, 'Packed not initialized');
    return this._innerProvable;
  }

  static create<T>(type: ProvableExtended<T>): typeof Packed<T> {
    return class Packed_ extends Packed<T> {
      static _provable = Packed_.createProvable(type);
      static _innerProvable = type;
    };
  }
}

type ProvableHashable<T> = Provable<T> & { toInput: (x: T) => HashInput };

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
