import * as Leaves from './parties-leaves';
import { Field, Bool, Circuit } from '../snarky';
import { circuitArray } from '../lib/circuit_value';

export { asFieldsAndAux, Layout, AsFieldsAndAux };

type AsFieldsAndAux<T, TJson> = {
  sizeInFields(): number;
  toFields(value: T): Field[];
  toAuxiliary(value?: T): any[];
  fromFields(fields: Field[], aux: any[]): T;
  toJson(value: T): TJson;
  check(value: T): void;
};
type CustomTypes = Record<string, AsFieldsAndAux<any, any>>;

function asFieldsAndAux<T, TJson>(typeData: Layout, customTypes: CustomTypes) {
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
    toJson(value: T): TJson {
      return toJson(typeData, value, customTypes);
    },
    check(value: T): void {
      check(typeData, value, customTypes);
    },
    witness(f: () => T): T {
      let aux: any[];
      let fields = Circuit.witness<Field[]>(
        circuitArray(Field, this.sizeInFields()),
        () => {
          let value = f();
          aux = this.toAuxiliary(value);
          return this.toFields(value);
        }
      );
      aux ??= this.toAuxiliary();
      let witness = this.fromFields(fields, aux);
      this.check(witness);
      return witness;
    },
  };
}

function toJson(typeData: Layout, value: any, customTypes: CustomTypes): any {
  let { checkedTypeName } = typeData;
  if (checkedTypeName) {
    // there's a custom type!
    return customTypes[checkedTypeName].toJson(value);
  }
  if (typeData.type === 'array') {
    return value.map((x: any) => toJson(typeData.inner, x, customTypes));
  }
  if (typeData.type === 'option') {
    let { optionType, inner } = typeData;
    switch (optionType) {
      case 'implicit':
        return toJson(inner, value, customTypes);
      case 'flaggedOption':
        return value.isSome.toBoolean()
          ? toJson(inner, value.value, customTypes)
          : null;
      default:
        return value !== undefined ? toJson(inner, value, customTypes) : null;
    }
  }
  if (typeData.type === 'object') {
    let { name, keys, entries } = typeData;
    if (Leaves.toJsonLeafTypes.has(name)) {
      // override with custom leaf type
      return Leaves.toJson(name as keyof Leaves.ToJsonTypeMap, value);
    }
    let json: any = {};
    for (let key of keys) {
      json[key] = toJson(entries[key], value[key], customTypes);
    }
    return json;
  }
  return Leaves.toJson(typeData.type, value);
}

function toFields(typeData: Layout, value: any, customTypes: CustomTypes) {
  return mapReduce<any, Field[]>(
    {
      map(type, value) {
        return Leaves.toFields(type, value);
      },
      mapCustom(type, value) {
        return type.toFields(value);
      },
      reduceArray(array) {
        return array!.flat();
      },
      reduceObject(keys, object) {
        return keys.map((key) => object![key]).flat();
      },
      reduceOptional(_) {
        return [];
      },
      customTypes,
    },
    typeData,
    value
  );
}

function toAuxiliary(typeData: Layout, value: any, customTypes: CustomTypes) {
  return mapReduce<any, any[]>(
    {
      map(type, value) {
        return Leaves.toAuxiliary(type, value);
      },
      mapCustom(type, value) {
        return type.toAuxiliary(value);
      },
      reduceArray(array, { staticLength }) {
        let length = staticLength ?? array.length;
        return [length].concat(array.flat());
      },
      reduceObject(keys, object) {
        return keys.map((key) => object[key]).flat();
      },
      reduceOptional(value) {
        return value === undefined ? [false] : [true].concat(value);
      },
      customTypes,
    },
    typeData,
    value
  );
}

function sizeInFields(typeData: Layout, customTypes: CustomTypes) {
  let spec: MapReduceSpec<any, number> = {
    map(type) {
      return Leaves.sizeInFields(type);
    },
    mapCustom(type) {
      return type.sizeInFields();
    },
    reduceArray(_, { inner, staticLength }): number {
      let length = staticLength ?? NaN;
      return length * mapReduce(spec, inner);
    },
    reduceObject(keys, object) {
      return keys.map((key) => object[key]).reduce((x, y) => x + y);
    },
    reduceOptional(_) {
      return 0;
    },
    customTypes,
  };
  return mapReduce<any, number>(spec, typeData);
}

function fromFields(
  typeData: Layout,
  fields: Field[],
  aux: any[],
  customTypes: CustomTypes
) {
  return fromFieldsReversed(
    typeData,
    [...fields].reverse(),
    [...aux].reverse(),
    customTypes
  );
}

