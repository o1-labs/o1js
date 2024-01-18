import {
  HashInput,
  InferProvable,
  ProvableExtended,
  Unconstrained,
  provable,
} from '../circuit_value.js';
import { Field } from '../field.js';
import { Provable } from '../provable.js';
import { fields } from './fields.js';

export { provablePacked, Packed };

type Packed<T> = { packed: Field[]; value: Unconstrained<T> };

type ProvableHashable<T> = Provable<T> & { toInput: (x: T) => HashInput };

function provablePacked<A extends ProvableExtended<any>>(
  type: A
): ProvableHashable<Packed<InferProvable<A>>> {
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
