import { ProvablePureExtendedBn254 } from '../circuit-value-bn254.js';
import { FieldBn254 } from '../field-bn254.js';

export { modifiedField, fields };

const zero = new FieldBn254(0);

// provable for a single field element

const ProvableField: ProvablePureExtendedBn254<FieldBn254, string> = {
  sizeInFields: () => 1,
  toFields: (x) => [x],
  toAuxiliary: () => [],
  fromFields: ([x]) => x,
  check: () => { },
  toInput: (x) => ({ fields: [x] }),
  toJSON: FieldBn254.toJSON,
  fromJSON: FieldBn254.fromJSON,
  empty: () => zero,
};

function modifiedField(
  methods: Partial<ProvablePureExtendedBn254<FieldBn254, string>>
): ProvablePureExtendedBn254<FieldBn254, string> {
  return Object.assign({}, ProvableField, methods);
}

// provable for a fixed-size array of field elements

let id = <T>(t: T) => t;

function fields(length: number): ProvablePureExtendedBn254<FieldBn254[], string[]> {
  return {
    sizeInFields: () => length,
    toFields: id,
    toAuxiliary: () => [],
    fromFields: id,
    check: () => { },
    toInput: (x) => ({ fields: x }),
    toJSON: (x) => x.map(FieldBn254.toJSON),
    fromJSON: (x) => x.map(FieldBn254.fromJSON),
    empty: () => new Array(length).fill(zero),
  };
}
