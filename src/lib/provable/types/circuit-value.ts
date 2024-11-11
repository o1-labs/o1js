import 'reflect-metadata';
import { Field } from '../wrapped.js';
import { HashInput, NonMethods } from './provable-derivers.js';
import { Provable } from '../provable.js';
import { AnyConstructor, FlexibleProvable } from './struct.js';

export { CircuitValue, prop, arrayProp };

/**
 * @deprecated `CircuitValue` is deprecated in favor of {@link Struct}, which features a simpler API and better typing.
 */
abstract class CircuitValue {
  constructor(...props: any[]) {
    // if this is called with no arguments, do nothing, to support simple super() calls
    if (props.length === 0) return;

    let fields = this.constructor.prototype._fields;
    if (fields === undefined) return;
    if (props.length !== fields.length) {
      throw Error(
        `${this.constructor.name} constructor called with ${props.length} arguments, but expected ${fields.length}`
      );
    }
    for (let i = 0; i < fields.length; ++i) {
      let [key] = fields[i];
      (this as any)[key] = props[i];
    }
  }

  static fromObject<T extends AnyConstructor>(
    this: T,
    value: NonMethods<InstanceType<T>>
  ): InstanceType<T> {
    return Object.assign(Object.create(this.prototype), value);
  }

  static sizeInFields(): number {
    const fields: [string, any][] = (this as any).prototype._fields;
    return fields.reduce((acc, [_, typ]) => acc + typ.sizeInFields(), 0);
  }

  static toFields<T extends AnyConstructor>(
    this: T,
    v: InstanceType<T>
  ): Field[] {
    const res: Field[] = [];
    const fields = this.prototype._fields;
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

  static toAuxiliary(): [] {
    return [];
  }

  static toInput<T extends AnyConstructor>(
    this: T,
    v: InstanceType<T>
  ): HashInput {
    let input: HashInput = { fields: [], packed: [] };
    let fields = this.prototype._fields;
    if (fields === undefined) return input;
    for (let i = 0, n = fields.length; i < n; ++i) {
      let [key, type] = fields[i];
      if ('toInput' in type) {
        input = HashInput.append(input, type.toInput(v[key]));
        continue;
      }
      // as a fallback, use toFields on the type
      // TODO: this is problematic -- ignores if there's a toInput on a nested type
      // so, remove this? should every provable define toInput?
      let xs: Field[] = type.toFields(v[key]);
      input.fields!.push(...xs);
    }
    return input;
  }

  toFields(): Field[] {
    return (this.constructor as any).toFields(this);
  }

  static toValue<T extends AnyConstructor>(this: T, v: InstanceType<T>) {
    const res: any = {};
    let fields: [string, any][] = (this as any).prototype._fields ?? [];
    fields.forEach(([key, propType]) => {
      res[key] = propType.toValue((v as any)[key]);
    });
    return res;
  }

  static fromValue<T extends AnyConstructor>(
    this: T,
    value: any
  ): InstanceType<T> {
    let props: any = {};
    let fields: [string, any][] = (this as any).prototype._fields ?? [];
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw Error(`${this.name}.fromValue(): invalid input ${value}`);
    }
    for (let i = 0; i < fields.length; ++i) {
      let [key, propType] = fields[i];
      if (value[key] === undefined) {
        throw Error(`${this.name}.fromValue(): invalid input ${value}`);
      } else {
        props[key] = propType.fromValue(value[key]);
      }
    }
    return Object.assign(Object.create(this.prototype), props);
  }

  toJSON(): any {
    return (this.constructor as any).toJSON(this);
  }

  toConstant(): this {
    return (this.constructor as any).toConstant(this);
  }

  equals(x: this) {
    return Provable.equal(this.constructor as any, this, x);
  }

  assertEquals(x: this) {
    Provable.assertEqual(this, x);
  }

  isConstant() {
    return this.toFields().every((x) => x.isConstant());
  }

