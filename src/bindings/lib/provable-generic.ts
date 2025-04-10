import {
  GenericHashInput,
  GenericProvable,
  GenericProvablePure,
  GenericProvableExtended,
  GenericProvableExtendedPure,
  GenericSignable,
} from './generic.js';

export {
  createDerivers,
  createHashInput,
  ProvableConstructor,
  SignableConstructor,
  NonMethods,
  InferProvable,
  InferJson,
  InferValue,
  InferredProvable,
  IsPure,
  From,
  Constructor,
  NestedProvable,
  InferProvableNested,
  InferJsonNested,
  InferValueNested,
};

type ProvableConstructor<Field> = <A>(
  typeObj: A,
  /**
   * @deprecated
   */
  options?: { isPure?: boolean }
) => InferredProvable<A, Field>;
type SignableConstructor<Field> = <A>(typeObj: A) => InferredSignable<A, Field>;

let complexTypes = new Set(['object', 'function']);
let primitives = new Set([Number, String, Boolean, BigInt, null, undefined]);

function createDerivers<Field>(): {
  provable: ProvableConstructor<Field>;
  signable: SignableConstructor<Field>;
} {
  type Signable<T, TJson = JSONValue> = GenericSignable<T, TJson, Field>;
  type ProvableExtended<
    T,
    TValue = any,
    TJson = JSONValue
  > = GenericProvableExtended<T, TValue, TJson, Field>;
  type HashInput = GenericHashInput<Field>;
  const HashInput = createHashInput<Field>();

  /**
   * A function that gives us a hint that the input type is a `Provable` and we shouldn't continue
   * recursing into its properties, when computing methods that aren't required by the `Provable` interface.
   */
  function isProvable(
    typeObj: object
  ): typeObj is GenericProvable<any, any, Field> {
    return (
      'sizeInFields' in typeObj &&
      'toFields' in typeObj &&
      'fromFields' in typeObj &&
      'check' in typeObj &&
      'toValue' in typeObj &&
      'fromValue' in typeObj &&
      'toAuxiliary' in typeObj
    );
  }

  /**
   * Accepts objects of the form { provable: Provable }
   */
  function hasProvable(
    typeObj: object
  ): typeObj is { provable: GenericProvable<any, any, Field> } {
    return (
      'provable' in typeObj &&
      (typeof typeObj.provable === 'object' ||
        typeof typeObj.provable === 'function') &&
      typeObj.provable !== null &&
      isProvable(typeObj.provable)
    );
  }

  function provable<A>(typeObj: A): InferredProvable<A, Field> {
    type T = InferProvable<A, Field>;
    type V = InferValue<A>;
    type J = InferJson<A>;

    if (!isPrimitive(typeObj) && !complexTypes.has(typeof typeObj)) {
      throw Error(`provable: unsupported type "${typeObj}"`);
    }

    function sizeInFields(typeObj: NestedProvable<Field>): number {
      if (isPrimitive(typeObj)) return 0;

      if (!complexTypes.has(typeof typeObj))
        throw Error(`provable: unsupported type "${typeObj}"`);

      if (hasProvable(typeObj)) return typeObj.provable.sizeInFields();

      if (Array.isArray(typeObj))
        return typeObj.map(sizeInFields).reduce((a, b) => a + b, 0);

      if (isProvable(typeObj)) return typeObj.sizeInFields();

      return Object.values(typeObj)
        .map(sizeInFields)
        .reduce((a, b) => a + b, 0);
    }

    function toFields(typeObj: NestedProvable<Field>, obj: any): Field[] {
      if (isPrimitive(typeObj)) return [];

      if (!complexTypes.has(typeof typeObj))
        throw Error(`provable: unsupported type "${typeObj}"`);

      if (hasProvable(typeObj)) return typeObj.provable.toFields(obj);

      if (Array.isArray(typeObj)) {
        if (!Array.isArray(obj)) {
          if (typeof obj === 'object') {
            return typeObj.map((t, i) => toFields(t, obj[i])).flat();
          }
          throw Error(`Expected an array for type, but got ${typeof obj}`);
        }
        if (typeObj.length !== obj.length) {
          throw Error(
            `Expected array length ${typeObj.length}, but got ${obj.length}`
          );
        }
        return typeObj.map((t, i) => toFields(t, obj[i])).flat();
      }

      if (isProvable(typeObj)) return typeObj.toFields(obj);

      return Object.keys(typeObj)
        .map((k) => toFields(typeObj[k], obj[k]))
        .flat();
    }

    function toAuxiliary(typeObj: NestedProvable<Field>, obj?: any): any[] {
      if (typeObj === Number) return [obj ?? 0];
      if (typeObj === String) return [obj ?? ''];
      if (typeObj === Boolean) return [obj ?? false];
      if (typeObj === BigInt) return [obj ?? 0n];
      if (typeObj === undefined || typeObj === null) return [];

      if (isPrimitive(typeObj) || !complexTypes.has(typeof typeObj))
        throw Error(`provable: unsupported type "${typeObj}"`);

      if (hasProvable(typeObj)) return typeObj.provable.toAuxiliary(obj);

      if (Array.isArray(typeObj))
        return typeObj.map((t, i) => toAuxiliary(t, obj?.[i]));

      if (isProvable(typeObj)) return typeObj.toAuxiliary(obj);

      return Object.keys(typeObj).map((k) => toAuxiliary(typeObj[k], obj?.[k]));
    }

    function fromFields(
      typeObj: NestedProvable<Field>,
      fields: Field[],
      aux: any[] = []
    ): any {
      if (
        typeObj === Number ||
        typeObj === String ||
        typeObj === Boolean ||
        typeObj === BigInt
      )
        return aux[0];
      if (typeObj === undefined || typeObj === null) return typeObj;

      if (isPrimitive(typeObj) || !complexTypes.has(typeof typeObj))
        throw Error(`provable: unsupported type "${typeObj}"`);

      if (hasProvable(typeObj)) return typeObj.provable.fromFields(fields, aux);

      if (Array.isArray(typeObj)) {
        let array: any[] = [];
        let i = 0;
        let offset = 0;
        for (let subObj of typeObj) {
          let size = sizeInFields(subObj);
          array.push(
            fromFields(subObj, fields.slice(offset, offset + size), aux[i])
          );
          offset += size;
          i++;
        }
        return array;
      }

      if (isProvable(typeObj)) return typeObj.fromFields(fields, aux);

      let keys = Object.keys(typeObj);
      let values = fromFields(
        keys.map((k) => typeObj[k]),
        fields,
        aux
      );
      return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
    }

    function check(typeObj: NestedProvable<Field>, obj: any): void {
      if (isPrimitive(typeObj)) return;

      if (!complexTypes.has(typeof typeObj))
        throw Error(`provable: unsupported type "${typeObj}"`);

      if (hasProvable(typeObj)) return typeObj.provable.check(obj);

      if (Array.isArray(typeObj))
        return typeObj.forEach((t, i) => check(t, obj[i]));

      if (isProvable(typeObj)) return typeObj.check(obj);

      if (display(typeObj) === 'Struct') {
        throw new Error(
          `provable: cannot run check() on 'Struct' type. ` +
            `Instead of using 'Struct' directly, extend 'Struct' to create a specific type.\n\n` +
            `Example:\n` +
            `// Incorrect Usage:\n` +
            `class MyStruct extends Struct({\n` +
            `  fieldA: Struct, // This is incorrect\n` +
            `}) {}\n\n` +
            `// Correct Usage:\n` +
            `class MyStruct extends Struct({\n` +
            `  fieldA: MySpecificStruct, // Use the specific struct type\n` +
            `}) {}\n`
        );
      }

      if (typeof typeObj === 'function') {
        throw new Error(
          `provable: invalid type detected. Functions are not supported as types. ` +
            `Ensure you are passing an instance of a supported type or an anonymous object.\n`
        );
      }

      // Only recurse into the object if it's an object and not a function
      return Object.keys(typeObj).forEach((k) => check(typeObj[k], obj[k]));
    }

    function toCanonical(typeObj: NestedProvable<Field>, value: any): any {
      if (isPrimitive(typeObj)) return value;

      if (!complexTypes.has(typeof typeObj))
        throw Error(`provable: unsupported type "${typeObj}"`);

      if (hasProvable(typeObj))
        return typeObj.provable.toCanonical?.(value) ?? value;

      if (Array.isArray(typeObj)) {
        return typeObj.forEach((t, i) => toCanonical(t, value[i]));
      }

      if (isProvable(typeObj)) return typeObj.toCanonical?.(value) ?? value;

      return Object.fromEntries(
        Object.keys(typeObj).map((k) => {
          return [k, toCanonical(typeObj[k], value[k])];
        })
      );
    }

    const toValue = createMap('toValue');
    const fromValue = createMap('fromValue');

    let { empty, fromJSON, toJSON, toInput } = signable(
      typeObj,
      // if one of these is true, we don't want to continue searching for 'signable' methods
      (obj) => isProvable(obj) || hasProvable(obj)
    );

    type S = InferSignable<A, Field>;

    const type = typeObj as NestedProvable<Field>;

    return {
      sizeInFields: () => sizeInFields(type),
      toFields: (obj: T) => toFields(type, obj),
      toAuxiliary: (obj?: T) => toAuxiliary(type, obj),
      fromFields: (fields: Field[], aux: any[]) =>
        fromFields(type, fields, aux) as T,
      check: (obj: T) => check(type, obj),
      toValue(x) {
        return toValue(type, x);
      },
      fromValue(v) {
        return fromValue(type, v);
      },
      toCanonical(x) {
        return toCanonical(type, x);
      },
      toInput: (obj: T) => toInput(obj as S),
      toJSON: (obj: T) => toJSON(obj as S) satisfies J,
      fromJSON: (json: J) => fromJSON(json) as T,
      empty: () => empty() as T,
    } satisfies ProvableExtended<T, V, J> as InferredProvable<A, Field>;
  }

  function signable<A>(
    typeObj: A,
    shouldTerminate?: (typeObj: object) => boolean
  ): InferredSignable<A, Field> {
    type T = InferSignable<A, Field>;
    type J = InferJson<A>;
    let objectKeys =
      typeof typeObj === 'object' && typeObj !== null
        ? Object.keys(typeObj)
        : [];
    let primitives = new Set([
      Number,
      String,
      Boolean,
      BigInt,
      null,
      undefined,
    ]);
    if (!primitives.has(typeObj as any) && !complexTypes.has(typeof typeObj)) {
      throw Error(`provable: unsupported type "${typeObj}"`);
    }

    function toInput(typeObj: any, obj: any): HashInput {
      if (primitives.has(typeObj)) return {};
      if (!complexTypes.has(typeof typeObj))
        throw Error(`provable: unsupported type "${typeObj}"`);

      if ('provable' in typeObj) return toInput(typeObj.provable, obj);

      if (Array.isArray(typeObj)) {
        return typeObj
          .map((t, i) => toInput(t, obj[i]))
          .reduce(HashInput.append, HashInput.empty);
      }
      if ('toInput' in typeObj) return typeObj.toInput(obj) as HashInput;
      if ('toFields' in typeObj) {
        return { fields: typeObj.toFields(obj) };
      }
      return Object.keys(typeObj)
        .map((k) => toInput(typeObj[k], obj[k]))
        .reduce(HashInput.append, HashInput.empty);
    }
    function toJSON(typeObj: any, obj: any): JSONValue {
      if (typeObj === BigInt) return obj.toString();
      if (typeObj === String || typeObj === Number || typeObj === Boolean)
        return obj;
      if (typeObj === undefined || typeObj === null) return null;
      if (!complexTypes.has(typeof typeObj))
        throw Error(`provable: unsupported type "${typeObj}"`);

      if ('provable' in typeObj) return toJSON(typeObj.provable, obj);

      if (Array.isArray(typeObj))
        return typeObj.map((t, i) => toJSON(t, obj[i]));
      if ('toJSON' in typeObj) return typeObj.toJSON(obj);

      if (shouldTerminate?.(typeObj) === true) {
        throw Error(`Expected \`toJSON()\` method on ${display(typeObj)}`);
      }

      return Object.fromEntries(
        Object.keys(typeObj).map((k) => [k, toJSON(typeObj[k], obj[k])])
      );
    }

    function fromJSON(typeObj: any, json: any): any {
      if (typeObj === BigInt) return BigInt(json as string);
      if (typeObj === String || typeObj === Number || typeObj === Boolean)
        return json;
      if (typeObj === null || typeObj === undefined) return undefined;
      if (!complexTypes.has(typeof typeObj))
        throw Error(`provable: unsupported type "${typeObj}"`);

      if ('provable' in typeObj) return fromJSON(typeObj.provable, json);

      if (Array.isArray(typeObj))
        return typeObj.map((t, i) => fromJSON(t, json[i]));
      if ('fromJSON' in typeObj) return typeObj.fromJSON(json);

      if (shouldTerminate?.(typeObj) === true) {
        throw Error(`Expected \`fromJSON()\` method on ${display(typeObj)}`);
      }

      let keys = Object.keys(typeObj);
      let values = fromJSON(
        keys.map((k) => typeObj[k]),
        keys.map((k) => json[k])
      );
      return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
    }

    function empty(typeObj: any): any {
      if (typeObj === Number) return 0;
      if (typeObj === String) return '';
      if (typeObj === Boolean) return false;
      if (typeObj === BigInt) return 0n;
      if (typeObj === null || typeObj === undefined) return typeObj;
      if (!complexTypes.has(typeof typeObj))
        throw Error(`provable: unsupported type "${typeObj}"`);

      if ('provable' in typeObj) return empty(typeObj.provable);

      if (Array.isArray(typeObj)) return typeObj.map(empty);
      if ('empty' in typeObj) return typeObj.empty();

      if (shouldTerminate?.(typeObj) === true) {
        throw Error(`Expected \`empty()\` method on ${display(typeObj)}`);
      }

      return Object.fromEntries(
        Object.keys(typeObj).map((k) => [k, empty(typeObj[k])])
      );
    }

    return {
      toInput: (obj: T) => toInput(typeObj, obj),
      toJSON: (obj: T) => toJSON(typeObj, obj) as J,
      fromJSON: (json: J) => fromJSON(typeObj, json),
      empty: () => empty(typeObj) as T,
    } satisfies Signable<T, J> as InferredSignable<A, Field>;
  }

  function display(typeObj: object) {
    if ('name' in typeObj) return typeObj.name;
    return 'anonymous type object';
  }

  function createMap<S extends string>(name: S) {
    function map(typeObj: any, obj: any): any {
      if (primitives.has(typeObj)) return obj;
      if (!complexTypes.has(typeof typeObj))
        throw Error(`provable: unsupported type "${typeObj}"`);

      if (hasProvable(typeObj) && name in typeObj.provable)
        return (typeObj.provable as any)[name](obj);

      if (Array.isArray(typeObj)) return typeObj.map((t, i) => map(t, obj[i]));
      if (name in typeObj) return typeObj[name](obj);
      return Object.fromEntries(
        Object.keys(typeObj).map((k) => [k, map(typeObj[k], obj[k])])
      );
    }
    return map;
  }

  return { provable, signable };
}

