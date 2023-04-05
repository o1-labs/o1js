import 'reflect-metadata';
import { bytesToBigInt } from '../js_crypto/bigint-helpers.js';
import { Circuit, ProvablePure, Provable, Keypair, Gate } from '../snarky.js';
import { Field, Bool } from './core.js';
import { Context } from './global-context.js';
import { inCheckedComputation, snarkContext } from './proof_system.js';

// external API
export {
  Circuit,
  CircuitValue,
  ProvableExtended,
  prop,
  arrayProp,
  matrixProp,
  public_,
  circuitMain,
  provable,
  provablePure,
  Struct,
  FlexibleProvable,
  FlexibleProvablePure,
};

// internal API
export {
  AnyConstructor,
  cloneCircuitValue,
  circuitValueEquals,
  circuitArray,
  memoizationContext,
  memoizeWitness,
  getBlindingValue,
  toConstant,
  isConstant,
  InferProvable,
  HashInput,
  InferJson,
  InferredProvable,
};

type Constructor<T> = new (...args: any) => T;
type AnyConstructor = Constructor<any>;

type NonMethodKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];
type NonMethods<T> = Pick<T, NonMethodKeys<T>>;

type Struct<T> = ProvableExtended<NonMethods<T>> &
  Constructor<T> & { _isStruct: true };
type StructPure<T> = ProvablePure<NonMethods<T>> &
  ProvableExtension<NonMethods<T>> &
  Constructor<T> & { _isStruct: true };
type FlexibleProvable<T> = Provable<T> | Struct<T>;
type FlexibleProvablePure<T> = ProvablePure<T> | StructPure<T>;

