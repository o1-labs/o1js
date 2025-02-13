/**
 * {@link Provable} is
 * - a namespace with tools for writing provable code
 * - the main interface for types that can be used in provable code
 */
import { Bool } from './bool.js';
import { Field } from './field.js';
import { Provable as Provable_, ProvableType } from './types/provable-intf.js';
import type { FlexibleProvable, FlexibleProvableType, ProvableExtended } from './types/struct.js';
import { Context } from '../util/global-context.js';
import {
  HashInput,
  InferJson,
  InferProvableType,
  InferredProvable,
} from './types/provable-derivers.js';
import {
  inCheckedComputation,
  inProver,
  asProver,
  constraintSystem,
  generateWitness,
} from './core/provable-context.js';
import { witness, witnessAsync, witnessFields } from './types/witness.js';
import { InferValue } from '../../bindings/lib/provable-generic.js';
import { ToProvable } from '../../lib/provable/types/provable-intf.js';

// external API
export { Provable };

// internal API
export { memoizationContext, MemoizationContext, memoizeWitness, getBlindingValue };

/**
 * `Provable<T>` is the general interface for provable types in o1js.
 *
 * `Provable<T>` describes how a type `T` is made up of {@link Field} elements and "auxiliary" (non-provable) data.
 *
 * `Provable<T>` is the required input type in several methods in o1js.
 * One convenient way to create a `Provable<T>` is using `Struct`.
 *
 * All built-in provable types in o1js ({@link Field}, {@link Bool}, etc.) are instances of `Provable<T>` as well.
 *
 * Note: These methods are meant to be used by the library internally and are not directly when writing provable code.
 */
type Provable<T, TValue = any> = Provable_<T, TValue>;

