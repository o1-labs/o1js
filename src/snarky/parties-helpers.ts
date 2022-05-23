import * as Leaves from './parties-leaves';

export { toJson, toFields };

function toJson(typeData: any, value: any, converters: any): any {
  let { type, inner, layout, name, optionType, checkedTypeName } = typeData;
  if (checkedTypeName) {
    // there's a custom conversion function!
    return converters[checkedTypeName](value);
  }
  if (type === 'array') {
    return value.map((x: any) => toJson(inner, x, converters));
  }
  if (type === 'option') {
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
  if (type === 'object') {
    if (Leaves.toJsonLeafTypes.has(name)) {
      // override with custom leaf type
      return Leaves.toJson(name, value);
    }
    let json: any = {};
    for (let { key, value: typeData } of layout) {
      json[key] = toJson(typeData, value[key], converters);
    }
    return json;
  }
  return Leaves.toJson(type, value);
}

// let i = 0; // DEBUG

function toFields(typeData: any, value: any, converters: any): any {
  let { type, inner, layout, name, optionType, checkedTypeName } = typeData;
  if (checkedTypeName) {
    // there's a custom conversion function!
    let fields = converters[checkedTypeName](value);
    // i += fields.length; // DEBUG
    return fields;
  }
  if (type === 'array') {
    return value.map((x: any) => toFields(inner, x, converters)).flat();
  }
  if (type === 'option') {
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
  if (type === 'object') {
    if (Leaves.toFieldsLeafTypes.has(name)) {
      // override with custom leaf type
      return Leaves.toFields(name, value);
    }
    let fields: any = [];
    // let fieldsMap: any = {}; // DEBUG
    for (let { key, value: typeData } of layout) {
      // let i0 = i; // DEBUG
      let newFields = toFields(typeData, value[key], converters);
      fields.push(...newFields);
      // fieldsMap[key] = [i0, newFields.map(String)]; // DEBUG
    }
    // console.log(name); // DEBUG
    // console.log(fieldsMap); // DEBUG
    return fields;
  }
  let fields = Leaves.toFields(type, value);
  // i += fields.length; // DEBUG
  return fields;
}
