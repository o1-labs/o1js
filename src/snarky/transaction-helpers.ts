import { ProvableExtended } from '../lib/circuit_value.js';

export { ProvableExtended, ProvableFromLayout };

export { GenericLayout };

type GenericTypeMap<
  Field,
  Bool,
  UInt32,
  UInt64,
  Sign,
  PublicKey,
  AuthRequired,
  AuthorizationKind,
  TokenId,
  Undefined
> = {
  Field: Field;
  Bool: Bool;
  UInt32: UInt32;
  UInt64: UInt64;
  Sign: Sign;
  PublicKey: PublicKey;
  AuthRequired: AuthRequired;
  AuthorizationKind: AuthorizationKind;
  TokenId: TokenId;
  // builtin
  number: number;
  null: null;
  undefined: Undefined;
  string: string;
};
type AnyTypeMap = GenericTypeMap<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;
type TypeMapValues<TypeMap extends AnyTypeMap, JsonMap extends AnyTypeMap> = {
  [K in keyof TypeMap & keyof JsonMap]: ProvableExtended<
    TypeMap[K],
    JsonMap[K]
  >;
};

function ProvableFromLayout<
  TypeMap extends AnyTypeMap,
  JsonMap extends AnyTypeMap
>(TypeMap: TypeMapValues<TypeMap, JsonMap>) {
  type Field = TypeMap['Field'];
  type CustomTypes = Record<string, ProvableExtended<any, any>>;
  type HashInput = { fields?: Field[]; packed?: [Field, number][] };
  type Layout = GenericLayout<TypeMap>;

  function provableFromLayout<T, TJson>(
    typeData: Layout,
    customTypes: CustomTypes
  ) {
    return {
      sizeInFields(): number {
        return sizeInFields(typeData, customTypes);
      },
      toFields(value: T): Field[] {
        return toFields(typeData, value, customTypes);
      },
      toAuxiliary(value?: T): any[] {
        return toAuxiliary(typeData, value, customTypes);
      },
      fromFields(fields: Field[], aux: any[]): T {
        return fromFields(typeData, fields, aux, customTypes);
      },
      toJSON(value: T): TJson {
        return toJSON(typeData, value, customTypes);
      },
      check(value: T): void {
        check(typeData, value, customTypes);
      },
      toInput(value: T): HashInput {
        return toInput(typeData, value, customTypes);
      },
    };
  }

  function toJSON(typeData: Layout, value: any, customTypes: CustomTypes) {
    return layoutFold<any, any>(
      {
        map(type, value) {
          return type.toJSON(value);
        },
        reduceArray(array) {
          return array;
        },
        reduceObject(_, object) {
          return object;
        },
        reduceFlaggedOption({ isSome, value }) {
          return isSome ? value : null;
        },
        reduceOrUndefined(value) {
          return value ?? null;
        },
        customTypes,
      },
      typeData,
      value
    );
  }

  function toFields(typeData: Layout, value: any, customTypes: CustomTypes) {
    return layoutFold<any, Field[]>(
      {
        map(type, value) {
          return type.toFields(value);
        },
        reduceArray(array) {
          return array!.flat();
        },
        reduceObject(keys, object) {
          return keys.map((key) => object![key]).flat();
        },
        reduceFlaggedOption({ isSome, value }) {
          return [isSome, value].flat();
        },
        reduceOrUndefined(_) {
          return [];
        },
        customTypes,
      },
      typeData,
      value
    );
  }

  function toAuxiliary(typeData: Layout, value: any, customTypes: CustomTypes) {
    return layoutFold<any, any[]>(
      {
        map(type, value) {
          return type.toAuxiliary(value);
        },
        reduceArray(array) {
          return array;
        },
        reduceObject(keys, object) {
          return keys.map((key) => object[key]);
        },
        reduceFlaggedOption({ value }) {
          return value;
        },
        reduceOrUndefined(value) {
          return value === undefined ? [false] : [true, value];
        },
        customTypes,
      },
      typeData,
      value
    );
  }

  function sizeInFields(typeData: Layout, customTypes: CustomTypes) {
    let spec: FoldSpec<any, number> = {
      map(type) {
        return type.sizeInFields();
      },
      reduceArray(_, { inner, staticLength }): number {
        let length = staticLength ?? NaN;
        return length * layoutFold(spec, inner);
      },
      reduceObject(keys, object) {
        return keys.map((key) => object[key]).reduce((x, y) => x + y);
      },
      reduceFlaggedOption({ isSome, value }) {
        return isSome + value;
      },
      reduceOrUndefined(_) {
        return 0;
      },
      customTypes,
    };
    return layoutFold<any, number>(spec, typeData);
  }

  function fromFields(
    typeData: Layout,
    fields: Field[],
    aux: any[],
    customTypes: CustomTypes
  ): any {
    let { checkedTypeName } = typeData;
    if (checkedTypeName) {
      // there's a custom type!
      return customTypes[checkedTypeName].fromFields(fields, aux);
    }
    if (typeData.type === 'array') {
      let arrayTypeData = typeData as ArrayLayout<TypeMap>;
      let size = sizeInFields(arrayTypeData.inner, customTypes);
      let length = aux.length;
      let value = [];
      for (let i = 0, offset = 0; i < length; i++, offset += size) {
        value[i] = fromFields(
          arrayTypeData.inner,
          fields.slice(offset, offset + size),
          aux[i],
          customTypes
        );
      }
      return value;
    }
    if (typeData.type === 'option') {
      let { optionType, inner } = typeData as OptionLayout<TypeMap>;
      switch (optionType) {
        case 'flaggedOption': {
          let [first, ...rest] = fields;
          let isSome = TypeMap.Bool.fromFields([first], []);
          let value = fromFields(inner, rest, aux, customTypes);
          return { isSome, value };
        }
        case 'orUndefined': {
          let [isDefined, value] = aux;
          return isDefined
            ? fromFields(inner, fields, value, customTypes)
            : undefined;
        }
        default:
          throw Error('bug');
      }
    }
    if (typeData.type === 'object') {
      let { keys, entries } = typeData as ObjectLayout<TypeMap>;
      let values: Record<string, any> = {};
      let offset = 0;
      for (let i = 0; i < keys.length; i++) {
        let typeEntry = entries[keys[i]];
        let size = sizeInFields(typeEntry, customTypes);
        values[keys[i]] = fromFields(
          typeEntry,
          fields.slice(offset, offset + size),
          aux[i],
          customTypes
        );
        offset += size;
      }
      return values;
    }
    return (TypeMap as any)[typeData.type].fromFields(fields, aux);
  }

  function check(typeData: Layout, value: any, customTypes: CustomTypes) {
    return layoutFold<any, void>(
      {
        map(type, value) {
          return type.check(value);
        },
        reduceArray() {},
        reduceObject() {},
        reduceFlaggedOption() {},
        reduceOrUndefined() {},
        customTypes,
      },
      typeData,
      value
    );
  }

  function toInput(typeData: Layout, value: any, customTypes: CustomTypes) {
    return layoutFold<any, HashInput>(
      {
        map(type, value) {
          return type.toInput(value);
        },
        reduceArray(array) {
          let acc: HashInput = { fields: [], packed: [] };
          for (let { fields, packed } of array) {
            if (fields) acc.fields!.push(...fields);
            if (packed) acc.packed!.push(...packed);
          }
          return acc;
        },
        reduceObject(keys, object) {
          let acc: HashInput = { fields: [], packed: [] };
          for (let key of keys) {
            let { fields, packed } = object[key];
            if (fields) acc.fields!.push(...fields);
            if (packed) acc.packed!.push(...packed);
          }
          return acc;
        },
        reduceFlaggedOption({ isSome, value }) {
          return {
            fields: value.fields,
            packed: isSome.packed!.concat(value.packed ?? []),
          };
        },
        reduceOrUndefined(_) {
          return {};
        },
        customTypes,
      },
      typeData,
      value
    );
  }

  type FoldSpec<T, R> = {
    customTypes: CustomTypes;
    map: (type: ProvableExtended<any, any>, value?: T) => R;
    reduceArray: (array: R[], typeData: ArrayLayout<TypeMap>) => R;
    reduceObject: (keys: string[], record: Record<string, R>) => R;
    reduceFlaggedOption: (option: { isSome: R; value: R }) => R;
    reduceOrUndefined: (value?: R) => R;
  };

  function layoutFold<T, R>(
    spec: FoldSpec<T, R>,
    typeData: Layout,
    value?: T
  ): R {
    let { checkedTypeName } = typeData;
    if (checkedTypeName) {
      // there's a custom type!
      return spec.map(spec.customTypes[checkedTypeName], value);
    }
    if (typeData.type === 'array') {
      let arrayTypeData = typeData as ArrayLayout<TypeMap>;
      let v: T[] | undefined[] | undefined = value as any;
      if (arrayTypeData.staticLength != null && v === undefined) {
        v = Array<undefined>(arrayTypeData.staticLength).fill(undefined);
      }
      let array = v?.map((x) => layoutFold(spec, arrayTypeData.inner, x)) ?? [];
      return spec.reduceArray(array, arrayTypeData);
    }
    if (typeData.type === 'option') {
      let { optionType, inner } = typeData as OptionLayout<TypeMap>;
      switch (optionType) {
        case 'flaggedOption':
          let v: { isSome: T; value: T } | undefined = value as any;
          return spec.reduceFlaggedOption({
            isSome: spec.map(TypeMap.Bool, v?.isSome),
            value: layoutFold(spec, inner, v?.value),
          });
        case 'orUndefined':
          let mapped =
            value === undefined ? undefined : layoutFold(spec, inner, value);
          return spec.reduceOrUndefined(mapped);
        default:
          throw Error('bug');
      }
    }
    if (typeData.type === 'object') {
      let { keys, entries } = typeData as ObjectLayout<TypeMap>;
      let v: Record<string, T> | undefined = value as any;
      let object: Record<string, R> = {};
      keys.forEach((key) => {
        object[key] = layoutFold(spec, entries[key], v?.[key]);
      });
      return spec.reduceObject(keys, object);
    }
    return spec.map((TypeMap as any)[typeData.type], value);
  }

  // helper for pretty-printing / debugging

  function toJSONEssential(
    typeData: Layout,
    value: any,
    customTypes: CustomTypes
  ) {
    return layoutFold<any, any>(
      {
        map(type, value) {
          return type.toJSON(value);
        },
        reduceArray(array) {
          if (array.length === 0 || array.every((x) => x === null)) return null;
          return array;
        },
        reduceObject(_, object) {
          for (let key in object) {
            if (object[key] === null) {
              delete object[key];
            }
          }
          if (Object.keys(object).length === 0) return null;
          return object;
        },
        reduceFlaggedOption({ isSome, value }) {
          return isSome ? value : null;
        },
        reduceOrUndefined(value) {
          return value ?? null;
        },
        customTypes,
      },
      typeData,
      value
    );
  }

  return { provableFromLayout, toJSONEssential };
}

