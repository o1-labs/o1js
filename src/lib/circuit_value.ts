import 'reflect-metadata';
import { Circuit, Field, Bool, JSONValue, AsFieldElements } from '../snarky';

export {
  asFieldElementsToConstant,
  CircuitValue,
  prop,
  arrayProp,
  matrixProp,
  public_,
  circuitMain,
  cloneCircuitValue,
  circuitValueEquals,
  circuitArray,
};

type Constructor<T> = { new (...args: any[]): T };

function asFieldElementsToConstant<T>(typ: AsFieldElements<T>, t: T): T {
  const xs: Field[] = typ.toFields(t);
  return typ.ofFields(xs);
}

// TODO: Synthesize the constructor if possible (bkase)
//
abstract class CircuitValue {
  static sizeInFields(): number {
    const fields: [string, any][] = (this as any).prototype._fields;
    return fields.reduce((acc, [_, typ]) => acc + typ.sizeInFields(), 0);
  }

  static toFields<T>(this: Constructor<T>, v: T): Field[] {
    const res: Field[] = [];
    const fields = (this as any).prototype._fields;
    if (fields === undefined || fields === null) {
      return res;
    }

    for (let i = 0, n = fields.length; i < n; ++i) {
      const [key, propType] = fields[i];
      const subElts: Field[] = propType.toFields((v as any)[key]);
      subElts.forEach((x) => res.push(x));
    }
    return res;
  }

  toFields(): Field[] {
    return (this.constructor as any).toFields(this);
  }

  toJSON(): JSONValue {
    return (this.constructor as any).toJSON(this);
  }

  equals(this: this, x: this): Bool {
    return Circuit.equal(this, x);
  }

  assertEquals(this: this, x: typeof this): void {
    Circuit.assertEqual(this, x);
  }

  static ofFields<T>(this: Constructor<T>, xs: Field[]): T {
    const fields = (this as any).prototype._fields;
    let offset = 0;
    const props: any[] = [];
    for (let i = 0; i < fields.length; ++i) {
      const propType = fields[i][1];
      const propSize = propType.sizeInFields();
      const propVal = propType.ofFields(xs.slice(offset, offset + propSize));
      props.push(propVal);
      offset += propSize;
    }
    return new this(...props);
  }

  static toConstant<T>(this: Constructor<T>, t: T): T {
    const xs: Field[] = (this as any).toFields(t);
    return (this as any).ofFields(xs.map((x) => x.toConstant()));
  }

  static toJSON<T>(this: Constructor<T>, v: T): JSONValue {
    const res: { [key: string]: JSONValue } = {};
    if ((this as any).prototype._fields !== undefined) {
      const fields: [string, any][] = (this as any).prototype._fields;
      fields.forEach(([key, propType]) => {
        res[key] = propType.toJSON((v as any)[key]);
      });
    }
    return res;
  }

  static fromJSON<T>(this: Constructor<T>, value: JSONValue): T | null {
    const props: any[] = [];
    const fields: [string, any][] = (this as any).prototype._fields;

    switch (typeof value) {
      case 'object':
        if (value === null || Array.isArray(value)) {
          return null;
        }
        break;
      default:
        return null;
    }

    if (fields !== undefined) {
      for (let i = 0; i < fields.length; ++i) {
        const [key, propType] = fields[i];
        if (value[key] === undefined) {
          return null;
        } else {
          props.push(propType.fromJSON(value[key]));
        }
      }
    }

    return new this(...props);
  }
}

(CircuitValue as any).check = function (v: any) {
  const fields = (this as any).prototype._fields;
  if (fields === undefined || fields === null) {
    return;
  }

  for (let i = 0; i < fields.length; ++i) {
    const [key, propType] = fields[i];
    const value = (v as any)[key];
    if (propType.check === undefined)
      throw Error('bug: circuit value without .check()');
    propType.check(value);
  }
};

function prop(this: any, target: any, key: string) {
  const fieldType = Reflect.getMetadata('design:type', target, key);
  if (!target.hasOwnProperty('_fields')) {
    target._fields = [];
  }
  if (fieldType === undefined) {
  } else if (fieldType.toFields && fieldType.ofFields) {
    target._fields.push([key, fieldType]);
  } else {
    console.log(
      `warning: property ${key} missing field element conversion methods`
    );
  }
}

function circuitArray<T>(elementType: AsFieldElements<T>, length: number) {
  return {
    sizeInFields() {
      let elementLength = elementType.sizeInFields();
      return elementLength * length;
    },
    toFields(array: T[]) {
      return array.map((e) => elementType.toFields(e)).flat();
    },
    ofFields(fields: Field[]) {
      let array = [];
      let elementLength = elementType.sizeInFields();
      length = elementLength * length;
      for (let i = 0; i < length; i += elementLength) {
        array.push(elementType.ofFields(fields.slice(i, i + elementLength)));
      }
      return array;
    },
    check(array: T[]) {
      for (let i = 0; i < length; i++) {
        (elementType as any).check(array[i]);
      }
    },
  };
}

function arrayProp<T>(elementType: AsFieldElements<T>, length: number) {
  return function (target: any, key: string) {
    if (!target.hasOwnProperty('_fields')) {
      target._fields = [];
    }
    target._fields.push([key, circuitArray(elementType, length)]);
  };
}

function matrixProp<T>(
  elementType: AsFieldElements<T>,
  nRows: number,
  nColumns: number
) {
  return function (target: any, key: string) {
    if (!target.hasOwnProperty('_fields')) {
      target._fields = [];
    }
    target._fields.push([
      key,
      circuitArray(circuitArray(elementType, nColumns), nRows),
    ]);
  };
}

