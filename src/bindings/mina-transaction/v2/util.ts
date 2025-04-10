import { Field } from '../../../lib/provable/field.js';
import { Provable } from '../../../lib/provable/provable.js';
import { HashInput } from '../../../lib/provable/types/provable-derivers.js'

export type ProvableSerializable<T, Val = any> = Provable<T, Val> & {
  toJSON(x: T): any;
  toInput(x: T): HashInput;
};

// TODO: refactor Provable to use this kind of an interface (will save a lot of array slicing)
// TODO: this could also handle aux data in addition to fields
export class FieldsDecoder {
  constructor(
    private fields: Field[],
    private index: number = 0
  ) {}

  decode<T>(size: number, f: (subFields: Field[]) => T): T {
    const subFields = this.fields.slice(this.index, this.index + size);
    this.index += size;
    return f(subFields);
  }
}