function isPrimitive(typeObj: any): typeObj is Primitive {
  return primitives.has(typeObj);
}

function createHashInput<Field>() {
  type HashInput = GenericHashInput<Field>;
  return {
    get empty() {
      return {};
    },
    append(input1: HashInput, input2: HashInput): HashInput {
      return {
        fields: (input1.fields ?? []).concat(input2.fields ?? []),
        packed: (input1.packed ?? []).concat(input2.packed ?? []),
      };
    },
  };
}

// some type inference helpers

type JSONValue =
  | number
  | string
  | boolean
  | null
  | Array<JSONValue>
  | { [key: string]: JSONValue };

type Struct<T, Field> = GenericProvableExtended<
  NonMethods<T>,
  any,
  any,
  Field
> &
  Constructor<T> & { _isStruct: true };

type NonMethodKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];
type NonMethods<T> = Pick<T, NonMethodKeys<T>>;

type Constructor<T> = new (...args: any) => T;

type Tuple<T> = [T, ...T[]] | [];

type Primitive =
  | typeof String
  | typeof Number
  | typeof Boolean
  | typeof BigInt
  | null
  | undefined;
type InferPrimitive<P extends Primitive> = P extends typeof String
  ? string
  : P extends typeof Number
  ? number
  : P extends typeof Boolean
  ? boolean
  : P extends typeof BigInt
  ? bigint
  : P extends null
  ? null
  : P extends undefined
  ? undefined
  : any;

