import * as Leaves from './parties-leaves';

export { toJson };

function toJson(typeData: any, value: any): any {
  let { type, inner, layout } = typeData;
  if (type === 'array') {
    return value.map((x: any) => toJson(inner, x));
  }
  if (type === 'orundefined') {
    return value === undefined ? null : toJson(inner, value);
  }
  if (type === 'object') {
    let json: any = {};
    for (let { key, value: typeData } of layout) {
      json[key] = toJson(typeData, value[key]);
    }
    return json;
  }
  return Leaves.toJson(type, value);
}