const Provable = {
  /**
   * Create a new witness. A witness, or variable, is a value that is provided as input
   * by the prover. This provides a flexible way to introduce values from outside into the circuit.
   * However, note that nothing about how the value was created is part of the proof - `Provable.witness`
   * behaves exactly like user input. So, make sure that after receiving the witness you make any assertions
   * that you want to associate with it.
   * @example
   * Example for re-implementing `Field.inv` with the help of `witness`:
   * ```ts
   * let invX = Provable.witness(Field, () => {
   *   // compute the inverse of `x` outside the circuit, however you like!
   *   return Field.inv(x);
   * }
   * // prove that `invX` is really the inverse of `x`:
   * invX.mul(x).assertEquals(1);
   * ```
   */
  witness,
  /**
   * Witness a tuple of field elements. This works just like {@link Provable.witness},
   * but optimized for witnessing plain field elements, which is especially common
   * in low-level provable code.
   */
  witnessFields,
  /**
   * Create a new witness from an async callback.
   *
   * See {@link Provable.witness} for more information.
   */
  witnessAsync,
  /**
   * Proof-compatible if-statement.
   * This behaves like a ternary conditional statement in JS.
   *
   * **Warning**: Since `Provable.if()` is a normal JS function call, both the if and the else branch
   * are evaluated before calling it. Therefore, you can't use this function
   * to guard against execution of one of the branches. It only allows you to pick one of two values.
   *
   * @example
   * ```ts
   * const condition = Bool(true);
   * const result = Provable.if(condition, Field(1), Field(2)); // returns Field(1)
   * ```
   */
  if: if_,
  /**
   * Generalization of {@link Provable.if} for choosing between more than two different cases.
   * It takes a "mask", which is an array of `Bool`s that contains only one `true` element, a type/constructor, and an array of values of that type.
   * The result is that value which corresponds to the true element of the mask.
   * @example
   * ```ts
   * let x = Provable.switch([Bool(false), Bool(true)], Field, [Field(1), Field(2)]);
   * x.assertEquals(2);
   * ```
   */
  switch: switch_,
  /**
   * Asserts that two values are equal.
   * @example
   * ```ts
   * class MyStruct extends Struct({ a: Field, b: Bool }) {};
   * const a: MyStruct = { a: Field(0), b: Bool(false) };
   * const b: MyStruct = { a: Field(1), b: Bool(true) };
   * Provable.assertEqual(MyStruct, a, b);
   * ```
   */
  assertEqual,
  /**
   * Asserts that two values are equal, if an enabling condition is true.
   *
   * If the condition is false, the assertion is skipped.
   */
  assertEqualIf,
  /**
   * Checks if two elements are equal.
   * @example
   * ```ts
   * class MyStruct extends Struct({ a: Field, b: Bool }) {};
   * const a: MyStruct = { a: Field(0), b: Bool(false) };
   * const b: MyStruct = { a: Field(1), b: Bool(true) };
   * const isEqual = Provable.equal(MyStruct, a, b);
   * ```
   */
  equal,
  /**
   * Creates a {@link Provable} for a generic array.
   * @example
   * ```ts
   * const ProvableArray = Provable.Array(Field, 5);
   * ```
   */
  Array: provableArray,
  /**
   * Check whether a value is constant.
   * See {@link FieldVar} for more information about constants and variables.
   *
   * @example
   * ```ts
   * let x = Field(42);
   * Provable.isConstant(Field, x); // true
   * ```
   */
  isConstant,
  /**
   * Interface to log elements within a circuit. Similar to `console.log()`.
   * @example
   * ```ts
   * const element = Field(42);
   * Provable.log(element);
   * ```
   */
  log,
  /**
   * Runs code as a prover.
   * @example
   * ```ts
   * Provable.asProver(() => {
   *   // Your prover code here
   * });
   * ```
   */
  asProver,
  /**
   * Runs provable code quickly, without creating a proof, but still checking whether constraints are satisfied.
   * @example
   * ```ts
   * await Provable.runAndCheck(() => {
   *   // Your code to check here
   * });
   * ```
   */
  async runAndCheck(f: (() => Promise<void>) | (() => void)) {
    await generateWitness(f, { checkConstraints: true });
  },
  /**
   * Runs provable code quickly, without creating a proof, and not checking whether constraints are satisfied.
   * @example
   * ```ts
   * await Provable.runUnchecked(() => {
   *   // Your code to run here
   * });
   * ```
   */
  async runUnchecked(f: (() => Promise<void>) | (() => void)) {
    await generateWitness(f, { checkConstraints: false });
  },
  /**
   * Returns information about the constraints created by the callback function.
   * @example
   * ```ts
   * const result = await Provable.constraintSystem(circuit);
   * console.log(result);
   * ```
   */
  constraintSystem,
  /**
   * Checks if the code is run in prover mode.
   * @example
   * ```ts
   * if (Provable.inProver()) {
   *   // Prover-specific code
   * }
   * ```
   */
  inProver,
  /**
   * Checks if the code is run in checked computation mode.
   * @example
   * ```ts
   * if (Provable.inCheckedComputation()) {
   *   // Checked computation-specific code
   * }
   * ```
   */
  inCheckedComputation,

  /**
   * Returns a constant version of a provable type.
   */
  toConstant<T>(type: ProvableType<T>, value: T) {
    type = ProvableType.get(type);
    return type.fromFields(
      type.toFields(value).map((x) => x.toConstant()),
      type.toAuxiliary(value)
    );
  },

  /**
   * Return a canonical version of a value, where
   * canonical is defined by the `type`.
   */
  toCanonical<T>(type: Provable<T>, value: T) {
    return type.toCanonical?.(value) ?? value;
  },
};

type ToFieldable = { toFields(): Field[] };

// general provable methods

function assertEqual<T>(type: FlexibleProvableType<T>, x: T, y: T): void;
function assertEqual<T extends ToFieldable>(x: T, y: T): void;
function assertEqual(typeOrX: any, xOrY: any, yOrUndefined?: any) {
  if (yOrUndefined === undefined) {
    return assertEqualImplicit(typeOrX, xOrY);
  } else {
    return assertEqualExplicit(typeOrX, xOrY, yOrUndefined);
  }
}
function assertEqualImplicit<T extends ToFieldable>(x: T, y: T) {
  let xs = x.toFields();
  let ys = y.toFields();
  let n = checkLength('Provable.assertEqual', xs, ys);
  for (let i = 0; i < n; i++) {
    xs[i].assertEquals(ys[i]);
  }
}
function assertEqualExplicit<T>(type: ProvableType<T>, x: T, y: T) {
  type = ProvableType.get(type);
  let xs = type.toFields(x);
  let ys = type.toFields(y);
  for (let i = 0; i < xs.length; i++) {
    xs[i].assertEquals(ys[i]);
  }
}

