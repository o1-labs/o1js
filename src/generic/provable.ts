export { GenericProvable, GenericProvableExtended };

type GenericProvable<T, Field> = {
  toFields: (x: T) => Field[];
  toAuxiliary: (x?: T) => any[];
  fromFields: (x: Field[], aux: any[]) => T;
  sizeInFields(): number;
  check: (x: T) => void;
};

type GenericProvableExtended<T, TJson, Field> = GenericProvable<T, Field> & {
  toInput: (x: T) => { fields?: Field[]; packed?: [Field, number][] };
  toJSON: (x: T) => TJson;
};
