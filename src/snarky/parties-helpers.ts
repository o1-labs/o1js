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

// let i = 0; // DEBUG

function toFields(typeData: Layout, value: any, customTypes: CustomTypes): any {
  let { checkedTypeName } = typeData;
  if (checkedTypeName) {
    // there's a custom type!
    let fields = customTypes[checkedTypeName].toFields(value);
    // i += fields.length; // DEBUG
    return fields;
  }
  if (typeData.type === 'array') {
    return value
      .map((x: any) => toFields(typeData.inner, x, customTypes))
      .flat();
  }
  if (typeData.type === 'option') {
    let { optionType, inner } = typeData;
    switch (optionType) {
      case 'implicit':
        return toFields(inner, value, customTypes);
      case 'flaggedOption':
        // i += 1; // DEBUG
        return value.isSome
          .toFields()
          .concat(toFields(inner, value.value, customTypes));
      default:
        return [];
    }
  }
  if (typeData.type === 'object') {
    let { name, keys, entries } = typeData;
    if (Leaves.toFieldsLeafTypes.has(name)) {
      // override with custom leaf type
      return Leaves.toFields(name as keyof Leaves.TypeMap, value);
    }
    let fields: any = [];
    // let fieldsMap: any = {}; // DEBUG
    for (let key of keys) {
      // let i0 = i; // DEBUG
      let newFields = toFields(entries[key], value[key], customTypes);
      fields.push(...newFields);
      // fieldsMap[key] = [i0, newFields.map(String)]; // DEBUG
    }
    // console.log(name); // DEBUG
    // console.log(fieldsMap); // DEBUG
    return fields;
  }
  let fields = Leaves.toFields(typeData.type, value);
  // i += fields.length; // DEBUG
  return fields;
}

function toAuxiliary<T>(
  typeData: Layout,
  value: T | undefined,
  customTypes: any
): any {
  let { checkedTypeName } = typeData;
  if (checkedTypeName) {
    // there's a custom type!
    return customTypes[checkedTypeName].toAuxiliary(value);
  }
  if (typeData.type === 'array') {
    let v: any[] | undefined = value as any;
    let length = typeData.staticLength ?? v?.length ?? 0;
    // encode array length at runtime so it can be unambiguously read back in
    if (v === undefined) return [length];
    return [length].concat(
      v.map((x: any) => toAuxiliary(typeData.inner, x, customTypes)).flat()
    );
  }
  if (typeData.type === 'option') {
    let { optionType, inner } = typeData;
    switch (optionType) {
      case 'implicit':
        return toAuxiliary(inner, value, customTypes);
      case 'flaggedOption':
        let v: { isSome: boolean; value: any } | undefined = value as any;
        return toAuxiliary(inner, v?.value, customTypes);
      case 'orUndefined':
        if (value === undefined) return [false];
        return [true].concat(toAuxiliary(inner, value, customTypes));
      default:
        throw Error('bug');
    }
  }
  if (typeData.type === 'object') {
    let { name, keys, entries } = typeData;
    if (Leaves.toFieldsLeafTypes.has(name)) {
      // override with custom leaf type
      return Leaves.toAuxiliary(name as keyof Leaves.TypeMap, value as any);
    }
    let aux: any = [];
    let v: Record<string, any> | undefined = value as any;
    for (let key of keys) {
      let newAux = toAuxiliary(entries[key], v?.[key], customTypes);
      aux.push(...newAux);
    }
    return aux;
  }
  let aux = Leaves.toAuxiliary(typeData.type, value as any);
  return aux;
}

function sizeInFields(typeData: Layout, customTypes: CustomTypes): number {
  let { checkedTypeName } = typeData;
  if (checkedTypeName) {
    // there's a custom type!
    return customTypes[checkedTypeName].sizeInFields();
  }
  if (typeData.type === 'array') {
    let length = typeData.staticLength ?? NaN;
    return length * sizeInFields(typeData.inner, customTypes);
  }
  if (typeData.type === 'option') {
    let { optionType, inner } = typeData;
    switch (optionType) {
      case 'implicit':
        return sizeInFields(inner, customTypes);
      case 'flaggedOption':
        return 1 + sizeInFields(inner, customTypes);
      case 'orUndefined':
        return 0;
      default:
        throw Error('bug');
    }
  }
  if (typeData.type === 'object') {
    let { name, keys, entries } = typeData;
    if (Leaves.toFieldsLeafTypes.has(name)) {
      // override with custom leaf type
      return Leaves.sizeInFields(name as keyof Leaves.TypeMap);
    }
    let size = 0;
    for (let key of keys) {
      size += sizeInFields(entries[key], customTypes);
    }
    return size;
  }
  return Leaves.sizeInFields(typeData.type);
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

function check(typeData: Layout, value: any, customTypes: CustomTypes): void {
  let { checkedTypeName } = typeData;
  if (checkedTypeName) {
    // there's a custom type!
    customTypes[checkedTypeName].check(value);
    return;
  }
  if (typeData.type === 'array') {
    value.forEach((x: any) => {
      check(typeData.inner, x, customTypes);
    });
    return;
  }
  if (typeData.type === 'option') {
    let { optionType, inner } = typeData;
    switch (optionType) {
      case 'implicit':
        check(inner, value, customTypes);
        return;
      case 'flaggedOption':
        Bool.check(value.isSome);
        check(inner, value.value, customTypes);
        return;
      default:
        return;
    }
  }
  if (typeData.type === 'object') {
    let { name, keys, entries } = typeData;
    if (Leaves.toFieldsLeafTypes.has(name)) {
      // override with custom leaf type
      Leaves.check(name as keyof Leaves.TypeMap, value);
      return;
    }
    for (let key of keys) {
      check(entries[key], value[key], customTypes);
    }
    return;
  }
  Leaves.check(typeData.type, value);
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
type Layout =
  | OptionLayout<BaseLayout>
  | BaseLayout
  | ({
      type: 'object';
      name: string;
      keys: string[];
      entries: Record<string, Layout>;
    } & WithChecked)
  | ({
      type: 'array';
      inner: Layout;
      staticLength: number | null;
    } & WithChecked);