function equal<T>(type: FlexibleProvableType<T>, x: T, y: T) {
  let provable = ProvableType.get(type) as Provable<T>;
  // when comparing two values of the same type, we use the type's canonical form
  // otherwise, the case where `equal()` returns false is misleading (two values can differ as field elements but be "equal")
  x = provable.toCanonical?.(x) ?? x;
  y = provable.toCanonical?.(y) ?? y;
  let xs = provable.toFields(x);
  let ys = provable.toFields(y);
  return xs.map((x, i) => x.equals(ys[i])).reduce(Bool.and);
}

function if_<T>(condition: Bool, type: FlexibleProvableType<T>, x: T, y: T): T;
function if_<T extends ToFieldable>(condition: Bool, x: T, y: T): T;
function if_(condition: Bool, typeOrX: any, xOrY: any, yOrUndefined?: any) {
  if (yOrUndefined === undefined) {
    return ifImplicit(condition, typeOrX, xOrY);
  } else {
    return ifExplicit(condition, typeOrX, xOrY, yOrUndefined);
  }
}

function ifField(b: Field, x: Field, y: Field) {
  // TODO: this is suboptimal if one of x, y is constant
  // it uses 2-3 generic gates in that case, where 1 would be enough

  // b*(x - y) + y
  // NOTE: the R1CS constraint used by Field.if_ in snarky-ml
  // leads to a different but equivalent layout (same # constraints)
  // https://github.com/o1-labs/snarky/blob/14f8e2ff981a9c9ea48c94b2cc1d8c161301537b/src/base/utils.ml#L171
  // in the case x, y are constant, the layout is the same
  return b.mul(x.sub(y)).add(y).seal();
}

function ifExplicit<T>(condition: Bool, type: ProvableType<T>, x: T, y: T): T {
  type = ProvableType.get(type);
  let xs = type.toFields(x);
  let ys = type.toFields(y);
  let b = condition.toField();

  // simple case: b is constant - it's like a normal if statement
  if (b.isConstant()) {
    return clone(type, condition.toBoolean() ? x : y);
  }

  // if b is variable, we compute if as follows:
  // if(b, x, y)[i] = b*(x[i] - y[i]) + y[i]
  let fields = xs.map((xi, i) => ifField(b, xi, ys[i]));
  let aux = auxiliary(type, () => (condition.toBoolean() ? x : y));
  return type.fromFields(fields, aux);
}

function ifImplicit<T extends ToFieldable>(condition: Bool, x: T, y: T): T {
  let type = x.constructor;
  if (type === undefined)
    throw Error(
      `You called Provable.if(bool, x, y) with an argument x that has no constructor, which is not supported.\n` +
        `If x, y are Structs or other custom types, you can use the following:\n` +
        `Provable.if(bool, MyType, x, y)`
    );
  if (type !== y.constructor) {
    throw Error(
      'Provable.if: Mismatched argument types. Try using an explicit type argument:\n' +
        `Provable.if(bool, MyType, x, y)`
    );
  }
  if (!('fromFields' in type && 'toFields' in type)) {
    throw Error(
      'Provable.if: Invalid argument type. Try using an explicit type argument:\n' +
        `Provable.if(bool, MyType, x, y)`
    );
  }
  return ifExplicit(condition, type as any as Provable<T>, x, y);
}

function switch_<T, A extends FlexibleProvableType<T>>(
  mask: Bool[],
  type: A,
  values: T[],
  { allowNonExclusive = false } = {}
): T {
  let type_ = ProvableType.get(type as ProvableType<T>);
  // picks the value at the index where mask is true
  let nValues = values.length;
  if (mask.length !== nValues)
    throw Error(
      `Provable.switch: \`values\` and \`mask\` have different lengths (${values.length} vs. ${mask.length}), which is not allowed.`
    );
  let checkMask = () => {
    if (allowNonExclusive) return;
    let nTrue = mask.filter((b) => b.toBoolean()).length;
    if (nTrue > 1) {
      throw Error(`Provable.switch: \`mask\` must have 0 or 1 true element, found ${nTrue}.`);
    }
  };
  if (mask.every((b) => b.toField().isConstant())) checkMask();
  else Provable.asProver(checkMask);
  let size = type_.sizeInFields();
  let fields = Array(size).fill(new Field(0));
  for (let i = 0; i < nValues; i++) {
    let valueFields = type_.toFields(values[i]);
    let maskField = mask[i].toField();
    for (let j = 0; j < size; j++) {
      let maybeField = valueFields[j].mul(maskField);
      fields[j] = fields[j].add(maybeField);
    }
  }
  let aux = auxiliary(type_, () => {
    let i = mask.findIndex((b) => b.toBoolean());
    if (i === -1) return undefined;
    return values[i];
  });
  return type_.fromFields(fields, aux);
}

