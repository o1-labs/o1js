import { Binable } from './binable.js';

export {
  GenericProvable,
  GenericProvablePure,
  GenericProvableExtended,
  GenericField,
  GenericBool,
  GenericHashInput,
  primitiveTypes,
  primitiveTypeMap,
  EmptyNull,
  EmptyUndefined,
  EmptyVoid,
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
  fromJSON: (x: TJson) => T;
  emptyValue?: () => T;
};

type GenericField<Field> = ((value: number | string | bigint) => Field) &
  GenericProvableExtended<Field, string, Field> &
  Binable<Field> & { sizeInBytes(): number };
type GenericBool<Field, Bool = unknown> = ((value: boolean) => Bool) &
  GenericProvableExtended<Bool, boolean, Field> &
  Binable<Bool> & { sizeInBytes(): number };

type GenericHashInput<Field> = { fields?: Field[]; packed?: [Field, number][] };

const emptyType = {
  sizeInFields: () => 0,
  toFields: () => [],
  toAuxiliary: (): [] => [],
  fromFields: () => null,
  check: () => {},
  toInput: () => ({}),
  toJSON: () => null,
  fromJSON: () => null,
};

const undefinedType = {
  ...emptyType,
  fromFields: () => undefined,
  toJSON: () => null,
  fromJSON: () => undefined,
};

let primitiveTypes = new Set(['number', 'string', 'null']);

function EmptyNull<Field>(): GenericProvableExtended<null, null, Field> &
  GenericProvablePure<null, Field> {
  return emptyType;
}
function EmptyUndefined<Field>(): GenericProvableExtended<
  undefined,
  null,
  Field
> &
  GenericProvablePure<undefined, Field> {
  return undefinedType;
}
function EmptyVoid<Field>(): GenericProvableExtended<void, null, Field> &
  GenericProvablePure<void, Field> {
  return undefinedType;
}

function primitiveTypeMap<Field>(): {
  number: GenericProvableExtended<number, number, Field>;
  string: GenericProvableExtended<string, string, Field>;
  null: GenericProvableExtended<null, null, Field>;
} {
  return primitiveTypeMap_;
}

const primitiveTypeMap_: {
  number: GenericProvableExtended<number, number, any>;
  string: GenericProvableExtended<string, string, any>;
  null: GenericProvableExtended<null, null, any>;
} = {
  number: {
    ...emptyType,
    toAuxiliary: (value = 0) => [value],
    toJSON: (value) => value,
    fromJSON: (value) => value,
    fromFields: (_, [value]) => value,
  },
  string: {
    ...emptyType,
    toAuxiliary: (value = '') => [value],
    toJSON: (value) => value,
    fromJSON: (value) => value,
    fromFields: (_, [value]) => value,
  },
  null: emptyType,
};
