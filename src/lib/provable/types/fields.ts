import { ProvablePureExtended } from './struct.js';
import type { Field } from '../field.js';
import { createField, getField } from '../core/field-constructor.js';

export { modifiedField, fields };

// provable for a single field element

const ProvableField: ProvablePureExtended<Field, string> = {
  sizeInFields: () => 1,
  toFields: (x) => [x],
  toAuxiliary: () => [],
  fromFields: ([x]) => x,
  check: () => {},
  toInput: (x) => ({ fields: [x] }),
  toJSON: (x) => getField().toJSON(x),
  fromJSON: (x) => getField().fromJSON(x),
  empty: () => createField(0),
};

function modifiedField(
  methods: Partial<ProvablePureExtended<Field, string>>
): ProvablePureExtended<Field, string> {
  return Object.assign({}, ProvableField, methods);
}

// provable for a fixed-size array of field elements

let id = <T>(t: T) => t;

function fields(length: number): ProvablePureExtended<Field[], string[]> {
  return {
    sizeInFields: () => length,
    toFields: id,
    toAuxiliary: () => [],
    fromFields: id,
    check: () => {},
    toInput: (x) => ({ fields: x }),
    toJSON: (x) => x.map(getField().toJSON),
    fromJSON: (x) => x.map(getField().fromJSON),
    empty: () => {
      let zero = createField(0);
      return new Array(length).fill(zero);
    },
  };
}