function fromFieldsReversed(
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
    let value = [];
    let length = aux.pop()!;
    for (let i = 0; i < length; i++) {
      value[i] = fromFieldsReversed(typeData.inner, fields, aux, customTypes);
    }
    return value;
  }
  if (typeData.type === 'option') {
    let { optionType, inner } = typeData;
    switch (optionType) {
      case 'implicit':
        return fromFieldsReversed(inner, fields, aux, customTypes);
      case 'flaggedOption':
        let isSome = Bool.Unsafe.ofField(fields.pop()!);
        let value = fromFieldsReversed(inner, fields, aux, customTypes);
        return { isSome, value };
      case 'orUndefined':
        let isDefined = aux.pop()!;
        return isDefined
          ? fromFieldsReversed(inner, fields, aux, customTypes)
          : undefined;
      default:
        throw Error('bug');
    }
  }
  if (typeData.type === 'object') {
    let { name, keys, entries } = typeData;
    if (Leaves.toFieldsLeafTypes.has(name)) {
      // override with custom leaf type
      return Leaves.fromFields(name as keyof Leaves.TypeMap, fields, aux);
    }
    let values: Record<string, any> = {};
    for (let key of keys) {
      values[key] = fromFieldsReversed(entries[key], fields, aux, customTypes);
    }
    return values;
  }
  return Leaves.fromFields(typeData.type, fields, aux);
}

function check(typeData: Layout, value: any, customTypes: CustomTypes) {
  return mapReduce<any, void>(
    {
      map(type, value) {
        return Leaves.check(type, value);
      },
      mapCustom(type, value) {
        return type.check(value);
      },
      reduceArray() {},
      reduceObject() {},
      reduceOptional() {},
      customTypes,
    },
    typeData,
    value
  );
}

type MapReduceSpec<T, R> = {
  customTypes: CustomTypes;
  map: (type: keyof Leaves.TypeMap, value?: T) => R;
  mapCustom: (type: AsFieldsAndAux<any, any>, value?: T) => R;
  reduceArray: (array: R[], typeData: ArrayLayout) => R;
  reduceObject: (keys: string[], record: Record<string, R>) => R;
  reduceOptional: (value?: R) => R;
};

function mapReduce<T, R>(
  spec: MapReduceSpec<T, R>,
  typeData: Layout,
  value?: T
): R {
  let { checkedTypeName } = typeData;
  if (checkedTypeName) {
    // there's a custom type!
    return spec.mapCustom(spec.customTypes[checkedTypeName], value);
  }
  if (typeData.type === 'array') {
    let v: T[] | undefined = value as any;
    let array = v?.map((x: T) => mapReduce(spec, typeData.inner, x)) ?? [];
    return spec.reduceArray(array, typeData);
  }
  if (typeData.type === 'option') {
    let { optionType, inner } = typeData;
    switch (optionType) {
      case 'implicit':
        return mapReduce(spec, inner, value);
      case 'flaggedOption':
        let v: { isSome: T; value: T } | undefined = value as any;
        return spec.reduceObject(['isSome', 'value'], {
          isSome: spec.map('Bool', v?.isSome),
          value: mapReduce(spec, inner, v?.value),
        });
      case 'orUndefined':
        let mapped =
          value === undefined ? undefined : mapReduce(spec, inner, value);
        return spec.reduceOptional(mapped);
      default:
        throw Error('bug');
    }
  }
  if (typeData.type === 'object') {
    let { keys, entries } = typeData;
    let v: Record<string, T> | undefined = value as any;
    let object: Record<string, R> = {};
    keys.forEach((key) => {
      object[key] = mapReduce(spec, entries[key], v?.[key]);
    });
    return spec.reduceObject(keys, object);
  }
  return spec.map(typeData.type, value);
}

// types

type WithChecked = { checkedType?: Layout; checkedTypeName?: string };

type BaseLayout = { type: keyof Leaves.TypeMap } & WithChecked;

type RangeLayout<T extends BaseLayout> = {
  type: 'object';
  name: string;
  keys: ['lower', 'upper'];
  entries: { lower: T; upper: T };
} & WithChecked;

type OptionLayout<T extends BaseLayout> = { type: 'option' } & (
  | {
      optionType: 'flaggedOption';
      inner: T;
    }
  | {
      optionType: 'implicit';
      inner: RangeLayout<T>;
    }
  | {
      optionType: 'implicit';
      inner: T;
    }
  | {
      optionType: 'orUndefined';
      inner: T;
    }
) &
  WithChecked;

type ArrayLayout = {
  type: 'array';
  inner: Layout;
  staticLength: number | null;
} & WithChecked;

type Layout =
  | OptionLayout<BaseLayout>
  | BaseLayout
  | ({
      type: 'object';
      name: string;
      keys: string[];
      entries: Record<string, Layout>;
    } & WithChecked)
  | ArrayLayout;
