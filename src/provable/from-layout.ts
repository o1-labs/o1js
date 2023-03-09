import {
  GenericProvableExtended,
  primitiveTypeMap,
  primitiveTypes,
} from './generic.js';

export { ProvableFromLayout, GenericLayout, genericLayoutFold };

type GenericTypeMap<
  Field,
  Bool,
  UInt32,
  UInt64,
  Sign,
  PublicKey,
  AuthRequired,
  TokenId
> = {
  Field: Field;
  Bool: Bool;
  UInt32: UInt32;
  UInt64: UInt64;
  Sign: Sign;
  PublicKey: PublicKey;
  AuthRequired: AuthRequired;
  TokenId: TokenId;
};
type AnyTypeMap = GenericTypeMap<any, any, any, any, any, any, any, any>;
type TypeMapValues<TypeMap extends AnyTypeMap, JsonMap extends AnyTypeMap> = {
  [K in keyof TypeMap & keyof JsonMap]: GenericProvableExtended<
    TypeMap[K],
    JsonMap[K],
    TypeMap['Field']
  >;
};

function ProvableFromLayout<
  TypeMap extends AnyTypeMap,
  JsonMap extends AnyTypeMap
>(
  TypeMap: TypeMapValues<TypeMap, JsonMap>,
  customTypes: Record<
    string,
    GenericProvableExtended<any, any, TypeMap['Field']>
  >
) {
  type Field = TypeMap['Field'];
  const Field = TypeMap.Field;
  type HashInput = { fields?: Field[]; packed?: [Field, number][] };
  type Layout = GenericLayout<TypeMap>;

  const PrimitiveMap = primitiveTypeMap<Field>();

  type FoldSpec<T, R> = GenericFoldSpec<T, R, TypeMap>;

  function layoutFold<T, R>(spec: FoldSpec<T, R>, typeData: Layout, value?: T) {
    return genericLayoutFold(TypeMap, customTypes, spec, typeData, value);
  }

  function provableFromLayout<T, TJson>(typeData: Layout) {
    return {
      sizeInFields(): number {
        return sizeInFields(typeData);
      },
      toFields(value: T): Field[] {
        return toFields(typeData, value);
      },
      toAuxiliary(value?: T): any[] {
        return toAuxiliary(typeData, value);
      },
      fromFields(fields: Field[], aux: any[]): T {
        return fromFields(typeData, fields, aux);
      },
      toJSON(value: T): TJson {
        return toJSON(typeData, value);
      },
      fromJSON(json: TJson): T {
        return fromJSON(typeData, json);
      },
      check(value: T): void {
        check(typeData, value);
      },
      toInput(value: T): HashInput {
        return toInput(typeData, value);
      },
      emptyValue(): T {
        return emptyValue(typeData);
      },
    };
  }

  function toJSON(typeData: Layout, value: any) {
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
      },
      typeData,
      value
    );
  }

  function fromJSON(typeData: Layout, json: any): any {
    let { checkedTypeName } = typeData;
    if (checkedTypeName) {
      // there's a custom type!
      return customTypes[checkedTypeName].fromJSON(json);
    }
    if (typeData.type === 'array') {
      let arrayTypeData = typeData as ArrayLayout<TypeMap>;
      return json.map((json: any) => fromJSON(arrayTypeData.inner, json));
    }
    if (typeData.type === 'option') {
      let optionTypeData = typeData as OptionLayout<TypeMap>;
      switch (optionTypeData.optionType) {
        case 'closedInterval':
        case 'flaggedOption': {
          let isSome = TypeMap.Bool.fromJSON(json !== null);
          let value;
          if (json !== null) {
            value = fromJSON(optionTypeData.inner, json);
          } else {
            value = emptyValue(optionTypeData.inner);
            if (optionTypeData.optionType === 'closedInterval') {
              let innerInner = optionTypeData.inner.entries.lower;
              let innerType =
                TypeMap[innerInner.type as keyof TypeMap & keyof JsonMap];
              value.lower = innerType.fromJSON(optionTypeData.rangeMin);
              value.upper = innerType.fromJSON(optionTypeData.rangeMax);
            }
          }
          return { isSome, value };
        }
        case 'orUndefined': {
          return json === null
            ? undefined
            : fromJSON(optionTypeData.inner, json);
        }
        default:
          throw Error('bug');
      }
    }
    if (typeData.type === 'object') {
      let { keys, entries } = typeData as ObjectLayout<TypeMap>;
      let values: Record<string, any> = {};
      for (let i = 0; i < keys.length; i++) {
        let typeEntry = entries[keys[i]];
        values[keys[i]] = fromJSON(typeEntry, json[keys[i]]);
      }
      return values;
    }
    if (primitiveTypes.has(typeData.type as string)) {
      return (PrimitiveMap as any)[typeData.type].fromJSON(json);
    }
    return (TypeMap as any)[typeData.type].fromJSON(json);
  }

  function toFields(typeData: Layout, value: any) {
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
      },
      typeData,
      value
    );
  }

  function toAuxiliary(typeData: Layout, value?: any) {
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
      },
      typeData,
      value
    );
  }

  function sizeInFields(typeData: Layout) {
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
    };
    return layoutFold<any, number>(spec, typeData);
  }

  function fromFields(typeData: Layout, fields: Field[], aux: any[]): any {
    let { checkedTypeName } = typeData;
    if (checkedTypeName) {
      // there's a custom type!
      return customTypes[checkedTypeName].fromFields(fields, aux);
    }
    if (typeData.type === 'array') {
      let arrayTypeData = typeData as ArrayLayout<TypeMap>;
      let size = sizeInFields(arrayTypeData.inner);
      let length = aux.length;
      let value = [];
      for (let i = 0, offset = 0; i < length; i++, offset += size) {
        value[i] = fromFields(
          arrayTypeData.inner,
          fields.slice(offset, offset + size),
          aux[i]
        );
      }
      return value;
    }
    if (typeData.type === 'option') {
      let { optionType, inner } = typeData as OptionLayout<TypeMap>;
      switch (optionType) {
        case 'closedInterval':
        case 'flaggedOption': {
          let [first, ...rest] = fields;
          let isSome = TypeMap.Bool.fromFields([first], []);
          let value = fromFields(inner, rest, aux);
          return { isSome, value };
        }
        case 'orUndefined': {
          let [isDefined, value] = aux;
          return isDefined ? fromFields(inner, fields, value) : undefined;
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
        let size = sizeInFields(typeEntry);
        values[keys[i]] = fromFields(
          typeEntry,
          fields.slice(offset, offset + size),
          aux[i]
        );
        offset += size;
      }
      return values;
    }
    if (primitiveTypes.has(typeData.type as string)) {
      return (PrimitiveMap as any)[typeData.type].fromFields(fields, aux);
    }
    return (TypeMap as any)[typeData.type].fromFields(fields, aux);
  }

  function emptyValue(typeData: Layout) {
    let zero = TypeMap.Field.fromJSON('0');
    return layoutFold<undefined, any>(
      {
        map(type) {
          if (type.emptyValue) return type.emptyValue();
          return type.fromFields(
            Array(type.sizeInFields()).fill(zero),
            type.toAuxiliary()
          );
        },
        reduceArray(array) {
          return array;
        },
        reduceObject(_, object) {
          return object;
        },
        reduceFlaggedOption({ isSome, value }, typeData) {
          if (typeData.optionType === 'closedInterval') {
            let innerInner = typeData.inner.entries.lower;
            let innerType = TypeMap[innerInner.type as 'UInt32' | 'UInt64'];
            value.lower = innerType.fromJSON(typeData.rangeMin);
            value.upper = innerType.fromJSON(typeData.rangeMax);
          }
          return { isSome, value };
        },
        reduceOrUndefined() {
          return undefined;
        },
      },
      typeData,
      undefined
    );
  }

  function check(typeData: Layout, value: any) {
    return layoutFold<any, void>(
      {
        map(type, value) {
          return type.check(value);
        },
        reduceArray() {},
        reduceObject() {},
        reduceFlaggedOption() {},
        reduceOrUndefined() {},
      },
      typeData,
      value
    );
  }

  function toInput(typeData: Layout, value: any) {
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
      },
      typeData,
      value
    );
  }

  // helper for pretty-printing / debugging

  function toJSONEssential(typeData: Layout, value: any) {
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
      },
      typeData,
      value
    );
  }

  return { provableFromLayout, toJSONEssential, emptyValue };
}