  static fromFields<T extends AnyConstructor>(
    this: T,
    xs: Field[]
  ): InstanceType<T> {
    const fields: [string, any][] = (this as any).prototype._fields;
    if (xs.length < fields.length) {
      throw Error(
        `${this.name}.fromFields: Expected ${fields.length} field elements, got ${xs?.length}`
      );
    }
    let offset = 0;
    const props: any = {};
    for (let i = 0; i < fields.length; ++i) {
      const [key, propType] = fields[i];
      const propSize = propType.sizeInFields();
      const propVal = propType.fromFields(
        xs.slice(offset, offset + propSize),
        []
      );
      props[key] = propVal;
      offset += propSize;
    }
    return Object.assign(Object.create(this.prototype), props);
  }

  static check<T extends AnyConstructor>(this: T, v: InstanceType<T>) {
    const fields = (this as any).prototype._fields;
    if (fields === undefined || fields === null) {
      return;
    }
    for (let i = 0; i < fields.length; ++i) {
      const [key, propType] = fields[i];
      const value = (v as any)[key];
      if (propType.check === undefined)
        throw Error('bug: CircuitValue without .check()');
      propType.check(value);
    }
  }

  static toCanonical<T extends AnyConstructor>(
    this: T,
    value: InstanceType<T>
  ): InstanceType<T> {
    let canonical: any = {};
    let fields: [string, any][] = (this as any).prototype._fields ?? [];
    fields.forEach(([key, type]) => {
      canonical[key] = Provable.toCanonical(type, value[key]);
    });
    return canonical;
  }

  static toConstant<T extends AnyConstructor>(
    this: T,
    t: InstanceType<T>
  ): InstanceType<T> {
    const xs: Field[] = (this as any).toFields(t);
    return (this as any).fromFields(xs.map((x) => x.toConstant()));
  }

  static toJSON<T extends AnyConstructor>(this: T, v: InstanceType<T>) {
    const res: any = {};
    if ((this as any).prototype._fields !== undefined) {
      const fields: [string, any][] = (this as any).prototype._fields;
      fields.forEach(([key, propType]) => {
        res[key] = propType.toJSON((v as any)[key]);
      });
    }
    return res;
  }

  static fromJSON<T extends AnyConstructor>(
    this: T,
    value: any
  ): InstanceType<T> {
    let props: any = {};
    let fields: [string, any][] = (this as any).prototype._fields;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw Error(`${this.name}.fromJSON(): invalid input ${value}`);
    }
    if (fields !== undefined) {
      for (let i = 0; i < fields.length; ++i) {
        let [key, propType] = fields[i];
        if (value[key] === undefined) {
          throw Error(`${this.name}.fromJSON(): invalid input ${value}`);
        } else {
          props[key] = propType.fromJSON(value[key]);
        }
      }
    }
    return Object.assign(Object.create(this.prototype), props);
  }

  static empty<T extends AnyConstructor>(): InstanceType<T> {
    const fields: [string, any][] = (this as any).prototype._fields ?? [];
    let props: any = {};
    fields.forEach(([key, propType]) => {
      props[key] = propType.empty();
    });
    return Object.assign(Object.create(this.prototype), props);
  }
}

function prop(this: any, target: any, key: string) {
  const fieldType = Reflect.getMetadata('design:type', target, key);
  if (!target.hasOwnProperty('_fields')) {
    target._fields = [];
  }
  if (fieldType === undefined) {
  } else if (fieldType.toFields && fieldType.fromFields) {
    target._fields.push([key, fieldType]);
  } else {
    console.log(
      `warning: property ${key} missing field element conversion methods`
    );
  }
}

function arrayProp<T>(elementType: FlexibleProvable<T>, length: number) {
  return function (target: any, key: string) {
    if (!target.hasOwnProperty('_fields')) {
      target._fields = [];
    }
    target._fields.push([key, Provable.Array(elementType, length)]);
  };
}