type InferPrimitiveValue<P extends Primitive> = P extends typeof String
  ? string
  : P extends typeof Number
  ? number
  : P extends typeof Boolean
  ? boolean
  : P extends typeof BigInt
  ? bigint
  : P extends null
  ? null
  : P extends undefined
  ? undefined
  : any;

type InferPrimitiveJson<P extends Primitive> = P extends typeof String
  ? string
  : P extends typeof Number
  ? number
  : P extends typeof Boolean
  ? boolean
  : P extends typeof BigInt
  ? string
  : P extends null
  ? null
  : P extends undefined
  ? null
  : any;

type NestedProvable<Field> =
  | Primitive
  | { provable: GenericProvable<any, any, Field> }
  | GenericProvable<any, any, Field>
  | [NestedProvable<Field>, ...NestedProvable<Field>[]]
  | NestedProvable<Field>[]
  | { [key: string]: NestedProvable<Field> };

type InferProvable<A, Field> = A extends { provable: Constructor<infer U> }
  ? A extends { provable: GenericProvable<U, any, Field> }
    ? U
    : A extends { provable: Struct<U, Field> }
    ? U
    : InferProvableBase<A, Field>
  : A extends Constructor<infer U>
  ? A extends GenericProvable<U, any, Field>
    ? U
    : A extends Struct<U, Field>
    ? U
    : InferProvableBase<A, Field>
  : InferProvableBase<A, Field>;