// types

type WithChecked<TypeMap extends AnyTypeMap> = {
  checkedType?: GenericLayout<TypeMap>;
  checkedTypeName?: string;
};

type BaseLayout<TypeMap extends AnyTypeMap> = {
  type: keyof TypeMap;
} & WithChecked<TypeMap>;

type RangeLayout<TypeMap extends AnyTypeMap, T = BaseLayout<TypeMap>> = {
  type: 'object';
  name: string;
  keys: ['lower', 'upper'];
  entries: { lower: T; upper: T };
} & WithChecked<TypeMap>;

type OptionLayout<TypeMap extends AnyTypeMap, T = BaseLayout<AnyTypeMap>> = {
  type: 'option';
} & (
  | {
      optionType: 'flaggedOption';
      inner: RangeLayout<TypeMap, T>;
    }
  | {
      optionType: 'flaggedOption';
      inner: T;
    }
  | {
      optionType: 'orUndefined';
      inner: T;
    }
) &
  WithChecked<TypeMap>;

type ArrayLayout<TypeMap extends AnyTypeMap> = {
  type: 'array';
  inner: GenericLayout<TypeMap>;
  staticLength: number | null;
} & WithChecked<TypeMap>;

type ObjectLayout<TypeMap extends AnyTypeMap> = {
  type: 'object';
  name: string;
  keys: string[];
  entries: Record<string, GenericLayout<TypeMap>>;
} & WithChecked<TypeMap>;

type GenericLayout<TypeMap extends AnyTypeMap> =
  | OptionLayout<TypeMap>
  | BaseLayout<TypeMap>
  | ObjectLayout<TypeMap>
  | ArrayLayout<TypeMap>;