function public_(target: any, _key: string | symbol, index: number) {
  // const fieldType = Reflect.getMetadata('design:paramtypes', target, key);

  if (target._public === undefined) {
    target._public = [];
  }
  target._public.push(index);
}

function typeOfArray(typs: Array<AsFieldElements<any>>): AsFieldElements<any> {
  return {
    sizeInFields: () => {
      return typs.reduce((acc, typ) => acc + typ.sizeInFields(), 0);
    },

    toFields: (t: Array<any>) => {
      if (t.length !== typs.length) {
        throw new Error(`typOfArray: Expected ${typs.length}, got ${t.length}`);
      }

      let res = [];
      for (let i = 0; i < t.length; ++i) {
        res.push(...typs[i].toFields(t[i]));
      }
      return res;
    },

    ofFields: (xs: Array<any>) => {
      let offset = 0;
      let res: Array<any> = [];
      typs.forEach((typ) => {
        const n = typ.sizeInFields();
        res.push(typ.ofFields(xs.slice(offset, offset + n)));
        offset += n;
      });
      return res;
    },

    check(xs: Array<any>) {
      typs.forEach((typ, i) => (typ as any).check(xs[i]));
    },
  };
}

function circuitMain(
  target: any,
  propertyName: string,
  _descriptor?: PropertyDescriptor
): any {
  const paramTypes = Reflect.getMetadata(
    'design:paramtypes',
    target,
    propertyName
  );
  const numArgs = paramTypes.length;

  const publicIndexSet: Set<number> = new Set(target._public);
  const witnessIndexSet: Set<number> = new Set();
  for (let i = 0; i < numArgs; ++i) {
    if (!publicIndexSet.has(i)) {
      witnessIndexSet.add(i);
    }
  }

  target.snarkyMain = (w: Array<any>, pub: Array<any>) => {
    let args = [];
    for (let i = 0; i < numArgs; ++i) {
      args.push((publicIndexSet.has(i) ? pub : w).shift());
    }

    return target[propertyName].apply(target, args);
  };

  target.snarkyWitnessTyp = typeOfArray(
    Array.from(witnessIndexSet).map((i) => paramTypes[i])
  );
  target.snarkyPublicTyp = typeOfArray(
    Array.from(publicIndexSet).map((i) => paramTypes[i])
  );
}

let primitives = new Set(['Field', 'Bool', 'Scalar', 'Group']);

function cloneCircuitValue<T>(obj: T): T {
  // primitive JS types and functions aren't cloned
  if (typeof obj !== 'object' || obj === null) return obj;

  // built-in JS datatypes with custom cloning strategies
  if (Array.isArray(obj)) return obj.map(cloneCircuitValue) as any as T;
  if (obj instanceof Set)
    return new Set([...obj].map(cloneCircuitValue)) as any as T;
  if (obj instanceof Map)
    return new Map(
      [...obj].map(([k, v]) => [k, cloneCircuitValue(v)])
    ) as any as T;
  if (ArrayBuffer.isView(obj)) return new (obj.constructor as any)(obj);

  // snarkyjs primitives aren't cloned
  if (primitives.has((obj as any).constructor.name)) return obj;

  // cloning strategy that works for plain objects AND classes whose constructor only assigns properties
  let propertyDescriptors: Record<string, PropertyDescriptor> = {};
  for (let [key, value] of Object.entries(obj)) {
    propertyDescriptors[key] = {
      value: cloneCircuitValue(value),
      writable: true,
      enumerable: true,
      configurable: true,
    };
  }
  return Object.create(Object.getPrototypeOf(obj), propertyDescriptors);
}

function circuitValueEquals<T>(a: T, b: T): boolean {
  // primitive JS types and functions are checked for exact equality
  if (typeof a !== 'object' || a === null) return a === b;

  // built-in JS datatypes with custom equality checks
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((a_, i) => circuitValueEquals(a_, b[i]))
    );
  }
  if (a instanceof Set) {
    return (
      b instanceof Set && a.size === b.size && [...a].every((a_) => b.has(a_))
    );
  }
  if (a instanceof Map) {
    return (
      b instanceof Map &&
      a.size === b.size &&
      [...a].every(([k, v]) => circuitValueEquals(v, b.get(k)))
    );
  }
  if (ArrayBuffer.isView(a) && !(a instanceof DataView)) {
    // typed array
    return (
      ArrayBuffer.isView(b) &&
      !(b instanceof DataView) &&
      circuitValueEquals([...(a as any)], [...(b as any)])
    );
  }

  // the two checks below cover snarkyjs primitives and CircuitValues
  // if we have an .equals method, try to use it
  if ('equals' in a && typeof (a as any).equals === 'function') {
    let isEqual = (a as any).equals(b).toBoolean();
    if (typeof isEqual === 'boolean') return isEqual;
    if (isEqual instanceof Bool) return isEqual.toBoolean();
  }
  // if we have a .toFields method, try to use it
  if (
    'toFields' in a &&
    typeof (a as any).toFields === 'function' &&
    'toFields' in b &&
    typeof (b as any).toFields === 'function'
  ) {
    let aFields = (a as any).toFields() as Field[];
    let bFields = (b as any).toFields() as Field[];
    return aFields.every((a, i) => a.equals(bFields[i]).toBoolean());
  }

  // equality test that works for plain objects AND classes whose constructor only assigns properties
  let aEntries = Object.entries(a).filter(([, v]) => v !== undefined);
  let bEntries = Object.entries(b).filter(([, v]) => v !== undefined);
  if (aEntries.length !== bEntries.length) return false;
  return aEntries.every(
    ([key, value]) => key in b && circuitValueEquals((b as any)[key], value)
  );
}