// generic over leaf types

type GenericFoldSpec<T, R, TypeMap extends AnyTypeMap> = {
  map: (
    type: GenericProvableExtended<any, any, TypeMap['Field']>,
    value?: T,
    name?: string
  ) => R;
  reduceArray: (array: R[], typeData: ArrayLayout<TypeMap>) => R;
  reduceObject: (keys: string[], record: Record<string, R>) => R;
  reduceFlaggedOption: (
    option: { isSome: R; value: R },
    typeData: FlaggedOptionLayout<TypeMap>
  ) => R;
  reduceOrUndefined: (
    value: R | undefined,
    innerTypeData: GenericLayout<TypeMap>
  ) => R;
};

function genericLayoutFold<
  T,
  R,
  TypeMap extends AnyTypeMap,
  JsonMap extends AnyTypeMap
>(
  TypeMap: TypeMapValues<TypeMap, JsonMap>,
  customTypes: Record<
    string,
    GenericProvableExtended<any, any, TypeMap['Field']>
  >,
  spec: GenericFoldSpec<T, R, TypeMap>,
  typeData: GenericLayout<TypeMap>,
  value?: T
): R {
  let PrimitiveMap = primitiveTypeMap<TypeMap['Field']>();
  let { checkedTypeName } = typeData;
  if (checkedTypeName) {
    // there's a custom type!
    return spec.map(customTypes[checkedTypeName], value, checkedTypeName);
  }
  if (typeData.type === 'array') {
    let arrayTypeData = typeData as ArrayLayout<TypeMap>;
    let v: T[] | undefined[] | undefined = value as any;
    if (arrayTypeData.staticLength !== null && v === undefined) {
      v = Array<undefined>(arrayTypeData.staticLength).fill(undefined);
    }
    let array =
      v?.map((x) =>
        genericLayoutFold(TypeMap, customTypes, spec, arrayTypeData.inner, x)
      ) ?? [];
    return spec.reduceArray(array, arrayTypeData);
  }
  if (typeData.type === 'option') {
    let { optionType, inner } = typeData as OptionLayout<TypeMap>;
    switch (optionType) {
      case 'closedInterval':
      case 'flaggedOption':
        let v: { isSome: T; value: T } | undefined = value as any;
        return spec.reduceFlaggedOption(
          {
            isSome: spec.map(TypeMap.Bool, v?.isSome, 'Bool'),
            value: genericLayoutFold(
              TypeMap,
              customTypes,
              spec,
              inner,
              v?.value
            ),
          },
          typeData as FlaggedOptionLayout<TypeMap>
        );
      case 'orUndefined':
        let mapped =
          value === undefined
            ? undefined
            : genericLayoutFold(TypeMap, customTypes, spec, inner, value);
        return spec.reduceOrUndefined(mapped, inner);
      default:
        throw Error('bug');
    }
  }
  if (typeData.type === 'object') {
    let { keys, entries } = typeData as ObjectLayout<TypeMap>;
    let v: Record<string, T> | undefined = value as any;
    let object: Record<string, R> = {};
    keys.forEach((key) => {
      object[key] = genericLayoutFold(
        TypeMap,
        customTypes,
        spec,
        entries[key],
        v?.[key]
      );
    });
    return spec.reduceObject(keys, object);
  }
  if (primitiveTypes.has(typeData.type)) {
    return spec.map((PrimitiveMap as any)[typeData.type], value, typeData.type);
  }
  return spec.map((TypeMap as any)[typeData.type], value, typeData.type);
}

// types

type WithChecked<TypeMap extends AnyTypeMap> = {
  checkedType?: GenericLayout<TypeMap>;
  checkedTypeName?: string;
};

type BaseLayout<TypeMap extends AnyTypeMap> = {
  type: keyof TypeMap & string;
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
      optionType: 'closedInterval';
      rangeMin: any;
      rangeMax: any;
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

type FlaggedOptionLayout<
  TypeMap extends AnyTypeMap,
  T = BaseLayout<AnyTypeMap>
> = Exclude<OptionLayout<TypeMap, T>, { optionType: 'orUndefined' }>;

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
