import {
  HashInput,
  InferProvable,
  ProvableExtended,
  Unconstrained,
  provable,
} from '../circuit_value.js';
import { Field } from '../field.js';
import { Poseidon, packToFields } from '../hash.js';
import { Provable } from '../provable.js';
import { fields } from './fields.js';

export { provablePacked, Packed };

class Packed<T> {
  packed: Field[];
  value: Unconstrained<T>;
  type: ProvableExtended<T>;

  private constructor(
    packed: Field[],
    value: Unconstrained<T>,
    type: ProvableExtended<T>
  ) {
    this.packed = packed;
    this.value = value;
    this.type = type;
  }

  static pack<T>(type: ProvableExtended<T>, x: T): Packed<T> {
    let input = type.toInput(x);
    let packed = packToFields(input);
    return new Packed(packed, Unconstrained.from(x), type);
  }

  unpack(): T {
    let value = Provable.witness(this.type, () => this.value.get());

    // prove that the value packs to the packed fields
    let input = this.type.toInput(value);
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
}

type PackedBase<T> = { packed: Field[]; value: Unconstrained<T> };

type ProvableHashable<T> = Provable<T> & { toInput: (x: T) => HashInput };

function provablePacked<A extends ProvableExtended<any>>(
  type: A
): ProvableHashable<PackedBase<InferProvable<A>>> {
  // compute packed size
  let input = type.toInput(type.empty());
  let packedSize = countFields(input);

  return provable({
    packed: fields(packedSize),
    value: Unconstrained.provable,
  });
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