function assertEqualIf<
  A extends ProvableType<any>,
  T extends InferProvableType<A> = InferProvableType<A>
>(enabled: Bool, type: A, x: T, y: T) {
  // if the condition is disabled, we check the trivial identity x === x instead
  let xOrY = ifExplicit<T>(enabled, type, y, x);
  assertEqual(type, x, xOrY);
}

function isConstant<T>(type: ProvableType<T>, x: T): boolean {
  return ProvableType.get(type)
    .toFields(x)
    .every((x) => x.isConstant());
}

// logging in provable code

function log(...args: any) {
  asProver(() => {
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
}

// helpers

function checkLength(name: string, xs: Field[], ys: Field[]) {
  let n = xs.length;
  let m = ys.length;
  if (n !== m) {
    throw Error(
      `${name}: inputs must contain the same number of field elements, got ${n} !== ${m}`
    );
  }
  return n;
}

function clone<T, S extends FlexibleProvable<T>>(type: S, value: T): T {
  let fields = type.toFields(value);
  let aux = type.toAuxiliary?.(value) ?? [];
  return (type as Provable<T>).fromFields(fields, aux);
}

function auxiliary<T>(type: Provable<T>, compute: () => T | undefined) {
  let aux;
  // TODO: this accepts types without .toAuxiliary(), should be changed when all snarky types are moved to TS
  Provable.asProver(() => {
    let value = compute();
    if (value !== undefined) {
      aux = type.toAuxiliary?.(value);
    }
  });
  return aux ?? type.toAuxiliary?.() ?? [];
}

type MemoizationContext = {
  memoized: { fields: Field[]; aux: any[] }[];
  currentIndex: number;
  blindingValue: Field;
};
let memoizationContext = Context.create<MemoizationContext>();

/**
 * Like Provable.witness, but memoizes the witness during transaction construction
 * for reuse by the prover. This is needed to witness non-deterministic values.
 */
function memoizeWitness<T>(type: FlexibleProvable<T>, compute: () => T) {
  return Provable.witness(type as Provable<T>, () => {
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
    return (type as Provable<T>).fromFields(currentValue.fields, currentValue.aux);
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

// TODO this should return a class, like Struct, so you can just use `class Array3 extends Provable.Array(Field, 3) {}`
function provableArray<A extends FlexibleProvableType<any>>(
  elementType: A,
  length: number
): InferredProvable<ToProvable<A>[]> {
  type T = InferProvableType<A>;
  type TValue = InferValue<ToProvable<A>>;
  type TJson = InferJson<ToProvable<A>>;
  let type = ProvableType.get(elementType as ProvableType<T>) as ProvableExtended<T, TValue, TJson>;
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
        array[i] = type.fromFields(fields.slice(offset, offset + size), aux?.[i]);
      }
      return array;
    },
    check(array: T[]) {
      for (let i = 0; i < length; i++) {
        (type as any).check(array[i]);
      }
    },
    toCanonical(x) {
      return x.map((v) => Provable.toCanonical(type, v));
    },

    toValue(x) {
      return x.map((v) => type.toValue(v));
    },

    fromValue(x) {
      return x.map((v) => type.fromValue(v));
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
        throw Error('circuitArray.fromJSON: element type has no fromJSON method');
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

    empty() {
      if (!('empty' in type)) {
        throw Error('circuitArray.empty: element type has no empty() method');
      }
      return Array.from({ length }, () => type.empty());
    },
  } satisfies ProvableExtended<T[], TValue[], TJson[]> as any;
}