type HashInput = { fields?: Field[]; packed?: [Field, number][] };
const HashInput = {
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

  toJSON(): any {
    return (this.constructor as any).toJSON(this);
  }

  toConstant(): this {
    return (this.constructor as any).toConstant(this);
  }

  equals(x: this) {
    return Circuit.equal(this, x);
  }

  assertEquals(x: this) {
    Circuit.assertEqual(this, x);
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

function circuitArray<A extends FlexibleProvable<any>>(
  elementType: A,
  length: number
): InferredProvable<A[]> {
  type T = InferProvable<A>;
  type TJson = InferJson<A>;
  let type = elementType as ProvableExtended<T>;
  return {
    /**
     * Returns the size of this structure in {@link Field} elements.
     * @returns size of this structure
     */
    sizeInFields() {
      let elementLength = type.sizeInFields();
      return elementLength * length;
    },
    /**
     * Serializes this structure into {@link Field} elements.
     * @returns an array of {@link Field} elements
     */
    toFields(array: T[]) {
      return array.map((e) => type.toFields(e)).flat();
    },
    /**
     * Serializes this structure's auxiliary data.
     * @returns auxiliary data
     */
    toAuxiliary(array?) {
      let array_ = array ?? Array<undefined>(length).fill(undefined);
      return array_?.map((e) => type.toAuxiliary(e));
    },

    /**
     * Deserializes an array of {@link Field} elements into this structure.
     */
    fromFields(fields: Field[], aux?: any[]) {
      let array = [];
      let size = type.sizeInFields();
      let n = length;
      for (let i = 0, offset = 0; i < n; i++, offset += size) {
        array[i] = type.fromFields(
          fields.slice(offset, offset + size),
          aux?.[i]
        );
      }
      return array;
    },
    check(array: T[]) {
      for (let i = 0; i < length; i++) {
        (type as any).check(array[i]);
      }
    },
    /**
     * Encodes this structure into a JSON-like object.
     */
    toJSON(array) {
      if (!('toJSON' in type)) {
        throw Error('circuitArray.toJSON: element type has no toJSON method');
      }
      return array.map((v) => type.toJSON(v));
    },

    /**
     * Decodes a JSON-like object into this structure.
     */
    fromJSON(json) {
      if (!('fromJSON' in type)) {
        throw Error(
          'circuitArray.fromJSON: element type has no fromJSON method'
        );
      }
      return json.map((a) => type.fromJSON(a));
    },
    toInput(array) {
      if (!('toInput' in type)) {
        throw Error('circuitArray.toInput: element type has no toInput method');
      }
      return array.reduce(
        (curr, value) => HashInput.append(curr, type.toInput(value)),
        HashInput.empty
      );
    },
  } satisfies ProvableExtended<T[], TJson[]> as any;
}

function arrayProp<T>(elementType: FlexibleProvable<T>, length: number) {
  return function (target: any, key: string) {
    if (!target.hasOwnProperty('_fields')) {
      target._fields = [];
    }
    target._fields.push([key, circuitArray(elementType, length)]);
  };
}

function matrixProp<T>(
  elementType: FlexibleProvable<T>,
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

function provableFromTuple(typs: ProvablePure<any>[]): ProvablePure<any> {
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

    toAuxiliary() {
      return [];
    },

    fromFields: (xs: Array<any>) => {
      let offset = 0;
      let res: Array<any> = [];
      typs.forEach((typ) => {
        const n = typ.sizeInFields();
        res.push(typ.fromFields(xs.slice(offset, offset + n)));
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
    let [, result] = snarkContext.runWith(
      { inCheckedComputation: true },
      () => {
        let args = [];
        for (let i = 0; i < numArgs; ++i) {
          args.push((publicIndexSet.has(i) ? pub : w).shift());
        }

        return target[propertyName].apply(target, args);
      }
    );
    return result;
  };

  target.snarkyWitnessTyp = provableFromTuple(
    Array.from(witnessIndexSet).map((i) => paramTypes[i])
  );
  target.snarkyPublicTyp = provableFromTuple(
    Array.from(publicIndexSet).map((i) => paramTypes[i])
  );
}

let primitives = new Set(['Field', 'Bool', 'Scalar', 'Group']);
let complexTypes = new Set(['object', 'function']);

type ProvableExtension<T, TJson = any> = {
  toInput: (x: T) => { fields?: Field[]; packed?: [Field, number][] };
  toJSON: (x: T) => TJson;
  fromJSON: (x: TJson) => T;
};
type ProvableExtended<T, TJson = any> = Provable<T> &
  ProvableExtension<T, TJson>;
type ProvableExtendedPure<T, TJson = any> = ProvablePure<T> &
  ProvableExtension<T, TJson>;

function provable<A>(
  typeObj: A,
  options?: { customObjectKeys?: string[]; isPure?: boolean }
): ProvableExtended<InferProvable<A>, InferJson<A>> {
  type T = InferProvable<A>;
  type J = InferJson<A>;
  let objectKeys =
    typeof typeObj === 'object' && typeObj !== null
      ? options?.customObjectKeys ?? Object.keys(typeObj).sort()
      : [];
  let nonCircuitPrimitives = new Set([
    Number,
    String,
    Boolean,
    BigInt,
    null,
    undefined,
  ]);
  if (
    !nonCircuitPrimitives.has(typeObj as any) &&
    !complexTypes.has(typeof typeObj)
  ) {
    throw Error(`provable: unsupported type "${typeObj}"`);
  }

  function sizeInFields(typeObj: any): number {
    if (nonCircuitPrimitives.has(typeObj)) return 0;
    if (Array.isArray(typeObj))
      return typeObj.map(sizeInFields).reduce((a, b) => a + b, 0);
    if ('sizeInFields' in typeObj) return typeObj.sizeInFields();
    return Object.values(typeObj)
      .map(sizeInFields)
      .reduce((a, b) => a + b, 0);
  }
  function toFields(typeObj: any, obj: any, isToplevel = false): Field[] {
    if (nonCircuitPrimitives.has(typeObj)) return [];
    if (!complexTypes.has(typeof typeObj) || typeObj === null) return [];
    if (Array.isArray(typeObj))
      return typeObj.map((t, i) => toFields(t, obj[i])).flat();
    if ('toFields' in typeObj) return typeObj.toFields(obj);
    return (isToplevel ? objectKeys : Object.keys(typeObj).sort())
      .map((k) => toFields(typeObj[k], obj[k]))
      .flat();
  }
  function toAuxiliary(typeObj: any, obj?: any, isToplevel = false): any[] {
    if (typeObj === Number) return [obj ?? 0];
    if (typeObj === String) return [obj ?? ''];
    if (typeObj === Boolean) return [obj ?? false];
    if (typeObj === BigInt) return [obj ?? 0n];
    if (typeObj === undefined || typeObj === null) return [];
    if (Array.isArray(typeObj))
      return typeObj.map((t, i) => toAuxiliary(t, obj?.[i]));
    if ('toAuxiliary' in typeObj) return typeObj.toAuxiliary(obj);
    return (isToplevel ? objectKeys : Object.keys(typeObj).sort()).map((k) =>
      toAuxiliary(typeObj[k], obj?.[k])
    );
  }
  function toInput(typeObj: any, obj: any, isToplevel = false): HashInput {
    if (nonCircuitPrimitives.has(typeObj)) return {};
    if (Array.isArray(typeObj)) {
      return typeObj
        .map((t, i) => toInput(t, obj[i]))
        .reduce(HashInput.append, HashInput.empty);
    }
    if ('toInput' in typeObj) return typeObj.toInput(obj) as HashInput;
    if ('toFields' in typeObj) {
      return { fields: typeObj.toFields(obj) };
    }
    return (isToplevel ? objectKeys : Object.keys(typeObj).sort())
      .map((k) => toInput(typeObj[k], obj[k]))
      .reduce(HashInput.append, HashInput.empty);
  }
  function toJSON(typeObj: any, obj: any, isToplevel = false): any {
    if (typeObj === BigInt) return obj.toString();
    if (typeObj === String || typeObj === Number || typeObj === Boolean)
      return obj;
    if (typeObj === undefined || typeObj === null) return null;
    if (!complexTypes.has(typeof typeObj) || typeObj === null)
      return obj ?? null;
    if (Array.isArray(typeObj)) return typeObj.map((t, i) => toJSON(t, obj[i]));
    if ('toJSON' in typeObj) return typeObj.toJSON(obj);
    return Object.fromEntries(
      (isToplevel ? objectKeys : Object.keys(typeObj).sort()).map((k) => [
        k,
        toJSON(typeObj[k], obj[k]),
      ])
    );
  }
  function fromFields(
    typeObj: any,
    fields: Field[],
    aux: any[] = [],
    isToplevel = false
  ): any {
    if (
      typeObj === Number ||
      typeObj === String ||
      typeObj === Boolean ||
      typeObj === BigInt
    )
      return aux[0];
    if (typeObj === undefined || typeObj === null) return typeObj;
    if (!complexTypes.has(typeof typeObj) || typeObj === null) return null;
    if (Array.isArray(typeObj)) {
      let array = [];
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
    if ('fromFields' in typeObj) return typeObj.fromFields(fields, aux);
    let keys = isToplevel ? objectKeys : Object.keys(typeObj).sort();
    let values = fromFields(
      keys.map((k) => typeObj[k]),
      fields,
      aux
    );
    return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
  }
  function fromJSON(typeObj: any, json: any, isToplevel = false): any {
    if (typeObj === BigInt) return BigInt(json as string);
    if (typeObj === String || typeObj === Number || typeObj === Boolean)
      return json;
    if (typeObj === null) return undefined;
    if (!complexTypes.has(typeof typeObj)) return json ?? undefined;
    if (Array.isArray(typeObj))
      return typeObj.map((t, i) => fromJSON(t, json[i]));
    if ('fromJSON' in typeObj) return typeObj.fromJSON(json);
    let keys = isToplevel ? objectKeys : Object.keys(typeObj).sort();
    let values = fromJSON(
      keys.map((k) => typeObj[k]),
      keys.map((k) => json[k])
    );
    return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
  }
  function check(typeObj: any, obj: any, isToplevel = false): void {
    if (nonCircuitPrimitives.has(typeObj)) return;
    if (Array.isArray(typeObj))
      return typeObj.forEach((t, i) => check(t, obj[i]));
    if ('check' in typeObj) return typeObj.check(obj);
    return (isToplevel ? objectKeys : Object.keys(typeObj).sort()).forEach(
      (k) => check(typeObj[k], obj[k])
    );
  }
  if (options?.isPure === true) {
    return {
      sizeInFields: () => sizeInFields(typeObj),
      toFields: (obj: T) => toFields(typeObj, obj, true),
      toAuxiliary: () => [],
      fromFields: (fields: Field[]) =>
        fromFields(typeObj, fields, [], true) as T,
      toInput: (obj: T) => toInput(typeObj, obj, true),
      toJSON: (obj: T) => toJSON(typeObj, obj, true) as J,
      fromJSON: (json: J) => fromJSON(typeObj, json, true),
      check: (obj: T) => check(typeObj, obj, true),
    };
  }
  return {
    sizeInFields: () => sizeInFields(typeObj),
    toFields: (obj: T) => toFields(typeObj, obj, true),
    toAuxiliary: (obj?: T) => toAuxiliary(typeObj, obj, true),
    fromFields: (fields: Field[], aux: any[]) =>
      fromFields(typeObj, fields, aux, true) as T,
    toInput: (obj: T) => toInput(typeObj, obj, true),
    toJSON: (obj: T) => toJSON(typeObj, obj, true) as J,
    fromJSON: (json: J) => fromJSON(typeObj, json, true),
    check: (obj: T) => check(typeObj, obj, true),
  };
}

function provablePure<A>(
  typeObj: A,
  options: { customObjectKeys?: string[] } = {}
): ProvablePure<InferProvable<A>> &
  ProvableExtension<InferProvable<A>, InferJson<A>> {
  return provable(typeObj, { ...options, isPure: true }) as any;
}

/**
 * `Struct` lets you declare composite types for use in snarkyjs circuits.
 *
 * These composite types can be passed in as arguments to smart contract methods, used for on-chain state variables
 * or as event / action types.
 *
 * Here's an example of creating a "Voter" struct, which holds a public key and a collection of votes on 3 different proposals:
 * ```ts
 * let Vote = { hasVoted: Bool, inFavor: Bool };
 *
 * class Voter extends Struct({
 *   publicKey: PublicKey,
 *   votes: [Vote, Vote, Vote]
 * }) {}
 *
 * // use Voter as SmartContract input:
 * class VoterContract extends SmartContract {
 *   \@method register(voter: Voter) {
 *     // ...
 *   }
 * }
 * ```
 * In this example, there are no instance methods on the class. This makes `Voter` type-compatible with an anonymous object of the form
 * `{ publicKey: PublicKey, votes: Vote[] }`.
 * This mean you don't have to create instances by using `new Voter(...)`, you can operate with plain objects:
 * ```ts
 * voterContract.register({ publicKey, votes });
 * ```
 *
 * On the other hand, you can also add your own methods:
 * ```ts
 * class Voter extends Struct({
 *   publicKey: PublicKey,
 *   votes: [Vote, Vote, Vote]
 * }) {
 *   vote(index: number, inFavor: Bool) {
 *     let vote = this.votes[i];
 *     vote.hasVoted = Bool(true);
 *     vote.inFavor = inFavor;
 *   }
 * }
 * ```
 *
 * In this case, you'll need the constructor to create instances of `Voter`. It always takes as input the plain object:
 * ```ts
 * let emptyVote = { hasVoted: Bool(false), inFavor: Bool(false) };
 * let voter = new Voter({ publicKey, votes: Array(3).fill(emptyVote) });
 * voter.vote(1, Bool(true));
 * ```
 *
 * In addition to creating types composed of Field elements, you can also include auxiliary data which does not become part of the proof.
 * This, for example, allows you to re-use the same type outside snarkyjs methods, where you might want to store additional metadata.
 *
 * To declare non-proof values of type `string`, `number`, etc, you can use the built-in objects `String`, `Number`, etc.
 * Here's how we could add the voter's name (a string) as auxiliary data:
 * ```ts
 * class Voter extends Struct({
 *   publicKey: PublicKey,
 *   votes: [Vote, Vote, Vote],
 *   fullName: String
 * }) {}
 * ```
 *
 * Again, it's important to note that this doesn't enable you to prove anything about the `fullName` string.
 * From the circuit point of view, it simply doesn't exist!
 *
 * @param type Object specifying the layout of the `Struct`
 * @param options Advanced option which allows you to force a certain order of object keys
 * @returns Class which you can extend
 */
function Struct<
  A,
  T extends InferProvable<A> = InferProvable<A>,
  J extends InferJson<A> = InferJson<A>,
  Pure extends boolean = IsPure<A>
>(
  type: A,
  options: { customObjectKeys?: string[] } = {}
): (new (value: T) => T) & { _isStruct: true } & (Pure extends true
    ? ProvablePure<T>
    : Provable<T>) & {
    toInput: (x: T) => {
      fields?: Field[] | undefined;
      packed?: [Field, number][] | undefined;
    };
    toJSON: (x: T) => J;
    fromJSON: (x: J) => T;
  } {
  class Struct_ {
    static type = provable<A>(type, options);
    static _isStruct: true;

    constructor(value: T) {
      Object.assign(this, value);
    }
    /**
     * This method is for internal use, you will probably not need it.
     * @returns the size of this struct in field elements
     */
    static sizeInFields() {
      return this.type.sizeInFields();
    }
    /**
     * This method is for internal use, you will probably not need it.
     * @param value
     * @returns the raw list of field elements that represent this struct inside the proof
     */
    static toFields(value: T): Field[] {
      return this.type.toFields(value);
    }
    /**
     * This method is for internal use, you will probably not need it.
     * @param value
     * @returns the raw non-field element data contained in the struct
     */
    static toAuxiliary(value: T): any[] {
      return this.type.toAuxiliary(value);
    }
    /**
     * This method is for internal use, you will probably not need it.
     * @param value
     * @returns a representation of this struct as field elements, which can be hashed efficiently
     */
    static toInput(value: T): HashInput {
      return this.type.toInput(value);
    }
    /**
     * Convert this struct to a JSON object, consisting only of numbers, strings, booleans, arrays and plain objects.
     * @param value
     * @returns a JSON representation of this struct
     */
    static toJSON(value: T): J {
      return this.type.toJSON(value) as J;
    }
    /**
     * Convert from a JSON object to an instance of this struct.
     * @param json
     * @returns a JSON representation of this struct
     */
    static fromJSON(json: J): T {
      let value = this.type.fromJSON(json);
      let struct = Object.create(this.prototype);
      return Object.assign(struct, value);
    }
    /**
     * This method is for internal use, you will probably not need it.
     * Method to make assertions which should be always made whenever a struct of this type is created in a proof.
     * @param value
     */
    static check(value: T) {
      return this.type.check(value);
    }
    /**
     * This method is for internal use, you will probably not need it.
     * Recover a struct from its raw field elements and auxiliary data.
     * @param fields the raw fields elements
     * @param aux the raw non-field element data
     */
    static fromFields(fields: Field[], aux: any[]) {
      let value = this.type.fromFields(fields, aux) as T;
      let struct = Object.create(this.prototype);
      return Object.assign(struct, value);
    }
  }
  return Struct_ as any;
}

// FIXME: the logic in here to check for obj.constructor.name actually doesn't work
// something that works is Field(1).constructor === obj.constructor etc
function cloneCircuitValue<T>(obj: T): T {
  // primitive JS types and functions aren't cloned
  if (typeof obj !== 'object' || obj === null) return obj;

  // HACK: callbacks
  if (
    ['GenericArgument', 'Callback'].includes((obj as any).constructor?.name)
  ) {
    return obj;
  }

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
  if (
    typeof a !== 'object' ||
    a === null ||
    typeof b !== 'object' ||
    b === null
  )
    return a === b;

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
  let aEntries = Object.entries(a as any).filter(([, v]) => v !== undefined);
  let bEntries = Object.entries(b as any).filter(([, v]) => v !== undefined);
  if (aEntries.length !== bEntries.length) return false;
  return aEntries.every(
    ([key, value]) => key in b && circuitValueEquals((b as any)[key], value)
  );
}

function toConstant<T>(type: FlexibleProvable<T>, value: T): T;
function toConstant<T>(type: Provable<T>, value: T): T {
  return type.fromFields(
    type.toFields(value).map((x) => x.toConstant()),
    type.toAuxiliary(value)
  );
}

function isConstant<T>(type: FlexibleProvable<T>, value: T): boolean;
function isConstant<T>(type: Provable<T>, value: T): boolean {
  return type.toFields(value).every((x) => x.isConstant());
}

// TODO: move `Circuit` to JS entirely, this patching harms code discoverability

Circuit.inCheckedComputation = inCheckedComputation;

let oldAsProver = Circuit.asProver;
Circuit.asProver = function (f: () => void) {
  if (inCheckedComputation()) {
    oldAsProver(f);
  } else {
    f();
  }
};

let oldRunUnchecked = Circuit.runUnchecked;
Circuit.runUnchecked = function (f: () => void) {
  let [, result] = snarkContext.runWith({ inCheckedComputation: true }, () =>
    oldRunUnchecked(f)
  );
  return result;
};

let oldRunAndCheck = Circuit.runAndCheck;
Circuit.runAndCheck = function (f: () => void) {
  let [, result] = snarkContext.runWith({ inCheckedComputation: true }, () =>
    oldRunAndCheck(f)
  );
  return result;
};

Circuit.witness = function <
  T,
  S extends FlexibleProvable<T> = FlexibleProvable<T>
>(type: S, compute: () => T): T {
  let proverValue: T | undefined;
  let createFields = () => {
    proverValue = compute();
    let fields = type.toFields(proverValue);
    // TODO: enable this check
    // currently it throws for Scalar.. which seems to be flexible about what length is returned by toFields
    // if (fields.length !== type.sizeInFields()) {
    //   throw Error(
    //     `Invalid witness. Expected ${type.sizeInFields()} field elements, got ${
    //       fields.length
    //     }.`
    //   );
    // }
    return fields;
  };
  let ctx = snarkContext.get();
  let fields =
    inCheckedComputation() && !ctx.inWitnessBlock
      ? snarkContext.runWith({ ...ctx, inWitnessBlock: true }, () =>
          Circuit._witness(type, createFields)
        )[1]
      : createFields();
  let aux = type.toAuxiliary(proverValue);
  let value = type.fromFields(fields, aux) as T;
  if (inCheckedComputation()) type.check(value);
  return value;
};

Circuit.array = circuitArray;

Circuit.switch = function <T, A extends FlexibleProvable<T>>(
  mask: Bool[],
  type: A,
  values: T[]
): T {
  // picks the value at the index where mask is true
  let nValues = values.length;
  if (mask.length !== nValues)
    throw Error(
      `Circuit.switch: \`values\` and \`mask\` have different lengths (${values.length} vs. ${mask.length}), which is not allowed.`
    );
  let checkMask = () => {
    let nTrue = mask.filter((b) => b.toBoolean()).length;
    if (nTrue > 1) {
      throw Error(
        `Circuit.switch: \`mask\` must have 0 or 1 true element, found ${nTrue}.`
      );
    }
  };
  if (mask.every((b) => b.toField().isConstant())) checkMask();
  else Circuit.asProver(checkMask);
  let size = type.sizeInFields();
  let fields = Array(size).fill(Field(0));
  for (let i = 0; i < nValues; i++) {
    let valueFields = type.toFields(values[i]);
    let maskField = mask[i].toField();
    for (let j = 0; j < size; j++) {
      let maybeField = valueFields[j].mul(maskField);
      fields[j] = fields[j].add(maybeField);
    }
  }
  let aux = auxiliary(type as Provable<T>, () => {
    let i = mask.findIndex((b) => b.toBoolean());
    if (i === -1) return type.toAuxiliary();
    return type.toAuxiliary(values[i]);
  });
  return type.fromFields(fields, aux) as T;
};

Circuit.constraintSystem = function <T>(f: () => T) {
  let [, result] = snarkContext.runWith(
    { inAnalyze: true, inCheckedComputation: true },
    () => {
      let result: T;
      let { rows, digest, json } = (Circuit as any)._constraintSystem(() => {
        result = f();
      });
      let { gates, publicInputSize } = gatesFromJson(json);
      return { rows, digest, result: result!, gates, publicInputSize };
    }
  );
  return result;
};

Circuit.log = function (...args: any) {
  Circuit.asProver(() => {
    let prettyArgs = [];
    for (let arg of args) {
      if (arg?.toPretty !== undefined) prettyArgs.push(arg.toPretty());
      else {
        try {
          prettyArgs.push(JSON.parse(JSON.stringify(arg)));
        } catch {
          prettyArgs.push(arg);
        }
      }
    }
    console.log(...prettyArgs);
  });
};

Circuit.constraintSystemFromKeypair = function (keypair: Keypair) {
  return gatesFromJson(JSON.parse((keypair as any)._constraintSystemJSON()))
    .gates;
};

function gatesFromJson(cs: { gates: JsonGate[]; public_input_size: number }) {
  let gates: Gate[] = cs.gates.map(({ typ, wires, coeffs: byteCoeffs }) => {
    let coeffs = [];
    for (let coefficient of byteCoeffs) {
      let arr = new Uint8Array(coefficient);
      coeffs.push(bytesToBigInt(arr).toString());
    }
    return { type: typ, wires, coeffs };
  });
  return { publicInputSize: cs.public_input_size, gates };
}
type JsonGate = {
  typ: string;
  wires: { row: number; col: number }[];
  coeffs: number[][];
};

function auxiliary<T>(type: FlexibleProvable<T>, compute: () => any[]) {
  let aux;
  if (inCheckedComputation()) Circuit.asProver(() => (aux = compute()));
  else aux = compute();
  return aux ?? type.toAuxiliary();
}

let memoizationContext = Context.create<{
  memoized: { fields: Field[]; aux: any[] }[];
  currentIndex: number;
  blindingValue: Field;
}>();

/**
 * Like Circuit.witness, but memoizes the witness during transaction construction
 * for reuse by the prover. This is needed to witness non-deterministic values.
 */
function memoizeWitness<T>(type: FlexibleProvable<T>, compute: () => T) {
  return Circuit.witness<T>(type as Provable<T>, () => {
    if (!memoizationContext.has()) return compute();
    let context = memoizationContext.get();
    let { memoized, currentIndex } = context;
    let currentValue = memoized[currentIndex];
    if (currentValue === undefined) {
      let value = compute();
      let fields = type.toFields(value).map((x) => x.toConstant());
      let aux = type.toAuxiliary(value);
      currentValue = { fields, aux };
      memoized[currentIndex] = currentValue;
    }
    context.currentIndex += 1;
    return (type as Provable<T>).fromFields(
      currentValue.fields,
      currentValue.aux
    );
  });
}

function getBlindingValue() {
  if (!memoizationContext.has()) return Field.random();
  let context = memoizationContext.get();
  if (context.blindingValue === undefined) {
    context.blindingValue = Field.random();
  }
  return context.blindingValue;
}

// some type inference helpers

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

type InferProvable<A> = A extends Constructor<infer U>
  ? A extends Provable<U>
    ? U
    : A extends Struct<U>
    ? U
    : InferProvableBase<A>
  : InferProvableBase<A>;

type InferProvableBase<A> = A extends Provable<infer U>
  ? U
  : A extends Primitive
  ? InferPrimitive<A>
  : A extends Tuple<any>
  ? {
      [I in keyof A]: InferProvable<A[I]>;
    }
  : A extends (infer U)[]
  ? InferProvable<U>[]
  : A extends Record<any, any>
  ? {
      [K in keyof A]: InferProvable<A[K]>;
    }
  : never;

type WithJson<J> = { toJSON: (x: any) => J };

type InferJson<A> = A extends WithJson<infer J>
  ? J
  : A extends Primitive
  ? InferPrimitiveJson<A>
  : A extends Tuple<any>
  ? {
      [I in keyof A]: InferJson<A[I]>;
    }
  : A extends WithJson<infer U>[]
  ? U[]
  : A extends Record<any, any>
  ? {
      [K in keyof A]: InferJson<A[K]>;
    }
  : any;

type IsPure<A> = IsPureBase<A> extends true ? true : false;

type IsPureBase<A> = A extends ProvablePure<any>
  ? true
  : A extends Provable<any>
  ? false
  : A extends Primitive
  ? false
  : A extends (infer U)[]
  ? IsPure<U>
  : A extends Record<any, any>
  ? {
      [K in keyof A]: IsPure<A[K]>;
    }[keyof A]
  : false;

type InferredProvable<A> = IsPure<A> extends true
  ? ProvableExtendedPure<InferProvable<A>, InferJson<A>>
  : ProvableExtended<InferProvable<A>, InferJson<A>>;
