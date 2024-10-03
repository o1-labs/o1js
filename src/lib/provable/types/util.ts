import { createField } from '../core/field-constructor.js';
import { ProvableType } from './provable-intf.js';
import { witness } from './witness.js';

export { emptyValue, emptyWitness };

function emptyValue<T>(type: ProvableType<T>) {
  let provable = ProvableType.get(type);
  return provable.fromFields(
    Array(provable.sizeInFields()).fill(createField(0)),
    provable.toAuxiliary()
  );
}

function emptyWitness<T>(type: ProvableType<T>) {
  return witness(type, () => emptyValue(type));
}
