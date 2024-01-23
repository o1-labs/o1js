import 'reflect-metadata';
import { ProvablePure, Snarky } from '../snarky.js';
import { Field, Bool, Scalar, Group } from './core.js';
import {
  provable,
  provablePure,
  provableTuple,
  HashInput,
  NonMethods,
} from '../bindings/lib/provable-snarky.js';
import type {
  InferJson,
  InferProvable,
  InferredProvable,
  IsPure,
} from '../bindings/lib/provable-snarky.js';
import { Provable } from './provable.js';
import { assert } from './errors.js';
import { inCheckedComputation } from './provable-context.js';
import { Proof } from './proof_system.js';

// external API
export {
  CircuitValue,
  ProvableExtended,
  ProvablePureExtended,
  prop,
  arrayProp,
  matrixProp,
  provable,
  provablePure,
  Struct,
  FlexibleProvable,
  FlexibleProvablePure,
};

// internal API
export {
  provableTuple,
  AnyConstructor,
  cloneCircuitValue,
  circuitValueEquals,
  toConstant,
  InferProvable,
  HashInput,
  InferJson,
  InferredProvable,
  Unconstrained,
};

type ProvableExtension<T, TJson = any> = {
  toInput: (x: T) => { fields?: Field[]; packed?: [Field, number][] };
  toJSON: (x: T) => TJson;
  fromJSON: (x: TJson) => T;
  empty: () => T;
};

type ProvableExtended<T, TJson = any> = Provable<T> &
  ProvableExtension<T, TJson>;
type ProvablePureExtended<T, TJson = any> = ProvablePure<T> &
  ProvableExtension<T, TJson>;

type Struct<T> = ProvableExtended<NonMethods<T>> &
  Constructor<T> & { _isStruct: true };
type StructPure<T> = ProvablePure<NonMethods<T>> &
  ProvableExtension<NonMethods<T>> &
  Constructor<T> & { _isStruct: true };
type FlexibleProvable<T> = Provable<T> | Struct<T>;
type FlexibleProvablePure<T> = ProvablePure<T> | StructPure<T>;

type Constructor<T> = new (...args: any) => T;
type AnyConstructor = Constructor<any>;

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
    return Provable.equal(this, x);
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
      Provable.Array(Provable.Array(elementType, nColumns), nRows),
    ]);
  };
}

/**
 * `Struct` lets you declare composite types for use in o1js circuits.
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
 * This, for example, allows you to re-use the same type outside o1js methods, where you might want to store additional metadata.
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
  type: A
): (new (value: T) => T) & { _isStruct: true } & (Pure extends true
    ? ProvablePure<T>
    : Provable<T>) & {
    toInput: (x: T) => {
      fields?: Field[] | undefined;
      packed?: [Field, number][] | undefined;
    };
    toJSON: (x: T) => J;
    fromJSON: (x: J) => T;
    empty: () => T;
  } {
  class Struct_ {
    static type = provable<A>(type);
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
     * Create an instance of this struct filled with default values
     * @returns an empty instance of this struct
     */
    static empty(): T {
      let value = this.type.empty();
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

/**
 * Container which holds an unconstrained value. This can be used to pass values
 * between the out-of-circuit blocks in provable code.
 *
 * Invariants:
 * - An `Unconstrained`'s value can only be accessed in auxiliary contexts.
 * - An `Unconstrained` can be empty when compiling, but never empty when running as the prover.
 *   (there is no way to create an empty `Unconstrained` in the prover)
 *
 * @example
 * ```ts
 * let x = Unconstrained.from(0n);
 *
 * class MyContract extends SmartContract {
 *   `@method` myMethod(x: Unconstrained<bigint>) {
 *
 *     Provable.witness(Field, () => {
 *       // we can access and modify `x` here
 *       let newValue = x.get() + otherField.toBigInt();
 *       x.set(newValue);
 *
 *       // ...
 *     });
 *
 *     // throws an error!
 *     x.get();
 *   }
 * ```
 */
class Unconstrained<T> {
  private option:
    | { isSome: true; value: T }
    | { isSome: false; value: undefined };

  private constructor(isSome: boolean, value?: T) {
    this.option = { isSome, value: value as any };
  }

  /**
   * Read an unconstrained value.
   *
   * Note: Can only be called outside provable code.
   */
  get(): T {
    if (inCheckedComputation() && !Snarky.run.inProverBlock())
      throw Error(`You cannot use Unconstrained.get() in provable code.

The only place where you can read unconstrained values is in Provable.witness()
and Provable.asProver() blocks, which execute outside the proof.
`);
    assert(this.option.isSome, 'Empty `Unconstrained`'); // never triggered
    return this.option.value;
  }

  /**
   * Modify the unconstrained value.
   */
  set(value: T) {
    this.option = { isSome: true, value };
  }

  /**
   * Set the unconstrained value to the same as another `Unconstrained`.
   */
  setTo(value: Unconstrained<T>) {
    this.option = value.option;
  }

  /**
   * Create an `Unconstrained` with the given `value`.
   */
  static from<T>(value: T) {
    return new Unconstrained(true, value);
  }

  /**
   * Create an `Unconstrained` from a witness computation.
   */
  static witness<T>(compute: () => T) {
    return Provable.witness(
      Unconstrained.provable,
      () => new Unconstrained(true, compute())
    );
  }

  static provable: Provable<Unconstrained<any>> & {
    toInput: (x: Unconstrained<any>) => {
      fields?: Field[];
      packed?: [Field, number][];
    };
  } = {
    sizeInFields: () => 0,
    toFields: () => [],
    toAuxiliary: (t?: any) => [t ?? new Unconstrained(false)],
    fromFields: (_, [t]) => t,
    check: () => {},
    toInput: () => ({}),
  };
}

let primitives = new Set([Field, Bool, Scalar, Group]);
function isPrimitive(obj: any) {
  for (let P of primitives) {
    if (obj instanceof P) return true;
  }
  return false;
}

function cloneCircuitValue<T>(obj: T): T {
  // primitive JS types and functions aren't cloned
  if (typeof obj !== 'object' || obj === null) return obj;

  // HACK: callbacks, account udpates
  if (
    obj.constructor?.name.includes('GenericArgument') ||
    obj.constructor?.name.includes('Callback')
  ) {
    return obj;
  }
  if (obj.constructor?.name.includes('AccountUpdate')) {
    return (obj as any).constructor.clone(obj);
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

  // o1js primitives and proofs aren't cloned
  if (isPrimitive(obj)) {
    return obj;
  }
  if (obj instanceof Proof) {
    return obj;
  }

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

  // the two checks below cover o1js primitives and CircuitValues
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
