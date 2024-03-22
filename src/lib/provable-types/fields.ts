import { ProvablePureExtended } from './circuit-value.js';
import { Field } from '../field.js';

export { modifiedField, fields };

const zero = new Field(0);

// provable for a single field element

const ProvableField: ProvablePureExtended<Field, string> = {
  sizeInFields: () => 1,
  toFields: (x) => [x],
  toAuxiliary: () => [],
  fromFields: ([x]) => x,
  check: () => {},
  toInput: (x) => ({ fields: [x] }),
  toJSON: Field.toJSON,
  fromJSON: Field.fromJSON,
  empty: () => zero,
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
    toJSON: (x) => x.map(Field.toJSON),
    fromJSON: (x) => x.map(Field.fromJSON),
    empty: () => new Array(length).fill(zero),
  };
}