type InferProvableBase<A, Field> = A extends {
  provable: GenericProvable<infer U, any, Field>;
}
  ? U
  : A extends GenericProvable<infer U, any, Field>
  ? U
  : A extends Primitive
  ? InferPrimitive<A>
  : A extends Tuple<any>
  ? {
      [I in keyof A]: InferProvable<A[I], Field>;
    }
  : A extends (infer U)[]
  ? InferProvable<U, Field>[]
  : A extends Record<any, any>
  ? {
      [K in keyof A]: InferProvable<A[K], Field>;
    }
  : never;

type InferValue<A> = A extends { provable: GenericProvable<any, infer U, any> }
  ? U
  : A extends GenericProvable<any, infer U, any>
  ? U
  : A extends Primitive
  ? InferPrimitiveValue<A>
  : A extends Tuple<any>
  ? {
      [I in keyof A]: InferValue<A[I]>;
    }
  : A extends (infer U)[]
  ? InferValue<U>[]
  : A extends Record<any, any>
  ? {
      [K in keyof A]: InferValue<A[K]>;
    }
  : never;

type WithJson<J> = { toJSON: (x: any) => J };

type InferJson<A> = A extends { provable: WithJson<infer J> }
  ? J
  : A extends WithJson<infer J>
  ? J
  : A extends Primitive
  ? InferPrimitiveJson<A>
  : A extends Tuple<any>
  ? {
      [I in keyof A]: InferJson<A[I]>;
    }
  : A extends (infer U)[]
  ? InferJson<U>[]
  : A extends Record<any, any>
  ? {
      [K in keyof A]: InferJson<A[K]>;
    }
  : JSONValue;

