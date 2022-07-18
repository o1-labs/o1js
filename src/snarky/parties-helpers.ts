import * as Leaves from './parties-leaves';
import { Field, Bool } from '../snarky';

export { toJson, toFields, toAuxiliary, fromFields, Layout };

function toJson(typeData: Layout, value: any, converters: any): any {
  let { checkedTypeName } = typeData;
  if (checkedTypeName) {
    // there's a custom conversion function!
    return converters[checkedTypeName](value);
  }
  if (typeData.type === 'array') {
    return value.map((x: any) => toJson(typeData.inner, x, converters));
  }
  if (typeData.type === 'option') {
    let { optionType, inner } = typeData;
    switch (optionType) {
      case 'implicit':
        return toJson(inner, value, converters);
      case 'flaggedOption':
        return value.isSome.toBoolean()
          ? toJson(inner, value.value, converters)
          : null;
      default:
        return value !== undefined ? toJson(inner, value, converters) : null;
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
      json[key] = toJson(entries[key], value[key], converters);
    }
    return json;
  }
  return Leaves.toJson(typeData.type, value);
}

// let i = 0; // DEBUG

function toFields(typeData: Layout, value: any, converters: any): any {
  let { checkedTypeName } = typeData;
  if (checkedTypeName) {
    // there's a custom conversion function!
    let fields = converters[checkedTypeName](value);
    // i += fields.length; // DEBUG
    return fields;
  }
  if (typeData.type === 'array') {
    return value
      .map((x: any) => toFields(typeData.inner, x, converters))
      .flat();
  }
  if (typeData.type === 'option') {
    let { optionType, inner } = typeData;
    switch (optionType) {
      case 'implicit':
        return toFields(inner, value, converters);
      case 'flaggedOption':
        // i += 1; // DEBUG
        return value.isSome
          .toFields()
          .concat(toFields(inner, value.value, converters));
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
      let newFields = toFields(entries[key], value[key], converters);
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
  converters: any
): any {
  let { checkedTypeName } = typeData;
  if (checkedTypeName) {
    // there's a custom conversion function!
    return converters[checkedTypeName](value);
  }
  if (typeData.type === 'array') {
    let v: any[] | undefined = value as any;
    let length = typeData.staticLength ?? v?.length ?? 0;
    // encode array length at runtime so it can be unambiguously read back in
    if (v === undefined) return [length];
    return [length].concat(
      v.map((x: any) => toAuxiliary(typeData.inner, x, converters)).flat()
    );
  }
  if (typeData.type === 'option') {
    let { optionType, inner } = typeData;
    switch (optionType) {
      case 'implicit':
        return toAuxiliary(inner, value, converters);
      case 'flaggedOption':
        let v: { isSome: boolean; value: any } | undefined = value as any;
        return toAuxiliary(inner, v?.value, converters);
      case 'orUndefined':
        if (value === undefined) return [false];
        return [true].concat(toAuxiliary(inner, value, converters));
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
      let newAux = toAuxiliary(entries[key], v?.[key], converters);
      aux.push(...newAux);
    }
    return aux;
  }
  let aux = Leaves.toAuxiliary(typeData.type, value as any);
  return aux;
}

function fromFields(
  typeData: Layout,
  fields: Field[],
  aux: any[],
  converters: any
) {
  return fromFieldsReversed(
    typeData,
    [...fields].reverse(),
    [...aux].reverse(),
    converters
  );
}

function fromFieldsReversed(
  typeData: Layout,
  fields: Field[],
  aux: any[],
  converters: any
): any {
  let { checkedTypeName } = typeData;
  if (checkedTypeName) {
    // there's a custom conversion function!
    let value = converters[checkedTypeName](fields, aux);
    return value;
  }
  if (typeData.type === 'array') {
    let value = [];
    let length = aux.pop()!;
    for (let i = 0; i < length; i++) {
      value[i] = fromFieldsReversed(typeData.inner, fields, aux, converters);
    }
    return value;
  }
  if (typeData.type === 'option') {
    let { optionType, inner } = typeData;
    switch (optionType) {
      case 'implicit':
        return fromFieldsReversed(inner, fields, aux, converters);
      case 'flaggedOption':
        let isSome = Bool.Unsafe.ofField(fields.pop()!);
        let value = fromFieldsReversed(inner, fields, aux, converters);
        return { isSome, value };
      case 'orUndefined':
        let isDefined = aux.pop()!;
        return isDefined
          ? fromFieldsReversed(inner, fields, aux, converters)
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
      values[key] = fromFieldsReversed(entries[key], fields, aux, converters);
    }
    return values;
  }
  return Leaves.fromFields(typeData.type, fields, aux);
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
