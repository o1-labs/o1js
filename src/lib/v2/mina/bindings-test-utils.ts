import { Field } from '../../provable/field.js'
import { Provable } from '../../provable/provable.js'
import { expect } from 'expect';

export function stripPrototypes(x: any): any {
  if(typeof x === 'object') {
    if(x instanceof Array) {
      return [...x].map(stripPrototypes);
    } else {
      const obj: {[key: string]: any} = {};
      for(const key in Object.keys(obj)) {
        obj[key] = x[key];
      }
      return obj;
    }
  } else {
    return x;
  }
}

export function v1FetchLayout(root: any, path: string[]): any {
  let here = root;

  for(const key of path) {
    switch(here.type) {
      case 'object':
        if(!(key in here.entries)) throw new Error(`invalid layout path: object type ${here.name} does not have key ${key}`);
        here = here.entries[key];
        break;
      case 'array':
      case 'option':
        if(key !== 'inner') throw new Error(`invalid layout path: found ${here.type}, and expected the key to be inner, but path had a key of ${key}`);
        here = here.inner;
        break;
      default:
        throw new Error(`invalid layout path: reached ${here.type} before end of path`);
    }
  }

  return here;
}

export type ProvableTypeDef<T> = Provable<T> & {
  empty(): T;
  toJSON(x: T): any;
};

export type V2Type<V1, V2 extends V2Value<V1>> = ProvableTypeDef<V2> & {
  fromInternalRepr(x: V1): V2;
};

export interface V2Value<V1> {
  toInternalRepr(): V1;
  toJSON(): any;
  toFields(): Field[];
}

export function testV1V2ClassEquivalence<V1, V2 extends V2Value<V1>>(
  V1Type: ProvableTypeDef<V1>,
  V2Type: V2Type<V1, V2>,
) {
  expect(V2Type.sizeInFields()).toBe(V1Type.sizeInFields());
  testV1V2ValueEquivalence(V1Type, V2Type, V1Type.empty(), V2Type.empty());
}

export function testV1V2ValueEquivalence<V1, V2 extends V2Value<V1>>(
  V1Type: ProvableTypeDef<V1>,
  V2Type: V2Type<V1, V2>,
  v1Value: V1,
  v2Value: V2
) {
  // v2 instance and class methods match
  expect(v2Value.toJSON())
    .toEqual(V2Type.toJSON(v2Value));
  expect(v2Value.toFields())
    .toEqual(V2Type.toFields(v2Value));

  // conversion
  expect(stripPrototypes(v2Value.toInternalRepr()))
    .toEqual(stripPrototypes(v1Value));
  expect(V2Type.fromInternalRepr(v1Value))
    .toEqual(v2Value);

  // json equality
  expect(v2Value.toJSON())
    .toEqual(V1Type.toJSON(v1Value));

  // fields equality
  expect(v2Value.toFields())
    .toEqual(V1Type.toFields(v1Value));

  // v1 -> v2 via fields
  expect(V2Type.fromFields(V1Type.toFields(v1Value), V1Type.toAuxiliary(v1Value)))
    .toEqual(v2Value);

  // v1 -> v2 via fields
  expect(V1Type.fromFields(V2Type.toFields(v2Value), V2Type.toAuxiliary(v2Value)))
    .toEqual(v1Value);
}