type IsPure<A, Field> = IsPureBase<A, Field> extends true ? true : false;

type IsPureBase<A, Field> = A extends {
  provable: GenericProvablePure<any, any, Field>;
}
  ? true
  : A extends GenericProvablePure<any, any, Field>
  ? true
  : A extends { provable: GenericProvable<any, any, Field> }
  ? false
  : A extends GenericProvable<any, any, Field>
  ? false
  : A extends Primitive
  ? false
  : A extends (infer U)[]
  ? IsPure<U, Field>
  : A extends Record<any, any>
  ? {
      [K in keyof A]: IsPure<A[K], Field>;
    }[keyof A]
  : false;

type InferredProvable<A, Field> = IsPure<A, Field> extends true
  ? GenericProvableExtendedPure<
      InferProvable<A, Field>,
      InferValue<A>,
      InferJson<A>,
      Field
    >
  : GenericProvableExtended<
      InferProvable<A, Field>,
      InferValue<A>,
      InferJson<A>,
      Field
    >;

// signable

type InferSignable<A, Field> = A extends {
  provable: GenericSignable<infer U, any, Field>;
}
  ? U
  : A extends GenericSignable<infer U, any, Field>
  ? U
  : A extends Primitive
  ? InferPrimitive<A>
  : A extends Tuple<any>
  ? {
      [I in keyof A]: InferSignable<A[I], Field>;
    }
  : A extends (infer U)[]
  ? InferSignable<U, Field>[]
  : A extends Record<any, any>
  ? {
      [K in keyof A]: InferSignable<A[K], Field>;
    }
  : never;

