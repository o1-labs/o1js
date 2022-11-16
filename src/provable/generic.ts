export {
  GenericProvable,
  GenericProvablePure,
  GenericProvableExtended,
  GenericHashInput,
  primitiveTypes,
  primitiveTypeMap,
};

type GenericProvable<T, Field> = {
  toFields: (x: T) => Field[];
  toAuxiliary: (x?: T) => any[];
  fromFields: (x: Field[], aux: any[]) => T;
  sizeInFields(): number;
  check: (x: T) => void;
};
interface GenericProvablePure<T, Field> extends GenericProvable<T, Field> {
  toFields: (x: T) => Field[];
  toAuxiliary: (x?: T) => [];
  fromFields: (x: Field[]) => T;
  sizeInFields(): number;
  check: (x: T) => void;
}

type GenericProvableExtended<T, TJson, Field> = GenericProvable<T, Field> & {
  toInput: (x: T) => { fields?: Field[]; packed?: [Field, number][] };
  toJSON: (x: T) => TJson;
};

type GenericHashInput<Field> = { fields?: Field[]; packed?: [Field, number][] };

let emptyType = {
  sizeInFields: () => 0,
  toFields: () => [],
  toAuxiliary: () => [],
  fromFields: () => null,
  check: () => {},
  toInput: () => ({}),
  toJSON: () => null,
};
let primitiveTypes = new Set(['number', 'string', 'null']);

function primitiveTypeMap<Field>(): {
  number: GenericProvableExtended<number, number, Field>;
  string: GenericProvableExtended<string, string, Field>;
  null: GenericProvableExtended<null, null, Field>;
} {
  return {
    number: {
      ...emptyType,
      toAuxiliary: (value = 0) => [value],
      toJSON: (value) => value,
      fromFields: (_, [value]) => value,
    },
    string: {
      ...emptyType,
      toAuxiliary: (value = '') => [value],
      toJSON: (value) => value,
      fromFields: (_, [value]) => value,
    },
    null: emptyType,
  };
}
