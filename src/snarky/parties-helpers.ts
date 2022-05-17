import * as Leaves from './parties-leaves';

export { toJson, toFields };

function toJson(typeData: any, value: any): any {
  let { type, inner, layout, name, optionType } = typeData;
  if (type === 'array') {
    return value.map((x: any) => toJson(inner, x));
  }
  if (type === 'option') {
    switch (optionType) {
      case 'implicit':
        return toJson(inner, value);
      case 'flaggedOption':
        return value.isSome.toBoolean() ? toJson(inner, value.value) : null;
      default:
        return value !== undefined ? toJson(inner, value) : null;
    }
  }
  if (type === 'object') {
    if (Leaves.toJsonLeafTypes.has(name)) {
      // override with custom leaf type
      return Leaves.toJson(name, value);
    }
    let json: any = {};
    for (let { key, value: typeData } of layout) {
      json[key] = toJson(typeData, value[key]);
    }
    return json;
  }
  return Leaves.toJson(type, value);
}

function toFields(typeData: any, value: any): any {
  let { type, inner, layout, name, optionType } = typeData;
  if (type === 'array') {
    return value.map((x: any) => toFields(inner, x)).flat();
  }
  if (type === 'option') {
    switch (optionType) {
      case 'implicit':
        return toFields(inner, value);
      case 'flaggedOption':
        return value.isSome.toFields().concat(toFields(inner, value.value));
      default:
        return [];
    }
  }
  if (type === 'object') {
    if (Leaves.toFieldsLeafTypes.has(name)) {
      // override with custom leaf type
      return Leaves.toFields(name, value);
    }
    let fields: any = [];
    for (let { key, value: typeData } of layout) {
      fields.push(...toFields(typeData, value[key]));
    }
    return fields;
  }
  return Leaves.toFields(type, value);
}