type InferredSignable<A, Field> = GenericSignable<
  InferSignable<A, Field>,
  InferJson<A>,
  Field
>;

// deep union type for flexible fromValue

type From<A> = A extends {
  provable: {
    fromValue: (x: infer U) => any;
  } & GenericProvable<any, any, any>;
}
  ? U | InferProvable<A, any>
  : A extends {
      fromValue: (x: infer U) => any;
    } & GenericProvable<any, any, any>
  ? U | InferProvable<A, any>
  : A extends GenericProvable<any, any, any>
  ? InferProvable<A, any> | InferValue<A>
  : A extends Primitive
  ? InferPrimitiveValue<A>
  : A extends Tuple<any>
  ? {
      [I in keyof A]: From<A[I]>;
    }
  : A extends (infer U)[]
  ? From<U>[]
  : A extends Record<any, any>
  ? {
      [K in keyof A]: From<A[K]>;
    }
  : never;

// nested

type InferProvableNested<
  Field,
  A extends NestedProvable<Field>
> = A extends Primitive
  ? InferPrimitive<A>
  : A extends { provable: GenericProvable<infer P, any, any> }
  ? P
  : A extends GenericProvable<infer P, any, any>
  ? P
  : A extends [NestedProvable<Field>, ...NestedProvable<Field>[]]
  ? {
      [I in keyof A & number]: InferProvableNested<Field, A[I]>;
    }
  : A extends (infer U extends NestedProvable<Field>)[]
  ? InferProvableNested<Field, U>[]
  : A extends Record<string, NestedProvable<Field>>
  ? {
      [K in keyof A]: InferProvableNested<Field, A[K]>;
    }
  : never;

type InferValueNested<
  Field,
  A extends NestedProvable<Field>
> = A extends Primitive
  ? InferPrimitiveValue<A>
  : A extends { provable: GenericProvable<any, infer U, any> }
  ? U
  : A extends GenericProvable<any, infer U, any>
  ? U
  : A extends [NestedProvable<Field>, ...NestedProvable<Field>[]]
  ? {
      [I in keyof A & number]: InferValueNested<Field, A[I]>;
    }
  : A extends (infer U extends NestedProvable<Field>)[]
  ? InferValueNested<Field, U>[]
  : A extends Record<string, NestedProvable<Field>>
  ? {
      [K in keyof A]: InferValueNested<Field, A[K]>;
    }
  : never;

type InferJsonNested<
  Field,
  A extends NestedProvable<Field>
> = A extends Primitive
  ? InferPrimitiveJson<A>
  : A extends { provable: GenericProvable<any, any, Field> }
  ? A['provable'] extends WithJson<infer J>
    ? J
    : never
  : A extends GenericProvable<any, any, Field>
  ? A extends WithJson<infer J>
    ? J
    : never
  : A extends [NestedProvable<Field>, ...NestedProvable<Field>[]]
  ? {
      [I in keyof A & number]: InferJsonNested<Field, A[I]>;
    }
  : A extends (infer U extends NestedProvable<Field>)[]
  ? InferJsonNested<Field, U>[]
  : A extends Record<string, NestedProvable<Field>>
  ? {
      [K in keyof A]: InferJsonNested<Field, A[K]>;
    }
  : never;
