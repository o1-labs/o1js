import { Field, Bool, Scalar, Group } from '../wrapped.js';
import { provable, provableTuple, HashInput, NonMethods } from './provable-derivers.js';
import type { InferJson, InferProvable, InferredProvable, IsPure } from './provable-derivers.js';
import { Provable } from '../provable.js';
import { ProvablePure, ProvableType } from './provable-intf.js';
import { From, InferValue } from '../../../bindings/lib/provable-generic.js';
import { DynamicProof, Proof } from '../../proof-system/proof.js';

// external API
export {
  ProvableExtended,
  ProvablePureExtended,
  Struct,
  FlexibleProvable,
  FlexibleProvablePure,
  FlexibleProvableType,
};

// internal API
export {
  provableTuple,
  AnyConstructor,
  cloneCircuitValue,
  circuitValueEquals,
  InferProvable,
  HashInput,
  InferJson,
  InferredProvable,
  StructNoJson,
};

type ProvableExtension<T, TJson = any> = {
  toInput: (x: T) => { fields?: Field[]; packed?: [Field, number][] };
  toJSON: (x: T) => TJson;
  fromJSON: (x: TJson) => T;
  empty: () => T;
};

type ProvableExtended<T, TValue = any, TJson = any> = Provable<T, TValue> &
  ProvableExtension<T, TJson>;
type ProvablePureExtended<T, TValue = any, TJson = any> = ProvablePure<T, TValue> &
  ProvableExtension<T, TJson>;

type Struct<T> = ProvableExtended<NonMethods<T>> & Constructor<T> & { _isStruct: true };
type StructPure<T> = ProvablePureExtended<NonMethods<T>> & Constructor<T> & { _isStruct: true };
type FlexibleProvable<T> = Provable<T> | Struct<T>;
type FlexibleProvablePure<T> = ProvablePure<T> | StructPure<T>;
type FlexibleProvableType<T> = ProvableType<T> | Struct<T>;

type Constructor<T> = new (...args: any) => T;
type AnyConstructor = Constructor<any>;

/**
 * `Struct` lets you declare composite types for use in o1js circuits.
 *
 * These composite types can be passed in as arguments to smart contract methods, used for on-chain state variables
 * or as event / action types.
 *
 * @example
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
 * **Note**: Ensure you do not use or extend `Struct` as a type directly. Instead, always call it as a function to construct a type. `Struct` is not a valid provable type itself, types created with `Struct(...)` are.
 *
 * @param type Object specifying the layout of the `Struct`
 * @returns Class which you can extend
 */
function Struct<
  A,
  T extends InferProvable<A> = InferProvable<A>,
  V extends InferValue<A> = InferValue<A>,
  J extends InferJson<A> = InferJson<A>,
  Pure extends boolean = IsPure<A>
>(
  type: A
): (new (value: T) => T) & { _isStruct: true } & (Pure extends true
    ? ProvablePure<T, V>
    : Provable<T, V>) & {
    fromValue: (value: From<A>) => T;
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
    static _isStruct: true = true;

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
     * `Provable<T>.toCanonical()`
     */
    static toCanonical(value: T): T {
      let canonical = this.type.toCanonical?.(value) ?? value;
      let struct = Object.create(this.prototype);
      return Object.assign(struct, canonical);
    }

    /**
     * `Provable<T>.toValue()`
     */
    static toValue(x: T): V {
      return this.type.toValue(x) as V;
    }

    /**
     * `Provable<T>.fromValue()`
     */
    static fromValue(v: From<A>): T {
      let value = this.type.fromValue(v as any);
      let struct = Object.create(this.prototype);
      return Object.assign(struct, value);
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

function StructNoJson<
  A,
  T extends InferProvable<A> = InferProvable<A>,
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
    empty: () => T;
  } {
  return Struct(type) satisfies Provable<T> as any;
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

  // classes that define clone() are cloned using that method
  if (obj.constructor !== undefined && 'clone' in obj.constructor) {
    return (obj as any).constructor.clone(obj);
  }
  if ('clone' in obj && typeof obj.clone === 'function') {
    return (obj as any).clone(obj);
  }

  // built-in JS datatypes with custom cloning strategies
  if (Array.isArray(obj)) return obj.map(cloneCircuitValue) as any as T;
  if (obj instanceof Set) return new Set([...obj].map(cloneCircuitValue)) as any as T;
  if (obj instanceof Map)
    return new Map([...obj].map(([k, v]) => [k, cloneCircuitValue(v)])) as any as T;
  if (ArrayBuffer.isView(obj)) return new (obj.constructor as any)(obj);

  // o1js primitives and proofs aren't cloned
  if (isPrimitive(obj)) {
    return obj;
  }
  if (obj instanceof Proof || obj instanceof DynamicProof) {
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
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return a === b;

  // built-in JS datatypes with custom equality checks
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) && a.length === b.length && a.every((a_, i) => circuitValueEquals(a_, b[i]))
    );
  }
  if (a instanceof Set) {
    return b instanceof Set && a.size === b.size && [...a].every((a_) => b.has(a_));
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
  return aEntries.every(([key, value]) => key in b && circuitValueEquals((b as any)[key], value));
}
